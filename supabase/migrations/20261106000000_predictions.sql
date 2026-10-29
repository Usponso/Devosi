-- =============================================================================
-- Pronostics de Grand Prix, pack du week-end de course et édition vainqueur.
--  - Avant chaque GP : on pronostique le podium (ordre exact) et la pole, jusqu'au
--    début des qualifications. Points : 10 par pilote à la bonne place, 4 par pilote du
--    podium mal placé, 10 pour la pole, +15 pour un podium parfait. 1 point = 5 Pièces,
--    podium parfait = 1 pack bonus. Fin de saison : 10 / 6 / 3 packs pour le top 3.
--  - Pendant le week-end de course : 1 pack GP offert par jour, et 3 achetables
--    (200 Pièces). 2 cartes sur 5 sont liées au circuit.
--  - Après la course, pendant 7 jours : l'édition vainqueur (la carte du vainqueur,
--    tamponnée) est garantie à ceux qui avaient trouvé le vainqueur, et tirable dans
--    les packs (3 % par pack, 6 % dans un pack GP).
--
-- Le calendrier et les résultats sont copiés depuis Jolpica par le workflow GitHub
-- « Courses » (scripts/sync-races.mjs), qui appelle public.sync_races().
-- =============================================================================

create table public.races (
  season smallint not null,
  round smallint not null,
  name text not null,
  circuit_id text not null,
  -- Début du week-end (jour des premiers essais, minuit UTC), qualifications, départ
  weekend_start timestamptz not null,
  quali_at timestamptz not null,
  race_at timestamptz not null,
  -- Résultats (identifiants pilote Jolpica)
  pole text,
  p1 text,
  p2 text,
  p3 text,
  scored_at timestamptz,
  primary key (season, round)
);

create table public.predictions (
  user_id uuid not null references auth.users (id) on delete cascade,
  season smallint not null,
  round smallint not null,
  p1 text not null,
  p2 text not null,
  p3 text not null,
  pole text not null,
  updated_at timestamptz not null default now(),
  points smallint,
  claimed_at timestamptz,
  primary key (user_id, season, round),
  foreign key (season, round) references public.races (season, round) on delete cascade,
  check (p1 <> p2 and p1 <> p3 and p2 <> p3)
);
create index predictions_race_idx on public.predictions (season, round);

-- Cartes liées à un circuit (remplie par seed.sql) : GP disputés, pilotes et écuries vainqueurs
create table public.card_circuits (
  card_id text not null references public.cards (id) on delete cascade,
  circuit_id text not null,
  primary key (card_id, circuit_id)
);
create index card_circuits_circuit_idx on public.card_circuits (circuit_id);

-- Éditions vainqueur obtenues (une par course)
create table public.user_editions (
  user_id uuid not null references auth.users (id) on delete cascade,
  season smallint not null,
  round smallint not null,
  card_id text not null references public.cards (id) on delete cascade,
  -- Nom du Grand Prix (affiché sur le tampon)
  name text not null,
  obtained_at timestamptz not null default now(),
  primary key (user_id, season, round),
  foreign key (season, round) references public.races (season, round) on delete cascade
);

-- Récompenses de fin de saison déjà versées
create table public.prediction_season_rewards (
  season smallint not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  rank integer not null,
  packs integer not null,
  primary key (season, user_id)
);

alter table public.profiles
  -- Packs GP achetés pas encore ouverts, pour le week-end `gp_key` (saison * 100 + manche)
  add column gp_packs smallint not null default 0 check (gp_packs >= 0),
  add column gp_key integer,
  add column gp_bought smallint not null default 0,
  -- Dernier jour où le pack GP offert a été ouvert
  add column gp_free_day date;

alter table public.races enable row level security;
alter table public.predictions enable row level security;
alter table public.card_circuits enable row level security;
alter table public.user_editions enable row level security;
alter table public.prediction_season_rewards enable row level security;
revoke all on public.races, public.predictions, public.card_circuits, public.prediction_season_rewards
  from anon, authenticated;

-- Éditions : lues directement par l'app avec la collection
revoke all on public.user_editions from anon, authenticated;
create policy "ses éditions" on public.user_editions for select to authenticated using (user_id = (select auth.uid()));
grant select on public.user_editions to authenticated;

-- -----------------------------------------------------------------------------
-- Réglages et repères
-- -----------------------------------------------------------------------------
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
    when 'edition_odds' then 30
    when 'edition_odds_gp' then 60
    when 'edition_days' then 7
    when 'coins_per_point' then 5
  end
$$;

