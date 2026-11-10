-- =============================================================================
-- Séries « Vitraux » et « Le jeu des pilotes » (cartes et albums dans supabase/seed.sql,
-- générés par scripts/catalog/series.mjs).
--  - Le jeu des pilotes entre dans le tirage normal des packs selon sa rareté.
--  - Les vitraux sont numérotés : chaque exemplaire porte un numéro unique (1 à
--    cards.print_run), attribué dans l'ordre des tirages. Ils sortent de n'importe quel
--    pack (1 chance sur 60, à la place de la carte la moins rare) tant qu'il en reste ;
--    jamais d'un tirage classique, de l'Atelier, de la Vitesse supérieure ni de la carte
--    mystère. Ils ne se recyclent pas, n'ont pas de finition, et s'échangent avec leur
--    numéro (le plus élevé du donneur part).
-- =============================================================================

alter table public.cards add column print_run smallint check (print_run > 0);

create table public.card_serials (
  card_id text not null references public.cards (id) on delete cascade,
  serial smallint not null check (serial > 0),
  user_id uuid not null references auth.users (id) on delete cascade,
  obtained_at timestamptz not null default now(),
  primary key (card_id, serial)
);
create index card_serials_user_idx on public.card_serials (user_id, card_id);

alter table public.card_serials enable row level security;
revoke all on public.card_serials from anon, authenticated;
grant select on public.card_serials to authenticated;
create policy "ses numéros" on public.card_serials for select to authenticated using (user_id = (select auth.uid()));

/**
 * Prochain exemplaire numéroté à distribuer : une carte tirée au hasard parmi les
 * exemplaires restants (la rosace, tirée à 5, sort donc 5 fois moins qu'un vitrail à 25)
 * et son prochain numéro. Verrou de transaction : deux tirages simultanés ne peuvent
 * pas recevoir le même numéro. Rien si toute la série est distribuée.
 */
create or replace function public._next_serial()
returns table (card_id text, serial smallint)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('card_serials'));
  return query
    select c.id, (coalesce(max(s.serial), 0) + 1)::smallint
      from public.cards c
      left join public.card_serials s on s.card_id = c.id
     where c.print_run is not null
     group by c.id, c.print_run
    having count(s.serial) < c.print_run
     order by -ln(1 - random()) / (c.print_run - count(s.serial))
     limit 1;
end;
$$;

/** Exemplaires distribués par carte numérotée, lisible sans compte : [{ id, given, total }] */
create or replace function public.serial_counts()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(json_build_object(
           'id', c.id,
           'given', (select count(*) from public.card_serials s where s.card_id = c.id),
           'total', c.print_run
         ) order by c.id), '[]')
    from public.cards c
   where c.print_run is not null
$$;

