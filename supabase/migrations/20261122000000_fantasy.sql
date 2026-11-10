-- =============================================================================
-- Écurie du week-end : avant chaque Grand Prix, le joueur aligne 4 cartes de sa
-- collection (2 pilotes dont un capitaine, 1 écurie, 1 Légende), modifiables jusqu'au
-- début des qualifications. Elles marquent des points selon les vrais résultats :
--  - Pilote : points de la course (25, 18, 15…), +5 pour la pole, +1 par place gagnée
--    (10 max, à l'arrivée) ; le capitaine compte double.
--  - Écurie : la moitié des points de course de ses pilotes, +5 si deux sont dans les points.
--  - Légende : n'importe quelle autre carte, bonus fixe selon la rareté (3, 5, 8, 12, 20),
--    +5 pour une carte numérotée.
--  - Finition de la carte : Chrome ×1,25, Or ×1,5. Une carte qui n'est plus possédée au
--    moment de la notation ne marque rien (les cartes ne sont pas bloquées).
-- Récompenses du GP (à récupérer) : 50 Pièces, +1 pack pour le top 25 %, 2 packs pour le
-- top 5 %, 3 packs pour le premier. Classement de la saison : somme des points.
--
-- Les résultats complets arrivent avec la synchro des courses (scripts/sync-races.mjs) :
--   races.results = [{ d: pilote, t: écurie, pos, pts, grid, fin }]
-- =============================================================================

alter table public.races
  add column results jsonb,
  add column fantasy_scored_at timestamptz;

create table public.fantasy_lineups (
  user_id uuid not null references auth.users (id) on delete cascade,
  season smallint not null,
  round smallint not null,
  driver1 text not null references public.cards (id) on delete cascade,
  driver2 text not null references public.cards (id) on delete cascade,
  -- Pilote capitaine (1 ou 2)
  captain smallint not null default 1 check (captain in (1, 2)),
  team text not null references public.cards (id) on delete cascade,
  legend text not null references public.cards (id) on delete cascade,
  updated_at timestamptz not null default now(),
  -- Notation : total, détail par carte, place et récompense
  points numeric(7, 2),
  breakdown jsonb,
  rank integer,
  players integer,
  reward_coins integer,
  reward_packs integer,
  claimed_at timestamptz,
  primary key (user_id, season, round),
  foreign key (season, round) references public.races (season, round) on delete cascade,
  check (driver1 <> driver2 and legend not in (driver1, driver2, team))
);
create index fantasy_lineups_race_idx on public.fantasy_lineups (season, round);

alter table public.fantasy_lineups enable row level security;
revoke all on public.fantasy_lineups from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Barème
-- -----------------------------------------------------------------------------

/** Course à composer : la prochaine pas encore notée (jusqu'à 3 jours après le départ) */
create or replace function public._fantasy_race()
returns public.races
language sql
stable
set search_path = ''
as $$
  select * from public.races
   where fantasy_scored_at is null and race_at > now() - interval '3 days'
   order by race_at limit 1
$$;

/** Multiplicateur d'une carte du joueur : 0 si plus possédée, ×1,25 Chrome, ×1,5 Or */
create or replace function public._fantasy_mult(p_user uuid, p_card text)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select case uc.finish when 2 then 1.5 when 1 then 1.25 else 1 end
      from public.user_cards uc where uc.user_id = p_user and uc.card_id = p_card
  ), 0)
$$;

/** Points d'un pilote (identifiant Jolpica) : course, pole, places gagnées */
create or replace function public._fantasy_driver(r public.races, p_driver text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'pos', (x ->> 'pos')::int,
    'race', coalesce((x ->> 'pts')::numeric, 0),
    'pole', case when r.pole = p_driver then 5 else 0 end,
    -- Départ des stands (grille 0) : compté depuis le fond de grille
    'gained', case when (x ->> 'fin')::boolean
                   then least(10, greatest(0, coalesce(nullif((x ->> 'grid')::int, 0), 20) - (x ->> 'pos')::int))
                   else 0 end
  )
    from (select coalesce((select e from jsonb_array_elements(r.results) e where e ->> 'd' = p_driver limit 1), '{}'::jsonb) as x) s
$$;

/** Note une écurie : { points, breakdown } */
create or replace function public._fantasy_score(l public.fantasy_lineups, r public.races)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  lines jsonb := '[]';
  total numeric := 0;
  d jsonb;
  base numeric;
  mult numeric;
  pts numeric;
  v_card text;
  v_team text;
  v_rarity public.card_rarity;
  v_numbered boolean;
  scorers int;