/** Week-end de course en cours : du jour des premiers essais à la fin du jour de la course (UTC) */
create or replace function public._current_weekend()
returns public.races
language sql
stable
set search_path = ''
as $$
  select * from public.races r
   where now() >= r.weekend_start and now() < (r.race_at::date + 1)::timestamptz
   order by r.race_at
   limit 1
$$;

/** Édition vainqueur en cours : la dernière course notée, pendant les 7 jours qui suivent son départ */
create or replace function public._current_edition()
returns table (season smallint, round smallint, name text, card_id text, until timestamptz)
language sql
stable
set search_path = ''
as $$
  select r.season, r.round, r.name, c.id, r.race_at + make_interval(days => public._gp_setting('edition_days'))
    from public.races r
    join public.cards c on c.id = 'd-' || r.p1
   where r.scored_at is not null
     and r.race_at > now() - make_interval(days => public._gp_setting('edition_days'))
   order by r.race_at desc
   limit 1
$$;

/** Points d'un pronostic */
create or replace function public._prediction_points(p public.predictions, r public.races)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (case when p.p1 = r.p1 then 10 when p.p1 in (r.p2, r.p3) then 4 else 0 end)
       + (case when p.p2 = r.p2 then 10 when p.p2 in (r.p1, r.p3) then 4 else 0 end)
       + (case when p.p3 = r.p3 then 10 when p.p3 in (r.p1, r.p2) then 4 else 0 end)
       + (case when p.pole = r.pole then 10 else 0 end)
       + (case when p.p1 = r.p1 and p.p2 = r.p2 and p.p3 = r.p3 then 15 else 0 end)
$$;

-- -----------------------------------------------------------------------------
-- Profil : les packs GP achetés et pas ouverts à la fin du week-end rejoignent la
-- réserve bonus. Toutes les fonctions du jeu passent par _load_profile.
-- -----------------------------------------------------------------------------
alter function public._load_profile(uuid) rename to _load_profile_base;

create function public._load_profile(p_user uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles := public._load_profile_base(p_user);
  w public.races := public._current_weekend();
begin
  if p.gp_packs > 0 and p.gp_key is distinct from w.season * 100 + w.round then
    update public.profiles
       set bonus_packs = bonus_packs + gp_packs, gp_packs = 0
     where user_id = p_user
    returning * into p;
  end if;
  return p;
end;
$$;

-- -----------------------------------------------------------------------------
-- État de la réserve : ajout du week-end de course, de l'édition et des pronostics
-- -----------------------------------------------------------------------------
create or replace function public._status_json(p public.profiles)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'available', p.packs_banked,
    'max', public._game_setting('max_packs'),
    'bonus', p.bonus_packs,
    'special', p.special_packs,
    'next_at', case
      when p.packs_banked >= public._game_setting('max_packs') then null
      else p.last_refill_at + make_interval(mins => public._game_setting('refill_minutes'))
    end,
    'pity_left', public._game_setting('pity_limit') - p.pity,
    'packs_opened', p.packs_opened,
    'coins', p.coins,
    'shop', json_build_object(
      'price', public._game_setting('pack_price'),
      'daily', public._game_setting('daily_buys'),
      'left', public._game_setting('daily_buys')
              - case when p.bought_day = current_date then p.bought_today else 0 end
    ),
    'quests_ready', (
      select count(*) from public.user_quests q
       where q.user_id = p.user_id and q.day = current_date
         and q.claimed_at is null and q.progress >= q.target
    ),
    'gp', (
      select json_build_object(
        'season', w.season,
        'round', w.round,
        'name', w.name,
        'circuit', w.circuit_id,
        'ends_at', (w.race_at::date + 1)::timestamptz,
        'free', p.gp_free_day is distinct from current_date,
        'packs', case when p.gp_key = w.season * 100 + w.round then p.gp_packs else 0 end,
        'left', public._gp_setting('weekend_buys')
                - case when p.gp_key = w.season * 100 + w.round then p.gp_bought else 0 end,
        'price', public._gp_setting('pack_price')
      )
        from public._current_weekend() w
       where w.season is not null
    ),
    'edition', (
      select json_build_object('season', e.season, 'round', e.round, 'name', e.name, 'card', e.card_id, 'until', e.until)
        from public._current_edition() e
    ),
    'predictions_ready', (
      select count(*) from public.predictions pr
       where pr.user_id = p.user_id and pr.points is not null and pr.claimed_at is null
    ),
    'server_now', now()
  )
$$;