create or replace function public._gp_setting(key text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case key
    when 'pack_price' then 200
    when 'weekend_buys' then 3
    when 'circuit_cards' then 2
    -- Chances de l'édition vainqueur par pack, en pour mille
    when 'edition_odds' then 5
    when 'edition_odds_gp' then 15
    when 'edition_days' then 7
    when 'coins_per_point' then 5
    -- Chances de l'affiche du week-end par pack GP, en pour mille
    when 'poster_odds_gp' then 250
    -- Chances d'un vitrail numéroté par pack (tous les packs), en pour mille : 1 pack sur 60
    when 'glass_odds' then 17
  end
$$;

-- -----------------------------------------------------------------------------
-- Tirages : le vitrail a son emplacement, les cartes numérotées jamais ailleurs
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
  poster_slot int := null;
  v_poster text;
  glass_slot int := null;
  g record;
  v_serial smallint;
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

  -- Affiche du week-end (pack GP seulement) : remplace la carte la moins rare restante
  if p_gp then
    select c.id into v_poster from public.cards c where c.id = public._poster_id(w.season, w.round);
    if v_poster is not null and floor(random() * 1000) < public._gp_setting('poster_odds_gp') then
      select i into poster_slot from generate_subscripts(rarities, 1) i
       where i is distinct from edition_slot
       order by rarities[i], i limit 1;
    end if;
  end if;

  -- Vitrail numéroté (tous les packs) : remplace la carte la moins rare restante, tant qu'il
  -- reste des exemplaires à distribuer
  if floor(random() * 1000) < public._gp_setting('glass_odds') then
    select * into g from public._next_serial();
    if g.card_id is not null then
      select i into glass_slot from generate_subscripts(rarities, 1) i
       where i is distinct from edition_slot and i is distinct from poster_slot
       order by rarities[i], i limit 1;
      lucky := true;
    end if;
  end if;

  for i in 1..n loop
    r := rarities[i];
    v_card := null;
    v_serial := null;
    if i = glass_slot then
      v_card := g.card_id;
      v_serial := g.serial;
      select c.rarity into r from public.cards c where c.id = v_card;
      insert into public.card_serials (card_id, serial, user_id) values (v_card, v_serial, uid);
    elsif i = edition_slot then
      v_card := e.card_id;
      select c.rarity into r from public.cards c where c.id = v_card;
      insert into public.user_editions (user_id, season, round, card_id, name) values (uid, e.season, e.round, v_card, e.name);
    elsif i = poster_slot then
      v_card := v_poster;
      select c.rarity into r from public.cards c where c.id = v_card;
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
      select c.id into v_card from public.cards c
       where c.rarity = r and c.edition_of is null and c.type <> 'poster' and c.print_run is null
       order by random() limit 1;
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
      'poster', i = poster_slot,
      'serial', v_serial,
      'circuit', p_gp and i <= public._gp_setting('circuit_cards') and i is distinct from edition_slot and i is distinct from poster_slot
                 and i is distinct from glass_slot
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
       where uc.user_id = uid and c.rarity = p_rarity and uc.count > 1 and c.print_run is null) < need then
    raise exception 'Pas assez de doublons' using errcode = 'P0001', hint = 'NOT_ENOUGH_DUPLICATES';
  end if;

  -- Les cartes en plus grand nombre partent en premier
  for rec in
    select uc.card_id, uc.count
      from public.user_cards uc join public.cards c on c.id = uc.card_id
     where uc.user_id = uid and c.rarity = p_rarity and uc.count > 1 and c.print_run is null
     order by uc.count desc, uc.card_id
       for update of uc
  loop
    take := least(need, rec.count - 1);
    update public.user_cards set count = count - take where user_id = uid and card_id = rec.card_id;
    consumed := consumed || json_build_object('id', rec.card_id, 'count', rec.count - take);
    need := need - take;
    exit when need = 0;
  end loop;

  select c.id into v_card from public.cards c
   where c.rarity = next_rarity and c.edition_of is null and c.type <> 'poster' and c.print_run is null
   order by random() limit 1;
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
      select c.id into v_card from public.cards c
       where c.rarity = r and c.edition_of is null and c.type <> 'poster' and c.print_run is null
       order by random() limit 1;
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

create or replace function public.open_mystery_card(p_slot int)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles := public._load_profile(uid);
  r public.card_rarity;
  v_card text;
  drawn json[] := '{}';
  v_pick text;
  v_rarity public.card_rarity;
  is_new boolean;
