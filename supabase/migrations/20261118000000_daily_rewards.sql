-- =============================================================================
-- Rendez-vous du jour (en haut de la page Packs) :
--  - Série de connexion : une récompense à récupérer chaque jour (20, 30, 40, 50, 60,
--    80 Pièces puis un pack bonus au 7e jour), qui recommence par semaine tant que la
--    série tient. Chaque semaine complète donne un joker (2 au maximum) qui protège la
--    série d'un jour manqué. Distincte de la série de quêtes (4 quêtes par jour).
--  - Carte mystère : 3 cartes face cachée, on en retourne une par jour.
-- =============================================================================

alter table public.profiles
  add column login_streak integer not null default 0,
  add column login_best integer not null default 0,
  -- Dernier jour où la récompense a été récupérée
  add column login_day date,
  add column login_jokers smallint not null default 0 check (login_jokers between 0 and 2),
  add column mystery_day date;

/** Pièces du jour selon sa place dans la semaine (1 à 6) ; le 7e jour donne un pack */
create or replace function public._login_reward(p_day int)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (array[20, 30, 40, 50, 60, 80, 0])[p_day]
$$;

/**
 * Série encore valable : récupérée aujourd'hui ou hier, ou plus tôt si les jokers
 * couvrent les jours manqués. Renvoie 0 si elle est perdue.
 */
create or replace function public._login_streak(p public.profiles)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p.login_day is null then 0
    when p.login_day >= current_date - 1 - p.login_jokers then p.login_streak
    else 0
  end
$$;

/** Récupère la récompense du jour de la série de connexion */
create or replace function public.claim_login_streak()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles := public._load_profile(uid);
  kept int := public._login_streak(p);
  missed int := 0;
  n int;
  day int;
  v_coins int;
begin
  if p.login_day = current_date then
    raise exception 'Récompense du jour déjà récupérée' using errcode = 'P0001', hint = 'ALREADY_CLAIMED';
  end if;
  -- Jours manqués couverts par des jokers
  if kept > 0 then
    missed := greatest(0, current_date - p.login_day - 1);
  end if;
  n := kept + 1;
  day := (n - 1) % 7 + 1;
  v_coins := public._login_reward(day);

  update public.profiles
     set coins = coins + v_coins,
         bonus_packs = bonus_packs + (day = 7)::int,
         login_streak = n,
         login_best = greatest(login_best, n),
         login_day = current_date,
         login_jokers = least(2, login_jokers - missed + (day = 7)::int)
   where user_id = uid
  returning * into p;

  return json_build_object(
    'day', day, 'coins', v_coins, 'pack', day = 7, 'streak', n, 'jokers_used', missed,
    'status', public._status_json(p)
  );
end;
$$;

/** Rareté d'une carte mystère : 78 % Commune, 18 % Rare, 3,5 % Épique, 0,5 % Légendaire */
create or replace function public._mystery_rarity()
returns public.card_rarity
language sql
volatile
set search_path = ''
as $$
  select case
    when x < 780 then 'common'
    when x < 960 then 'rare'
    when x < 995 then 'epic'
    else 'legendary'
  end::public.card_rarity
    from (select floor(random() * 1000) as x) r
$$;

/**
 * Carte mystère du jour : tire 3 cartes, donne celle de l'emplacement choisi (0 à 2) et
 * renvoie les trois pour les révéler.
 */
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
     where c.rarity = r and c.edition_of is null and c.type <> 'poster'
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

-- État de la réserve : ajout du rendez-vous du jour
alter function public._status_json(public.profiles) rename to _status_json_trades;

create function public._status_json(p public.profiles)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select (public._status_json_trades(p)::jsonb || jsonb_build_object(
    'daily', jsonb_build_object(
      'streak', public._login_streak(p),
      'best', p.login_best,
      'jokers', p.login_jokers,
      'claimed', coalesce(p.login_day = current_date, false),
      -- Jour de la semaine (1 à 7) de la récompense d'aujourd'hui
      'day', case when p.login_day = current_date then (p.login_streak - 1) % 7 + 1
                  else public._login_streak(p) % 7 + 1 end,
      'mystery', p.mystery_day is distinct from current_date,
      'resets_at', (current_date + 1)::timestamptz
    )
  ))::json
$$;

-- -----------------------------------------------------------------------------
-- Rappel du soir : série de connexion en jeu (19 h, heure de Paris)
-- -----------------------------------------------------------------------------
alter function public.queue_scheduled_notifications() rename to _queue_scheduled_base;

create function public.queue_scheduled_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._queue_scheduled_base();
  if extract(hour from now() at time zone 'Europe/Paris') = 19 then
    perform public._notify(p.user_id, 'packs',
              'Ta série de ' || public._login_streak(p) || ' jour' || case when public._login_streak(p) > 1 then 's' else '' end || ' est en jeu',
              'Passe récupérer ta récompense du jour avant minuit.', '/packs',
              'login:' || current_date || ':' || p.user_id)
       from public.profiles p
      where exists (select 1 from public.push_subscriptions s where s.user_id = p.user_id)
        and p.login_day = current_date - 1
        and p.login_streak > 1;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function
  public._login_reward(int),
  public._login_streak(public.profiles),
  public._mystery_rarity(),
  public._status_json(public.profiles),
  public._status_json_trades(public.profiles),
  public._queue_scheduled_base(),
  public.queue_scheduled_notifications()
  from public, anon, authenticated;

-- La fonction d'envoi (rôle service_role) prépare les rappels
grant execute on function public.queue_scheduled_notifications() to service_role;

revoke execute on function public.claim_login_streak(), public.open_mystery_card(int) from public, anon;
grant execute on function public.claim_login_streak(), public.open_mystery_card(int) to authenticated;