-- -----------------------------------------------------------------------------
-- Ouverture d'un pack : `p_gp` ouvre un pack GP (l'offert du jour, sinon un acheté)
-- -----------------------------------------------------------------------------
drop function public.open_pack();

create function public.open_pack(p_gp boolean default false)
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
      select c.id into v_card from public.cards c where c.rarity = r order by random() limit 1;
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

/** Achète un pack GP (pendant le week-end de course, 3 au maximum) */
create or replace function public.buy_gp_pack()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles := public._load_profile(uid);
  w public.races := public._current_weekend();
  v_key integer;
  bought int;
  price int := public._gp_setting('pack_price');
begin
  if w.season is null then
    raise exception 'Pas de week-end de course en cours' using errcode = 'P0001', hint = 'NO_WEEKEND';
  end if;
  v_key := w.season * 100 + w.round;
  bought := case when p.gp_key = v_key then p.gp_bought else 0 end;

  if bought >= public._gp_setting('weekend_buys') then
    raise exception 'Limite d''achats du week-end atteinte' using errcode = 'P0001', hint = 'GP_SHOP_LIMIT';
  end if;
  if p.coins < price then
    raise exception 'Pas assez de Pièces' using errcode = 'P0001', hint = 'NOT_ENOUGH_COINS';
  end if;

  update public.profiles
     set coins = coins - price,
         gp_packs = case when gp_key = v_key then gp_packs else 0 end + 1,
         gp_bought = bought + 1,
         gp_key = v_key
   where user_id = uid
  returning * into p;
  return json_build_object('status', public._status_json(p));
end;
$$;

-- -----------------------------------------------------------------------------
-- Pronostics
-- -----------------------------------------------------------------------------

/** Pronostic d'une course (null si absent) */
create or replace function public._prediction_json(p_user uuid, r public.races)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'p1', pr.p1, 'p2', pr.p2, 'p3', pr.p3, 'pole', pr.pole,
    'points', pr.points, 'claimed', pr.claimed_at is not null, 'updated_at', pr.updated_at
  )
    from public.predictions pr
   where pr.user_id = p_user and pr.season = r.season and pr.round = r.round
$$;

/** Classement des pronostics d'une saison (joueurs avec un pseudo) */
create or replace function public._prediction_ranking(p_season smallint)
returns table (user_id uuid, username text, points bigint, races bigint, perfect bigint, rank bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select pr.user_id, p.username::text as username,
           sum(pr.points) as points,
           count(*) as races,
           count(*) filter (where pr.points >= 45) as perfect
      from public.predictions pr
      join public.profiles p on p.user_id = pr.user_id
     where pr.season = p_season and pr.points is not null and p.username is not null
     group by pr.user_id, p.username
  )
  select t.*, rank() over (order by t.points desc, t.perfect desc) from totals t
$$;

/**
 * Page Pronostics : la prochaine course (ouverte jusqu'aux qualifications), les courses
 * passées de la saison avec mes points, et mon total.
 */
create or replace function public.my_predictions()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  nxt public.races;
  v_season smallint;
begin
  perform public._load_profile(uid);
  select * into nxt from public.races where scored_at is null and race_at > now() - interval '3 days'
   order by race_at limit 1;
  v_season := coalesce(nxt.season, (select max(season) from public.races));

  return json_build_object(
    'season', v_season,
    'next', case when nxt.season is not null then json_build_object(
      'season', nxt.season,
      'round', nxt.round,
      'name', nxt.name,
      'circuit', nxt.circuit_id,
      'quali_at', nxt.quali_at,
      'race_at', nxt.race_at,
      'open', now() < nxt.quali_at,
      'players', (select count(*) from public.predictions pr where pr.season = nxt.season and pr.round = nxt.round),
      'mine', public._prediction_json(uid, nxt)
    ) end,
    'history', coalesce((
      select json_agg(json_build_object(
               'season', r.season, 'round', r.round, 'name', r.name, 'circuit', r.circuit_id,
               'result', json_build_object('p1', r.p1, 'p2', r.p2, 'p3', r.p3, 'pole', r.pole),
               'mine', public._prediction_json(uid, r)
             ) order by r.round desc)
        from public.races r
       where r.season = v_season and r.scored_at is not null
    ), '[]'),
    'total', (select coalesce(sum(points), 0) from public.predictions where user_id = uid and season = v_season),
    'rank', (select k.rank from public._prediction_ranking(v_season) k where k.user_id = uid),
    'players', (select count(*) from public._prediction_ranking(v_season)),
    'status', public._status_json((select p from public.profiles p where p.user_id = uid))
  );
end;
$$;