begin
  if p_slot not between 0 and 2 then
    raise exception 'Emplacement invalide' using errcode = 'P0001', hint = 'INVALID_SLOT';
  end if;
  if p.mystery_day = current_date then
    raise exception 'Carte mystère déjà retournée' using errcode = 'P0001', hint = 'ALREADY_CLAIMED';
  end if;

  for i in 0..2 loop
    r := public._mystery_rarity();
    select c.id into v_card from public.cards c
     where c.rarity = r and c.edition_of is null and c.type <> 'poster' and c.print_run is null
     order by random() limit 1;
    drawn := drawn || json_build_object('id', v_card, 'rarity', r);
    if i = p_slot then
      v_pick := v_card;
      v_rarity := r;
    end if;
  end loop;

  insert into public.user_cards as uc (user_id, card_id)
  values (uid, v_pick)
  on conflict (user_id, card_id) do update set count = uc.count + 1
  returning (uc.count = 1) into is_new;
  perform public._quest_progress(uid, 'card', 1, v_pick, is_new);

  update public.profiles set mystery_day = current_date where user_id = uid returning * into p;

  return json_build_object(
    'cards', array_to_json(drawn),
    'slot', p_slot,
    'card', json_build_object('id', v_pick, 'rarity', v_rarity, 'is_new', is_new),
    'status', public._status_json(p)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Échange de doublons groupé : les cartes numérotées sont gardées
-- -----------------------------------------------------------------------------
create or replace function public._recycle_duplicates_base(p_keep int default 1, p_rarities public.card_rarity[] default null)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles;
  keep int := greatest(1, coalesce(p_keep, 1));
  gained int;
  changed json;
begin
  -- Le profil verrouillé sérialise toutes les opérations du joueur
  p := public._load_profile(uid);

  select coalesce(sum((uc.count - keep) * public._card_value(c.rarity, 'recycle')), 0),
         coalesce(json_agg(json_build_object('id', uc.card_id, 'count', keep)), '[]')
    into gained, changed
    from public.user_cards uc
    join public.cards c on c.id = uc.card_id
   where uc.user_id = uid and uc.count > keep
     and (p_rarities is null or c.rarity = any (p_rarities)) and c.print_run is null;

  update public.user_cards uc
     set count = keep
    from public.cards c
   where c.id = uc.card_id and uc.user_id = uid and uc.count > keep
     and (p_rarities is null or c.rarity = any (p_rarities)) and c.print_run is null;

  update public.profiles set coins = coins + gained where user_id = uid returning * into p;
  return json_build_object('gained', gained, 'cards', changed, 'status', public._status_json(p));
end;
$$;

create or replace function public.recycle_duplicates(p_keep int default 1, p_rarities public.card_rarity[] default null)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  keep int := greatest(1, coalesce(p_keep, 1));
  recycled int;
  res json;
begin
  perform public._load_profile(uid);
  select coalesce(sum(uc.count - keep), 0) into recycled
    from public.user_cards uc
    join public.cards c on c.id = uc.card_id
   where uc.user_id = uid and uc.count > keep
     and (p_rarities is null or c.rarity = any (p_rarities)) and c.print_run is null;
  res := public._recycle_duplicates_base(p_keep, p_rarities);
  perform public._quest_progress(uid, 'recycle', recycled);
  return public._with_status(res, uid);
end;
$$;

-- -----------------------------------------------------------------------------
-- Échanges entre joueurs : le numéro suit la carte
-- -----------------------------------------------------------------------------
create or replace function public._move_card(p_from uuid, p_to uuid, p_card text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned int;
  is_new boolean;
begin
  select count into owned from public.user_cards where user_id = p_from and card_id = p_card for update;
  if owned is null then
    raise exception 'Carte plus possédée' using errcode = 'P0001', hint = 'TRADE_INVALID';
  end if;
  if owned > 1 then
    update public.user_cards set count = count - 1 where user_id = p_from and card_id = p_card;
  else
    -- Dernier exemplaire : la carte (et sa finition) quitte la collection, la vitrine et l'avatar
    delete from public.user_cards where user_id = p_from and card_id = p_card;
    update public.profiles
       set showcase = array_remove(showcase, p_card),
           avatar_card = case when avatar_card = p_card then null else avatar_card end
     where user_id = p_from;
  end if;

  -- Carte numérotée : le donneur garde ses plus petits numéros
  update public.card_serials s set user_id = p_to, obtained_at = now()
   where (s.card_id, s.serial) = (
     select x.card_id, x.serial from public.card_serials x
      where x.user_id = p_from and x.card_id = p_card
      order by x.serial desc limit 1
   );

  insert into public.user_cards as uc (user_id, card_id)
  values (p_to, p_card)
  on conflict (user_id, card_id) do update set count = uc.count + 1
  returning (uc.count = 1) into is_new;
  perform public._quest_progress(p_to, 'card', 1, p_card, is_new);
end;
$$;

-- -----------------------------------------------------------------------------
-- Atelier, recyclage et finitions : jamais pour une carte numérotée
-- -----------------------------------------------------------------------------
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
  if exists (select 1 from public.cards where id = p_card and type = 'poster') then
    raise exception 'Affiche : uniquement dans le pack GP de son week-end' using errcode = 'P0001', hint = 'POSTER_NOT_CRAFTABLE';
  end if;
  if exists (select 1 from public.cards where id = p_card and print_run is not null) then
    raise exception 'Carte numérotée : uniquement dans les packs' using errcode = 'P0001', hint = 'NUMBERED_LOCKED';
  end if;
  res := public._craft_card_base(p_card);
  perform public._quest_progress(auth.uid(), 'craft', 1);
  perform public._quest_progress(auth.uid(), 'card', 1, p_card, true);
  return public._with_status(res, auth.uid());
end;
$$;

create or replace function public.recycle_card(p_card text, p_qty int default 1)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  res json;
begin
  if exists (select 1 from public.cards where id = p_card and print_run is not null) then
    raise exception 'Carte numérotée : elle ne se recycle pas' using errcode = 'P0001', hint = 'NUMBERED_LOCKED';
  end if;
  res := public._recycle_card_base(p_card, p_qty);
  perform public._quest_progress(auth.uid(), 'recycle', p_qty);
  return public._with_status(res, auth.uid());
end;
$$;

create or replace function public.upgrade_card(p_card text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  res json;
begin
  if exists (select 1 from public.cards where id = p_card and print_run is not null) then
    raise exception 'Carte numérotée : pas de finition' using errcode = 'P0001', hint = 'NUMBERED_LOCKED';
  end if;
  res := public._upgrade_card_base(p_card);
  perform public._quest_progress(auth.uid(), 'upgrade', 1);
  return res;
end;
$$;

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function public._next_serial() from public, anon, authenticated;
revoke execute on function public.serial_counts() from public;
grant execute on function public.serial_counts() to anon, authenticated;
