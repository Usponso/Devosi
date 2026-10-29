-- =============================================================================
-- Éditions vainqueur : de vraies cartes, à part de la carte du pilote.
--  - Chaque course notée crée sa carte d'édition (id e-<saison>-<manche>, même rareté
--    que la carte du vainqueur) ; elle compte dans la collection comme une carte unique.
--  - Elle ne sort jamais d'un tirage classique, de l'Atelier ni de la Vitesse supérieure :
--    seulement par l'édition des packs (7 jours) et les pronostics.
--  - Les éditions déjà obtenues sont converties : l'exemplaire en plus de la carte du
--    pilote devient la carte d'édition (finition, vitrine et avatar suivent).
-- =============================================================================

alter table public.cards add column edition_of text references public.cards (id) on delete cascade;
create index cards_edition_of_idx on public.cards (edition_of) where edition_of is not null;

/** Identifiant de la carte d'édition d'une course */
create or replace function public._edition_id(p_season int, p_round int)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'e-' || p_season || '-' || p_round
$$;

/** Crée la carte d'édition d'une course notée (si sa carte de vainqueur existe) */
create or replace function public._ensure_edition_card(p_season int, p_round int)
returns text
language sql
security definer
set search_path = ''
as $$
  insert into public.cards (id, type, rarity, team, year, edition_of)
  select public._edition_id(r.season, r.round), base.type, base.rarity, null, r.season, base.id
    from public.races r
    join public.cards base on base.id = 'd-' || r.p1
   where r.season = p_season and r.round = p_round and r.p1 is not null
  on conflict (id) do nothing
  returning id
$$;

-- Cartes d'édition déjà obtenues ou encore en jeu (les plus anciennes ne sont plus distribuées)
select public._ensure_edition_card(r.season, r.round)
  from public.races r
 where r.scored_at is not null
   and (r.race_at > now() - interval '7 days'
        or exists (select 1 from public.user_editions ue where ue.season = r.season and ue.round = r.round));

/** Édition vainqueur en cours : sa carte d'édition, pendant les 7 jours qui suivent la course */
create or replace function public._current_edition()
returns table (season smallint, round smallint, name text, card_id text, until timestamptz)
language sql
stable
set search_path = ''
as $$
  select r.season, r.round, r.name, c.id, r.race_at + make_interval(days => public._gp_setting('edition_days'))
    from public.races r
    join public.cards c on c.id = public._edition_id(r.season, r.round)
   where r.scored_at is not null
     and r.race_at > now() - make_interval(days => public._gp_setting('edition_days'))
   order by r.race_at desc
   limit 1
$$;

-- -----------------------------------------------------------------------------
-- Conversion des éditions déjà obtenues
-- -----------------------------------------------------------------------------
do $$
declare
  ue record;
  v_edition text;
  base public.user_cards;
begin
  for ue in select * from public.user_editions where card_id not like 'e-%' loop
    v_edition := public._edition_id(ue.season, ue.round);
    if not exists (select 1 from public.cards where id = v_edition) then
      continue;
    end if;
    select * into base from public.user_cards where user_id = ue.user_id and card_id = ue.card_id for update;

    if base.card_id is not null and base.count > 1 then
      -- Un exemplaire en plus : il devient l'édition
      update public.user_cards set count = count - 1 where user_id = ue.user_id and card_id = ue.card_id;
      insert into public.user_cards (user_id, card_id, count, first_obtained_at)
      values (ue.user_id, v_edition, 1, ue.obtained_at)
      on conflict (user_id, card_id) do nothing;
    elsif base.card_id is not null then
      -- Seul exemplaire : il devient l'édition (avec sa finition), vitrine et avatar suivent
      delete from public.user_cards where user_id = ue.user_id and card_id = ue.card_id;
      insert into public.user_cards (user_id, card_id, count, first_obtained_at, finish)
      values (ue.user_id, v_edition, 1, base.first_obtained_at, base.finish)
      on conflict (user_id, card_id) do nothing;
      update public.profiles
         set showcase = array_replace(showcase, ue.card_id, v_edition),
             avatar_card = case when avatar_card = ue.card_id then v_edition else avatar_card end
       where user_id = ue.user_id;
    else
      insert into public.user_cards (user_id, card_id, count, first_obtained_at)
      values (ue.user_id, v_edition, 1, ue.obtained_at)
      on conflict (user_id, card_id) do nothing;
    end if;

    update public.user_editions set card_id = v_edition
     where user_id = ue.user_id and season = ue.season and round = ue.round;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tirages : jamais d'édition hors de son emplacement réservé