begin
  -- Pilotes
  for i in 1..2 loop
    v_card := case i when 1 then l.driver1 else l.driver2 end;
    d := public._fantasy_driver(r, substr(v_card, 3));
    base := (d ->> 'race')::numeric + (d ->> 'pole')::numeric + (d ->> 'gained')::numeric;
    mult := public._fantasy_mult(l.user_id, v_card);
    pts := round(base * mult * case when l.captain = i then 2 else 1 end, 2);
    total := total + pts;
    lines := lines || jsonb_build_object('slot', 'driver', 'card', v_card, 'captain', l.captain = i,
      'base', base, 'mult', mult, 'points', pts, 'detail', d);
  end loop;

  -- Écurie
  v_team := substr(l.team, 3);
  select coalesce(sum((e ->> 'pts')::numeric), 0), count(*) filter (where (e ->> 'pts')::numeric > 0)
    into base, scorers
    from jsonb_array_elements(coalesce(r.results, '[]')) e
   where e ->> 't' = v_team;
  base := round(base / 2, 2) + case when scorers >= 2 then 5 else 0 end;
  mult := public._fantasy_mult(l.user_id, l.team);
  pts := round(base * mult, 2);
  total := total + pts;
  lines := lines || jsonb_build_object('slot', 'team', 'card', l.team, 'base', base, 'mult', mult, 'points', pts,
    'detail', jsonb_build_object('scorers', scorers));

  -- Légende
  select c.rarity, c.print_run is not null into v_rarity, v_numbered from public.cards c where c.id = l.legend;
  base := case v_rarity when 'common' then 3 when 'rare' then 5 when 'epic' then 8 when 'legendary' then 12 else 20 end
          + case when v_numbered then 5 else 0 end;
  mult := public._fantasy_mult(l.user_id, l.legend);
  pts := round(base * mult, 2);
  total := total + pts;
  lines := lines || jsonb_build_object('slot', 'legend', 'card', l.legend, 'base', base, 'mult', mult, 'points', pts,
    'detail', jsonb_build_object('rarity', v_rarity, 'numbered', v_numbered));

  return jsonb_build_object('points', total, 'breakdown', lines);
end;
$$;

/** Note toutes les écuries d'une course, puis classe et fixe les récompenses */
create or replace function public._score_fantasy(r public.races)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  update public.fantasy_lineups l
     set points = (s ->> 'points')::numeric, breakdown = s -> 'breakdown'
    from (select l2.user_id, public._fantasy_score(l2, r) as s
            from public.fantasy_lineups l2 where l2.season = r.season and l2.round = r.round) x
   where l.user_id = x.user_id and l.season = r.season and l.round = r.round;

  select count(*) into n from public.fantasy_lineups where season = r.season and round = r.round;
  update public.fantasy_lineups l
     set rank = k.rank,
         players = n,
         reward_coins = 50,
         reward_packs = case
           when k.rank = 1 then 3
           when k.rank <= ceil(n * 0.05) then 2
           when k.rank <= ceil(n * 0.25) then 1
           else 0 end
    from (select user_id, rank() over (order by points desc) as rank
            from public.fantasy_lineups where season = r.season and round = r.round) k
   where l.user_id = k.user_id and l.season = r.season and l.round = r.round;

  update public.races set fantasy_scored_at = now() where season = r.season and round = r.round;
end;
$$;

-- -----------------------------------------------------------------------------
-- API
-- -----------------------------------------------------------------------------

create or replace function public._fantasy_lineup_json(l public.fantasy_lineups)
returns json
language sql
stable
set search_path = ''
as $$
  select case when l.user_id is null then null else json_build_object(
    'driver1', l.driver1, 'driver2', l.driver2, 'captain', l.captain, 'team', l.team, 'legend', l.legend,
    'updated_at', l.updated_at, 'points', l.points, 'breakdown', l.breakdown, 'rank', l.rank, 'players', l.players,
    'reward', case when l.points is not null then json_build_object('coins', l.reward_coins, 'packs', l.reward_packs) end,
    'claimed', l.claimed_at is not null
  ) end
$$;

/** Classement de la saison : somme des points des courses notées (joueurs avec un pseudo) */
create or replace function public._fantasy_ranking(p_season smallint)
returns table (user_id uuid, username text, points numeric, races bigint, rank bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select l.user_id, p.username::text as username, sum(l.points) as points, count(*) as races
      from public.fantasy_lineups l
      join public.profiles p on p.user_id = l.user_id
     where l.season = p_season and l.points is not null and p.username is not null
     group by l.user_id, p.username
  )
  select t.*, rank() over (order by t.points desc) from totals t