/** Enregistre ou modifie un pronostic, jusqu'au début des qualifications */
create or replace function public.save_prediction(
  p_season int, p_round int, p_p1 text, p_p2 text, p_p3 text, p_pole text
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  r public.races;
begin
  select * into r from public.races where season = p_season and round = p_round;
  if r.season is null then
    raise exception 'Course inconnue' using errcode = 'P0001', hint = 'RACE_UNKNOWN';
  end if;
  if now() >= r.quali_at then
    raise exception 'Pronostics fermés' using errcode = 'P0001', hint = 'PREDICTION_CLOSED';
  end if;
  if not (coalesce(p_p1, '') ~ '^[a-z0-9_]{1,40}$' and coalesce(p_p2, '') ~ '^[a-z0-9_]{1,40}$'
          and coalesce(p_p3, '') ~ '^[a-z0-9_]{1,40}$' and coalesce(p_pole, '') ~ '^[a-z0-9_]{1,40}$') then
    raise exception 'Pronostic incomplet' using errcode = 'P0001', hint = 'PREDICTION_INVALID';
  end if;
  if p_p1 = p_p2 or p_p1 = p_p3 or p_p2 = p_p3 then
    raise exception 'Un pilote ne peut être qu''une fois sur le podium' using errcode = 'P0001', hint = 'PREDICTION_DUPLICATE';
  end if;

  perform public._load_profile(uid);
  insert into public.predictions (user_id, season, round, p1, p2, p3, pole)
  values (uid, p_season, p_round, p_p1, p_p2, p_p3, p_pole)
  on conflict (user_id, season, round) do update
     set p1 = excluded.p1, p2 = excluded.p2, p3 = excluded.p3, pole = excluded.pole, updated_at = now();

  return public.my_predictions();
end;
$$;

/**
 * Récupère les gains d'un pronostic noté : 5 Pièces par point, 1 pack bonus pour un
 * podium parfait, et l'édition vainqueur si le vainqueur était le bon.
 */
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
  if pr.p1 = r.p1 and exists (select 1 from public.cards where id = 'd-' || r.p1) then
    insert into public.user_editions (user_id, season, round, card_id, name)
    values (uid, r.season, r.round, 'd-' || r.p1, r.name)
    on conflict do nothing;
    if found then
      v_edition := 'd-' || r.p1;
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

/** Classement des pronostics de la saison, général ou entre amis */
create or replace function public.prediction_leaderboard(
  p_season int default null,
  p_friends boolean default false,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  rank bigint,
  username text,
  points bigint,
  races bigint,
  perfect bigint,
  avatar text,
  avatar_finish smallint,
  title text,
  team text,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select k.rank, k.username, k.points, k.races, k.perfect,
         p.avatar_card, coalesce(uc.finish, 0)::smallint, p.title, p.team,
         k.user_id = auth.uid()
    from public._prediction_ranking(coalesce(p_season, (select max(season) from public.races))::smallint) k
    join public.profiles p on p.user_id = k.user_id
    left join public.user_cards uc on uc.user_id = k.user_id and uc.card_id = p.avatar_card
   where not p_friends
      or k.user_id = auth.uid()
      or k.user_id in (select public._friend_ids(auth.uid()))
   order by k.rank, k.username
   limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0)
$$;

-- -----------------------------------------------------------------------------
-- Synchronisation (workflow GitHub, rôle postgres) : calendrier et résultats, puis
-- notation des courses terminées et récompenses de fin de saison.
--   p_races : [{ season, round, name, circuit_id, weekend_start, quali_at, race_at,
--               pole, p1, p2, p3 }]
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function
  public._gp_setting(text),
  public._current_weekend(),
  public._current_edition(),
  public._prediction_points(public.predictions, public.races),
  public._load_profile(uuid),
  public._load_profile_base(uuid),
  public._prediction_json(uuid, public.races),
  public._prediction_ranking(smallint),
  public.sync_races(jsonb)
  from public, anon, authenticated;

revoke execute on function
  public.open_pack(boolean),
  public.buy_gp_pack(),
  public.my_predictions(),
  public.save_prediction(int, int, text, text, text, text),
  public.claim_prediction(int, int),
  public.prediction_leaderboard(int, boolean, int, int)
  from public, anon;
grant execute on function
  public.open_pack(boolean),
  public.buy_gp_pack(),
  public.my_predictions(),
  public.save_prediction(int, int, text, text, text, text),
  public.claim_prediction(int, int),
  public.prediction_leaderboard(int, boolean, int, int)
  to authenticated;