-- -----------------------------------------------------------------------------


create or replace function public.open_pack(p_gp boolean default false)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles;
  w public.races;
  n int := public._game_setting('cards_per_pack');
  source text;
  rarities public.card_rarity[] := '{}';
  r public.card_rarity;
  v_card text;
  v_card_ids text[] := '{}';
  result json[] := '{}';
  is_new boolean;
  lucky boolean;
  e record;
  edition_slot int := null;
begin
  p := public._load_profile(uid);

  if p_gp then
    w := public._current_weekend();
    if w.season is null then
      raise exception 'Pas de week-end de course en cours' using errcode = 'P0001', hint = 'NO_WEEKEND';
    end if;
    source := case
      when p.gp_free_day is distinct from current_date then 'gp_free'
      when p.gp_packs > 0 and p.gp_key = w.season * 100 + w.round then 'gp'
    end;
  else
    source := case
      when p.special_packs > 0 then 'special'
      when p.packs_banked > 0 then 'regular'
      when p.bonus_packs > 0 then 'bonus'
    end;
  end if;
  if source is null then
    raise exception 'Aucun pack disponible' using errcode = 'P0001', hint = 'NO_PACK';
  end if;

  for i in 1..n loop
    rarities := rarities || public._roll_rarity();
  end loop;

  -- Pack spécial : au moins une Épique
  if source = 'special' and not exists (select 1 from unnest(rarities) x where x >= 'epic') then
    rarities[n] := 'epic';
  end if;

  -- Garantie : Légendaire au 100e pack consécutif sans Légendaire ni Mythique
  lucky := exists (select 1 from unnest(rarities) x where x in ('legendary', 'mythic'));
  if not lucky and p.pity + 1 >= public._game_setting('pity_limit') then
    rarities[n] := 'legendary';
    lucky := true;
  end if;

  -- Édition vainqueur : remplace la carte la moins rare du pack (jamais une Légendaire+)
  select * into e from public._current_edition();
  if e.card_id is not null
     and not exists (select 1 from public.user_editions ue
                      where ue.user_id = uid and ue.season = e.season and ue.round = e.round)
     and floor(random() * 1000) < public._gp_setting(case when p_gp then 'edition_odds_gp' else 'edition_odds' end) then
    select i into edition_slot from generate_subscripts(rarities, 1) i order by rarities[i], i limit 1;
  end if;

  for i in 1..n loop
    r := rarities[i];
    v_card := null;
    if i = edition_slot then
      v_card := e.card_id;
      select c.rarity into r from public.cards c where c.id = v_card;
      insert into public.user_editions (user_id, season, round, card_id, name) values (uid, e.season, e.round, v_card, e.name);
    elsif p_gp and i <= public._gp_setting('circuit_cards') then
      -- Carte liée au circuit, de la rareté tirée (sinon la plus proche en dessous)
      select c.id, c.rarity into v_card, r
        from public.card_circuits cc
        join public.cards c on c.id = cc.card_id
       where cc.circuit_id = w.circuit_id and c.rarity <= rarities[i]
       order by c.rarity desc, random()
       limit 1;
      r := coalesce(r, rarities[i]);
    end if;
    if v_card is null then
      select c.id into v_card from public.cards c where c.rarity = r and c.edition_of is null order by random() limit 1;
    end if;
    if v_card is null then
      raise exception 'Catalogue vide pour la rareté %', r;
    end if;

    insert into public.user_cards as uc (user_id, card_id)
    values (uid, v_card)
    on conflict (user_id, card_id) do update set count = uc.count + 1
    returning (uc.count = 1) into is_new;

    v_card_ids := v_card_ids || v_card;
    result := result || json_build_object(
      'id', v_card, 'rarity', r, 'is_new', is_new,
      'edition', case when i = edition_slot then json_build_object('season', e.season, 'round', e.round, 'name', e.name) end,
      'circuit', p_gp and i <= public._gp_setting('circuit_cards') and i is distinct from edition_slot
    );
    perform public._quest_progress(uid, 'card', 1, v_card, is_new);
  end loop;
  perform public._quest_progress(uid, 'open', 1);

  update public.profiles
     set packs_banked = packs_banked - (source = 'regular')::int,
         bonus_packs = bonus_packs - (source = 'bonus')::int,
         special_packs = special_packs - (source = 'special')::int,
         gp_packs = gp_packs - (source = 'gp')::int,
         gp_free_day = case when source = 'gp_free' then current_date else gp_free_day end,
         packs_opened = packs_opened + 1,
         pity = case when lucky then 0 else pity + 1 end
   where user_id = uid
  returning * into p;

  insert into public.pack_openings (user_id, card_ids) values (uid, v_card_ids);

  return json_build_object(
    'cards', array_to_json(result),
    'source', source,
    'circuit', case when p_gp then w.circuit_id end,
    'status', public._status_json(p)
  );