$$;

/**
 * Page Écurie du week-end : la course à composer (ouverte jusqu'aux qualifications) et
 * mon écurie, la dernière course notée, mon historique et mon total de la saison.
 */
create or replace function public.my_fantasy()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  nxt public.races := public._fantasy_race();
  v_season smallint;
  mine public.fantasy_lineups;
begin
  perform public._load_profile(uid);
  v_season := coalesce(nxt.season, (select max(season) from public.races));
  select * into mine from public.fantasy_lineups where user_id = uid and season = nxt.season and round = nxt.round;

  return json_build_object(
    'season', v_season,
    'next', case when nxt.season is not null then json_build_object(
      'season', nxt.season, 'round', nxt.round, 'name', nxt.name, 'circuit', nxt.circuit_id,
      'quali_at', nxt.quali_at, 'race_at', nxt.race_at,
      'open', now() < nxt.quali_at,
      'players', (select count(*) from public.fantasy_lineups l where l.season = nxt.season and l.round = nxt.round),
      'mine', public._fantasy_lineup_json(mine)
    ) end,
    'history', coalesce((
      select json_agg(json_build_object('season', r.season, 'round', r.round, 'name', r.name, 'circuit', r.circuit_id,
                                        'mine', public._fantasy_lineup_json(l)) order by r.race_at desc)
        from public.fantasy_lineups l
        join public.races r on r.season = l.season and r.round = l.round
       where l.user_id = uid and l.season = v_season and l.points is not null
    ), '[]'),
    'total', (select coalesce(sum(points), 0) from public.fantasy_lineups where user_id = uid and season = v_season),
    'rank', (select k.rank from public._fantasy_ranking(v_season) k where k.user_id = uid),
    'players', (select count(*) from public._fantasy_ranking(v_season)),
    'status', public._status_json((select p from public.profiles p where p.user_id = uid))
  );
end;
$$;