end;
$$;

create or replace function public._trade_up_base(p_rarity public.card_rarity)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles;
  need int := public._game_setting('trade_up_cost');
  take int;
  next_rarity public.card_rarity;
  rec record;
  consumed json[] := '{}';
  v_card text;
  is_new boolean;
begin
  next_rarity := case p_rarity
    when 'common' then 'rare'
    when 'rare' then 'epic'
    when 'epic' then 'legendary'
    when 'legendary' then 'mythic'
  end::public.card_rarity;
  if next_rarity is null then
    raise exception 'Rareté maximale' using errcode = 'P0001', hint = 'INVALID_RARITY';
  end if;

  p := public._load_profile(uid);
  if (select coalesce(sum(uc.count - 1), 0)
        from public.user_cards uc join public.cards c on c.id = uc.card_id
       where uc.user_id = uid and c.rarity = p_rarity and uc.count > 1) < need then
    raise exception 'Pas assez de doublons' using errcode = 'P0001', hint = 'NOT_ENOUGH_DUPLICATES';
  end if;

  -- Les cartes en plus grand nombre partent en premier
  for rec in
    select uc.card_id, uc.count
      from public.user_cards uc join public.cards c on c.id = uc.card_id
     where uc.user_id = uid and c.rarity = p_rarity and uc.count > 1
     order by uc.count desc, uc.card_id
       for update of uc
  loop
    take := least(need, rec.count - 1);
    update public.user_cards set count = count - take where user_id = uid and card_id = rec.card_id;
    consumed := consumed || json_build_object('id', rec.card_id, 'count', rec.count - take);
    need := need - take;
    exit when need = 0;
  end loop;

  select c.id into v_card from public.cards c where c.rarity = next_rarity and c.edition_of is null order by random() limit 1;
  insert into public.user_cards as uc (user_id, card_id)
  values (uid, v_card)
  on conflict (user_id, card_id) do update set count = uc.count + 1
  returning (uc.count = 1) into is_new;

  return json_build_object(
    'card', json_build_object('id', v_card, 'rarity', next_rarity, 'is_new', is_new),
    'cards', array_to_json(consumed),
    'status', public._status_json(p)
  );
end;
$$;

create or replace function public.open_welcome_pack(p_team text default null)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles := public._load_profile(uid);
  n int := public._game_setting('cards_per_pack');
  rarities public.card_rarity[] := '{}';
  r public.card_rarity;
  v_card text;
  v_card_ids text[] := '{}';
  result json[] := '{}';
  is_new boolean;
begin
  if p.welcome_opened then
    raise exception 'Pack de bienvenue déjà ouvert' using errcode = 'P0001', hint = 'WELCOME_OPENED';
  end if;

  for i in 1..n loop
    rarities := rarities || public._roll_rarity();
  end loop;
  -- Une Épique ou mieux garantie, en dernière position
  if not exists (select 1 from unnest(rarities) x where x >= 'epic') then
    rarities[n] := 'epic';
  end if;

  for i in 1..n loop
    r := rarities[i];
    v_card := null;
    -- 1re carte : une carte de l'écurie favorite (rareté tirée, sinon la plus proche)
    if i = 1 and p_team is not null then
      -- Un pilote ou l'écurie elle-même plutôt qu'un GP qu'elle a gagné
      select c.id, c.rarity into v_card, r from public.cards c
       where c.team = p_team and c.rarity <= rarities[i]
       order by c.type in ('driver', 'team') desc, c.rarity desc, random()
       limit 1;
      if v_card is null then
        select c.id, c.rarity into v_card, r from public.cards c
         where c.team = p_team order by c.type in ('driver', 'team') desc, c.rarity, random() limit 1;
      end if;
      r := coalesce(r, rarities[i]);
    end if;
    if v_card is null then
      select c.id into v_card from public.cards c where c.rarity = r and c.edition_of is null order by random() limit 1;
    end if;

    insert into public.user_cards as uc (user_id, card_id)
    values (uid, v_card)
    on conflict (user_id, card_id) do update set count = uc.count + 1
    returning (uc.count = 1) into is_new;

    v_card_ids := v_card_ids || v_card;
    result := result || json_build_object('id', v_card, 'rarity', r, 'is_new', is_new, 'team', i = 1 and p_team is not null);
    perform public._quest_progress(uid, 'card', 1, v_card, is_new);
  end loop;
  perform public._quest_progress(uid, 'open', 1);

  update public.profiles
     set welcome_opened = true,
         packs_opened = packs_opened + 1
   where user_id = uid
  returning * into p;
  insert into public.pack_openings (user_id, card_ids) values (uid, v_card_ids);

  return json_build_object('cards', array_to_json(result), 'source', 'welcome', 'status', public._status_json(p));
end;
$$;

create or replace function public.claim_prediction(p_season int, p_round int)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles := public._load_profile(uid);
  pr public.predictions;
  r public.races;
  v_coins int;
  v_packs int;
  v_edition text := null;
  is_new boolean;