/** Enregistre ou modifie mon écurie, jusqu'au début des qualifications */
create or replace function public.save_lineup(
  p_season int, p_round int, p_driver1 text, p_driver2 text, p_captain int, p_team text, p_legend text
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
  if now() >= r.quali_at or r.fantasy_scored_at is not null then
    raise exception 'Écurie verrouillée' using errcode = 'P0001', hint = 'LINEUP_CLOSED';
  end if;
  if p_captain not in (1, 2) or p_driver1 = p_driver2
     or p_legend in (p_driver1, p_driver2, p_team)
     or (select count(*) from public.cards c where c.id = p_driver1 and c.type = 'driver') = 0
     or (select count(*) from public.cards c where c.id = p_driver2 and c.type = 'driver') = 0
     or (select count(*) from public.cards c where c.id = p_team and c.type = 'team') = 0 then
    raise exception 'Écurie incomplète' using errcode = 'P0001', hint = 'LINEUP_INVALID';
  end if;
  if (select count(*) from public.user_cards
       where user_id = uid and card_id in (p_driver1, p_driver2, p_team, p_legend)) < 4 then
    raise exception 'Carte non possédée' using errcode = 'P0001', hint = 'NOT_OWNED';
  end if;

  perform public._load_profile(uid);
  insert into public.fantasy_lineups (user_id, season, round, driver1, driver2, captain, team, legend)
  values (uid, p_season, p_round, p_driver1, p_driver2, p_captain, p_team, p_legend)
  on conflict (user_id, season, round) do update
     set driver1 = excluded.driver1, driver2 = excluded.driver2, captain = excluded.captain,
         team = excluded.team, legend = excluded.legend, updated_at = now();

  return public.my_fantasy();
end;
$$;

/** Récupère la récompense d'une course notée */
create or replace function public.claim_fantasy(p_season int, p_round int)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  l public.fantasy_lineups;
begin
  perform public._load_profile(uid);
  select * into l from public.fantasy_lineups
   where user_id = uid and season = p_season and round = p_round for update;
  if l.user_id is null or l.points is null then
    raise exception 'Résultats pas encore connus' using errcode = 'P0001', hint = 'PREDICTION_PENDING';
  end if;
  if l.claimed_at is not null then
    raise exception 'Déjà récupéré' using errcode = 'P0001', hint = 'PREDICTION_CLAIMED';
  end if;

  update public.fantasy_lineups set claimed_at = now()
   where user_id = uid and season = p_season and round = p_round;
  update public.profiles
     set coins = coins + l.reward_coins, bonus_packs = bonus_packs + l.reward_packs
   where user_id = uid;

  return (public.my_fantasy()::jsonb || jsonb_build_object(
    'claimed', jsonb_build_object('coins', l.reward_coins, 'packs', l.reward_packs)
  ))::json;
end;
$$;

/**
 * Classement de l'Écurie du week-end, général ou entre amis : une course (`p_round`)
 * ou toute la saison
 */
create or replace function public.fantasy_leaderboard(
  p_season int default null,
  p_round int default null,
  p_friends boolean default false,
  p_limit int default 50
)
returns table (
  rank bigint,
  username text,
  points numeric,
  races bigint,
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
  with season as (select coalesce(p_season, (select max(season) from public.races))::smallint as s),
  board as (
    select l.user_id, p.username::text as username, l.points, 1::bigint as races, l.rank::bigint as rank
      from public.fantasy_lineups l
      join public.profiles p on p.user_id = l.user_id
     where p_round is not null and l.season = (select s from season) and l.round = p_round
       and l.points is not null and p.username is not null
    union all
    select k.user_id, k.username, k.points, k.races, k.rank
      from public._fantasy_ranking((select s from season)) k
     where p_round is null
  )
  select b.rank, b.username, b.points, b.races,
         p.avatar_card, coalesce(uc.finish, 0)::smallint, p.title, p.team,
         b.user_id = auth.uid()
    from board b
    join public.profiles p on p.user_id = b.user_id
    left join public.user_cards uc on uc.user_id = b.user_id and uc.card_id = p.avatar_card
   where not p_friends
      or b.user_id = auth.uid()
      or b.user_id in (select public._friend_ids(auth.uid()))
   order by b.rank, b.username
   limit least(greatest(p_limit, 1), 100)
$$;

-- -----------------------------------------------------------------------------
-- État de la réserve : récompenses d'écurie à récupérer
-- -----------------------------------------------------------------------------
alter function public._status_json(public.profiles) rename to _status_json_daily;

create function public._status_json(p public.profiles)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select (public._status_json_daily(p)::jsonb || jsonb_build_object(
    'fantasy_ready', (
      select count(*) from public.fantasy_lineups l
       where l.user_id = p.user_id and l.points is not null and l.claimed_at is null
    )
  ))::json
$$;

-- -----------------------------------------------------------------------------
-- Synchronisation : résultats complets, puis notation des écuries
-- -----------------------------------------------------------------------------
alter function public.sync_races(jsonb) rename to _sync_races_base;

create function public.sync_races(p_races jsonb)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  res json := public._sync_races_base(p_races);
  r public.races;
  v_scored int := 0;
begin
  -- Résultats complets des courses pas encore notées pour l'écurie
  update public.races ra
     set results = x.results
    from jsonb_to_recordset(p_races) as x (season smallint, round smallint, results jsonb)
   where ra.season = x.season and ra.round = x.round
     and ra.fantasy_scored_at is null
     and jsonb_typeof(x.results) = 'array' and jsonb_array_length(x.results) > 0;

  for r in select * from public.races
            where fantasy_scored_at is null and results is not null and race_at < now()
            order by race_at
  loop
    perform public._score_fantasy(r);
    v_scored := v_scored + 1;
  end loop;

  return (res::jsonb || jsonb_build_object('fantasy_scored', v_scored))::json;
end;
$$;

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function
  public._fantasy_race(),
  public._fantasy_mult(uuid, text),
  public._fantasy_driver(public.races, text),
  public._fantasy_score(public.fantasy_lineups, public.races),
  public._score_fantasy(public.races),
  public._fantasy_lineup_json(public.fantasy_lineups),
  public._fantasy_ranking(smallint),
  public._status_json(public.profiles),
  public._status_json_daily(public.profiles),
  public._sync_races_base(jsonb),
  public.sync_races(jsonb)
  from public, anon, authenticated;

revoke execute on function
  public.my_fantasy(),
  public.save_lineup(int, int, text, text, int, text, text),
  public.claim_fantasy(int, int),
  public.fantasy_leaderboard(int, int, boolean, int)
  from public, anon;
grant execute on function
  public.my_fantasy(),
  public.save_lineup(int, int, text, text, int, text, text),
  public.claim_fantasy(int, int),
  public.fantasy_leaderboard(int, int, boolean, int)
  to authenticated;