begin
  select * into pr from public.predictions
   where user_id = uid and season = p_season and round = p_round for update;
  if pr.points is null then
    raise exception 'Pas encore de résultat' using errcode = 'P0001', hint = 'PREDICTION_PENDING';
  end if;
  if pr.claimed_at is not null then
    raise exception 'Gains déjà récupérés' using errcode = 'P0001', hint = 'PREDICTION_CLAIMED';
  end if;
  select * into r from public.races where season = p_season and round = p_round;

  v_coins := pr.points * public._gp_setting('coins_per_point');
  v_packs := (pr.p1 = r.p1 and pr.p2 = r.p2 and pr.p3 = r.p3)::int;

  update public.predictions set claimed_at = now()
   where user_id = uid and season = p_season and round = p_round;
  update public.profiles
     set coins = coins + v_coins, bonus_packs = bonus_packs + v_packs
   where user_id = uid
  returning * into p;

  -- Bon vainqueur : édition vainqueur garantie (si on ne l'a pas déjà)
  if pr.p1 = r.p1 and exists (select 1 from public.cards where id = public._edition_id(r.season, r.round)) then
    insert into public.user_editions (user_id, season, round, card_id, name)
    values (uid, r.season, r.round, public._edition_id(r.season, r.round), r.name)
    on conflict do nothing;
    if found then
      v_edition := public._edition_id(r.season, r.round);
      insert into public.user_cards as uc (user_id, card_id)
      values (uid, v_edition)
      on conflict (user_id, card_id) do update set count = uc.count + 1
      returning (uc.count = 1) into is_new;
      perform public._quest_progress(uid, 'card', 1, v_edition, is_new);
    end if;
  end if;

  return json_build_object(
    'coins', v_coins,
    'packs', v_packs,
    'edition', case when v_edition is not null then json_build_object(
      'id', v_edition, 'is_new', is_new, 'season', r.season, 'round', r.round, 'name', r.name
    ) end,
    'predictions', public.my_predictions()
  );
end;
$$;

create or replace function public.sync_races(p_races jsonb)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.races;
  v_scored int := 0;
  v_season smallint;
begin
  insert into public.races (season, round, name, circuit_id, weekend_start, quali_at, race_at, pole, p1, p2, p3)
  select x.season, x.round, x.name, x.circuit_id, x.weekend_start, x.quali_at, x.race_at, x.pole, x.p1, x.p2, x.p3
    from jsonb_to_recordset(p_races) as x (
      season smallint, round smallint, name text, circuit_id text,
      weekend_start timestamptz, quali_at timestamptz, race_at timestamptz,
      pole text, p1 text, p2 text, p3 text
    )
  on conflict (season, round) do update
     set name = excluded.name,
         circuit_id = excluded.circuit_id,
         weekend_start = excluded.weekend_start,
         quali_at = excluded.quali_at,
         race_at = excluded.race_at,
         -- Une course notée garde ses résultats (les points sont déjà attribués)
         pole = case when public.races.scored_at is null then coalesce(excluded.pole, public.races.pole) else public.races.pole end,
         p1 = case when public.races.scored_at is null then excluded.p1 else public.races.p1 end,
         p2 = case when public.races.scored_at is null then excluded.p2 else public.races.p2 end,
         p3 = case when public.races.scored_at is null then excluded.p3 else public.races.p3 end;

  -- Courses supprimées du calendrier (annulées), sans pronostic noté
  delete from public.races ra
   where ra.scored_at is null
     and ra.season in (select (x ->> 'season')::smallint from jsonb_array_elements(p_races) x)
     and not exists (select 1 from jsonb_array_elements(p_races) x
                      where (x ->> 'season')::smallint = ra.season and (x ->> 'round')::smallint = ra.round);

  -- Notation des courses dont le podium est connu
  for r in select * from public.races where scored_at is null and p1 is not null and p2 is not null and p3 is not null
           order by race_at
  loop
    update public.predictions pr set points = public._prediction_points(pr, r)
     where pr.season = r.season and pr.round = r.round;
    update public.races set scored_at = now() where season = r.season and round = r.round;
    perform public._ensure_edition_card(r.season, r.round);
    v_scored := v_scored + 1;

    -- Dernière course de la saison : récompenses du top 3
    v_season := r.season;
    if not exists (select 1 from public.races where season = v_season and scored_at is null)
       and not exists (select 1 from public.prediction_season_rewards where season = v_season) then
      insert into public.prediction_season_rewards (season, user_id, rank, packs)
      select v_season, k.user_id, k.rank, case k.rank when 1 then 10 when 2 then 6 else 3 end
        from public._prediction_ranking(v_season) k
       where k.rank <= 3;
      update public.profiles p
         set bonus_packs = p.bonus_packs + sr.packs
        from public.prediction_season_rewards sr
       where sr.season = v_season and sr.user_id = p.user_id;
    end if;
  end loop;

  return json_build_object('races', jsonb_array_length(p_races), 'scored', v_scored);
end;
$$;

/** Atelier : les cartes d'édition ne se fabriquent pas */
create or replace function public.craft_card(p_card text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  res json;
begin
  if exists (select 1 from public.cards where id = p_card and edition_of is not null) then
    raise exception 'Carte d''édition : impossible à fabriquer' using errcode = 'P0001', hint = 'EDITION_NOT_CRAFTABLE';
  end if;
  res := public._craft_card_base(p_card);
  perform public._quest_progress(auth.uid(), 'craft', 1);
  perform public._quest_progress(auth.uid(), 'card', 1, p_card, true);
  return public._with_status(res, auth.uid());
end;
$$;

-- -----------------------------------------------------------------------------
-- Catalogue des éditions (lu par l'app, qui les ajoute à ses cartes)
-- -----------------------------------------------------------------------------
create or replace function public.edition_cards()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(json_build_object(
           'id', c.id, 'base', c.edition_of, 'season', r.season, 'round', r.round, 'name', r.name
         ) order by r.season, r.round), '[]')
    from public.cards c
    join public.races r on public._edition_id(r.season, r.round) = c.id
   where c.edition_of is not null
$$;

revoke execute on function public._edition_id(int, int), public._ensure_edition_card(int, int)
  from public, anon, authenticated;
revoke execute on function public.edition_cards() from public;
grant execute on function public.edition_cards() to anon, authenticated;
