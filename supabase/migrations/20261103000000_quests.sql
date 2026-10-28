-- =============================================================================
-- Quêtes journalières et réserve bonus.
--  - 4 quêtes par jour (2 faciles, 1 moyenne, 1 difficile), renouvelées à minuit UTC,
--    1 relance par jour ; leur progression est suivie par les fonctions du jeu
--  - Les 4 terminées : 1 pack bonus et un jour de série ; 7e jour : 1 pack spécial
--    (au moins une Épique garantie)
--  - Les packs gagnés vont dans une réserve bonus sans plafond, à part de la recharge
-- =============================================================================

-- Écurie et année de chaque carte (remplies par seed.sql) : quêtes « ton écurie », « une décennie »
alter table public.cards
  add column team text,
  add column year smallint;
create index cards_team_idx on public.cards (team);

alter table public.profiles
  add column bonus_packs integer not null default 0 check (bonus_packs >= 0),
  add column special_packs smallint not null default 0 check (special_packs >= 0),
  add column quest_rerolled_day date,
  -- Série : jours consécutifs avec les 4 quêtes terminées (streak_day : dernier jour validé)
  add column streak smallint not null default 0,
  add column streak_day date;

create table public.user_quests (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  slot smallint not null check (slot between 1 and 4),
  quest_id text not null,
  param text,
  progress integer not null default 0,
  target integer not null,
  claimed_at timestamptz,
  primary key (user_id, day, slot)
);

-- Accès uniquement via les fonctions ci-dessous
alter table public.user_quests enable row level security;
revoke all on public.user_quests from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Catalogue des quêtes
--   tier : 1 facile, 2 moyenne, 3 difficile
--   kind : open (packs ouverts), recycle (exemplaires recyclés), craft, trade_up, upgrade,
--          cards (cartes obtenues), new (nouvelles cartes), type (cartes d'un type),
--          rarity (une carte de cette rareté ou mieux), team (une carte d'une écurie),
--          decade (une carte d'une décennie)
--   Récompense : `coins` Pièces ou `packs` packs bonus
-- -----------------------------------------------------------------------------
create or replace function public._quest_pool()
returns table (id text, tier smallint, kind text, target integer, param text, coins integer, packs integer)
language sql
immutable
set search_path = ''
as $$
  select * from (values
    ('open-3', 1::smallint, 'open', 3, null, 50, 0),
    ('recycle-5', 1::smallint, 'recycle', 5, null, 50, 0),
    ('new-2', 1::smallint, 'new', 2, null, 50, 0),
    ('cards-15', 1::smallint, 'cards', 15, null, 50, 0),
    ('gp-2', 1::smallint, 'type', 2, 'gp', 50, 0),
    ('driver-3', 1::smallint, 'type', 3, 'driver', 50, 0),
    ('team-cards-1', 1::smallint, 'type', 1, 'team', 50, 0),
    ('rare-1', 2::smallint, 'rarity', 1, 'rare', 100, 0),
    ('craft-1', 2::smallint, 'craft', 1, null, 100, 0),
    ('team-1', 2::smallint, 'team', 1, null, 100, 0),
    ('decade-1', 2::smallint, 'decade', 1, null, 100, 0),
    ('new-5', 2::smallint, 'new', 5, null, 100, 0),
    ('moment-1', 2::smallint, 'type', 1, 'moment', 100, 0),
    ('recycle-15', 2::smallint, 'recycle', 15, null, 100, 0),
    ('epic-1', 3::smallint, 'rarity', 1, 'epic', 0, 1),
    ('tradeup-1', 3::smallint, 'trade_up', 1, null, 0, 1),
    ('open-8', 3::smallint, 'open', 8, null, 0, 1),
    ('upgrade-1', 3::smallint, 'upgrade', 1, null, 0, 1),
    ('new-10', 3::smallint, 'new', 10, null, 0, 1)
  ) as q (id, tier, kind, target, param, coins, packs)
$$;

/** Paramètre tiré au moment de la quête : écurie (la favorite si elle a assez de cartes) ou décennie */
create or replace function public._quest_param(p_user uuid, p_kind text, p_default text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_team text;
begin
  if p_kind = 'team' then
    select team into v_team from public.profiles where user_id = p_user;
    if v_team is not null and (select count(*) from public.cards where team = v_team) >= 40 then
      return v_team;
    end if;
    return (
      select c.team from public.cards c
       where c.team is not null
       group by c.team having count(*) >= 80
       order by random() limit 1
    );
  elsif p_kind = 'decade' then
    return (1950 + floor(random() * 8)::int * 10)::text;
  end if;
  return p_default;
end;
$$;

/** Quête au hasard d'une difficulté, hors de celles déjà prises */
create or replace function public._pick_quest(p_tier smallint, p_exclude text[])
returns text
language sql
volatile
set search_path = ''
as $$
  select id from public._quest_pool()
   where tier = p_tier and not (id = any (coalesce(p_exclude, '{}')))
   order by random() limit 1
$$;

/** Tire les 4 quêtes du jour si ce n'est pas déjà fait (et oublie celles des jours passés) */
create or replace function public._ensure_quests(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tiers smallint[] := '{1,1,2,3}';
  picked text[] := '{}';
  v_id text;
  d record;
begin
  if exists (select 1 from public.user_quests where user_id = p_user and day = current_date) then
    return;
  end if;
  delete from public.user_quests where user_id = p_user and day < current_date;

  for i in 1..4 loop
    v_id := public._pick_quest(tiers[i], picked);
    picked := picked || v_id;
    select * into d from public._quest_pool() q where q.id = v_id;
    insert into public.user_quests (user_id, day, slot, quest_id, param, target)
    values (p_user, current_date, i, v_id, public._quest_param(p_user, d.kind, d.param), d.target)
    on conflict do nothing;
  end loop;
end;
$$;

/**
 * Fait avancer les quêtes du jour. `p_kind` : open, recycle, craft, trade_up, upgrade,
 * ou card (une carte obtenue : `p_card`, `p_new` si c'est une nouvelle carte).
 */
create or replace function public._quest_progress(p_user uuid, p_kind text, p_amount integer,
  p_card text default null, p_new boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.cards;
begin
  if p_user is null or coalesce(p_amount, 0) < 1 then
    return;
  end if;
  perform public._ensure_quests(p_user);
  if p_kind = 'card' then
    select * into c from public.cards where id = p_card;
  end if;

  update public.user_quests q
     set progress = least(q.target, q.progress + p_amount)
    from public._quest_pool() d
   where q.user_id = p_user and q.day = current_date and q.claimed_at is null
     and q.progress < q.target and d.id = q.quest_id
     -- CASE (et non OR) : le paramètre n'est converti que pour le bon type de quête
     and case
       when p_kind <> 'card' then d.kind = p_kind
       else case d.kind
         when 'cards' then true
         when 'new' then p_new
         when 'type' then q.param = c.type::text
         when 'rarity' then c.rarity >= q.param::public.card_rarity
         when 'team' then q.param = c.team
         when 'decade' then c.year between q.param::int and q.param::int + 9
         else false
       end
     end;
end;
$$;

/** Série affichée : remise à zéro après un jour manqué, et après le 7e jour */
create or replace function public._current_streak(p public.profiles)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p.streak_day = current_date then p.streak
    when p.streak_day = current_date - 1 then p.streak % 7
    else 0
  end
$$;

/** Quêtes du jour, série et relance */
create or replace function public._quests_json(p_user uuid)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'day', current_date,
    'resets_at', (current_date + 1)::timestamptz,
    'reroll_available', p.quest_rerolled_day is distinct from current_date,
    'streak', public._current_streak(p),
    'bonus_claimed', p.streak_day = current_date,
    'quests', coalesce((
      select json_agg(json_build_object(
               'slot', q.slot, 'id', q.quest_id, 'tier', d.tier, 'kind', d.kind, 'param', q.param,
               'progress', q.progress, 'target', q.target, 'coins', d.coins, 'packs', d.packs,
               'claimed', q.claimed_at is not null
             ) order by q.slot)
        from public.user_quests q
        join public._quest_pool() d on d.id = q.quest_id
       where q.user_id = p_user and q.day = current_date
    ), '[]')
  )
    from public.profiles p
   where p.user_id = p_user
$$;

-- -----------------------------------------------------------------------------
-- Réserve : packs rechargés (10 max), réserve bonus (sans plafond), packs spéciaux
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
    'server_now', now()
  )
$$;

/**
 * Ouvre un pack : d'abord un pack spécial (Épique garantie), puis la réserve qui se
 * recharge, puis la réserve bonus. Les cartes obtenues font avancer les quêtes.
 */
create or replace function public.open_pack()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  p public.profiles;
  n int := public._game_setting('cards_per_pack');
  source text;
  rarities public.card_rarity[] := '{}';
  r public.card_rarity;
  v_card text;
  v_card_ids text[] := '{}';
  result json[] := '{}';
  is_new boolean;
  lucky boolean;
begin
  if uid is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  p := public._load_profile(uid);
  source := case
    when p.special_packs > 0 then 'special'
    when p.packs_banked > 0 then 'regular'
    when p.bonus_packs > 0 then 'bonus'
  end;
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

  foreach r in array rarities loop
    select c.id into v_card from public.cards c where c.rarity = r order by random() limit 1;
    if v_card is null then
      raise exception 'Catalogue vide pour la rareté %', r;
    end if;

    insert into public.user_cards as uc (user_id, card_id)
    values (uid, v_card)
    on conflict (user_id, card_id) do update set count = uc.count + 1
    returning (uc.count = 1) into is_new;

    v_card_ids := v_card_ids || v_card;
    result := result || json_build_object('id', v_card, 'rarity', r, 'is_new', is_new);
    perform public._quest_progress(uid, 'card', 1, v_card, is_new);
  end loop;
  perform public._quest_progress(uid, 'open', 1);

  update public.profiles
     set packs_banked = packs_banked - (source = 'regular')::int,
         bonus_packs = bonus_packs - (source = 'bonus')::int,
         special_packs = special_packs - (source = 'special')::int,
         packs_opened = packs_opened + 1,
         pity = case when lucky then 0 else pity + 1 end
   where user_id = uid
  returning * into p;

  insert into public.pack_openings (user_id, card_ids) values (uid, v_card_ids);

  return json_build_object('cards', array_to_json(result), 'source', source, 'status', public._status_json(p));
end;
$$;

-- -----------------------------------------------------------------------------
-- Atelier : les fonctions existantes deviennent des fonctions internes, enveloppées
-- par des versions qui font avancer les quêtes puis renvoient l'état à jour.
-- -----------------------------------------------------------------------------
alter function public.recycle_card(text, int) rename to _recycle_card_base;
alter function public.recycle_duplicates(int, public.card_rarity[]) rename to _recycle_duplicates_base;
alter function public.craft_card(text) rename to _craft_card_base;
alter function public.trade_up(public.card_rarity) rename to _trade_up_base;
alter function public.upgrade_card(text) rename to _upgrade_card_base;

/** Remplace l'état de la réponse par l'état après la progression des quêtes */
create or replace function public._with_status(p_res json, p_user uuid)
returns json
language sql
security definer
set search_path = ''
as $$
  select (p_res::jsonb || jsonb_build_object('status', public._status_json(p)))::json
    from public.profiles p
   where p.user_id = p_user
$$;

create function public.recycle_card(p_card text, p_qty int default 1)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  res json := public._recycle_card_base(p_card, p_qty);
begin
  perform public._quest_progress(auth.uid(), 'recycle', p_qty);
  return public._with_status(res, auth.uid());
end;
$$;

create function public.recycle_duplicates(p_keep int default 1, p_rarities public.card_rarity[] default null)
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
     and (p_rarities is null or c.rarity = any (p_rarities));
  res := public._recycle_duplicates_base(p_keep, p_rarities);
  perform public._quest_progress(uid, 'recycle', recycled);
  return public._with_status(res, uid);
end;
$$;

create function public.craft_card(p_card text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  res json := public._craft_card_base(p_card);
begin
  perform public._quest_progress(auth.uid(), 'craft', 1);
  perform public._quest_progress(auth.uid(), 'card', 1, p_card, true);
  return public._with_status(res, auth.uid());
end;
$$;

create function public.trade_up(p_rarity public.card_rarity)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  res json := public._trade_up_base(p_rarity);
begin
  perform public._quest_progress(auth.uid(), 'trade_up', 1);
  perform public._quest_progress(auth.uid(), 'card', 1, res -> 'card' ->> 'id', (res -> 'card' ->> 'is_new')::boolean);
  return public._with_status(res, auth.uid());
end;
$$;

create function public.upgrade_card(p_card text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  res json := public._upgrade_card_base(p_card);
begin
  perform public._quest_progress(auth.uid(), 'upgrade', 1);
  return res;
end;
$$;

-- -----------------------------------------------------------------------------
-- API des quêtes
-- -----------------------------------------------------------------------------

/** Quêtes du jour (tirées à la première demande) et état de la réserve */
create or replace function public.my_quests()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles := public._load_profile(uid);
begin
  perform public._ensure_quests(uid);
  return (public._quests_json(uid)::jsonb || jsonb_build_object('status', public._status_json(p)))::json;
end;
$$;

/**
 * Récupère la récompense d'une quête terminée. Quand les 4 sont récupérées : 1 pack bonus,
 * un jour de série en plus, et un pack spécial au 7e jour.
 */
create or replace function public.claim_quest(p_slot int)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles := public._load_profile(uid);
  q record;
  new_streak int;
  bonus json := null;
begin
  perform public._ensure_quests(uid);
  select uq.progress, uq.target, uq.claimed_at, d.coins, d.packs into q
    from public.user_quests uq
    join public._quest_pool() d on d.id = uq.quest_id
   where uq.user_id = uid and uq.day = current_date and uq.slot = p_slot;

  if not found then
    raise exception 'Quête inconnue' using errcode = 'P0001', hint = 'QUEST_UNKNOWN';
  end if;
  if q.claimed_at is not null then
    raise exception 'Récompense déjà récupérée' using errcode = 'P0001', hint = 'QUEST_CLAIMED';
  end if;
  if q.progress < q.target then
    raise exception 'Quête pas encore terminée' using errcode = 'P0001', hint = 'QUEST_INCOMPLETE';
  end if;

  update public.user_quests set claimed_at = now()
   where user_id = uid and day = current_date and slot = p_slot;
  update public.profiles
     set coins = coins + q.coins, bonus_packs = bonus_packs + q.packs
   where user_id = uid
  returning * into p;

  -- Les 4 quêtes du jour récupérées
  if p.streak_day is distinct from current_date
     and (select count(*) from public.user_quests
           where user_id = uid and day = current_date and claimed_at is not null) = 4 then
    new_streak := public._current_streak(p) + 1;
    update public.profiles
       set bonus_packs = bonus_packs + 1,
           special_packs = special_packs + (new_streak = 7)::int,
           streak = new_streak,
           streak_day = current_date
     where user_id = uid
    returning * into p;
    bonus := json_build_object('packs', 1, 'streak', new_streak, 'special', new_streak = 7);
  end if;

  return (public._quests_json(uid)::jsonb || jsonb_build_object(
    'reward', json_build_object('coins', q.coins, 'packs', q.packs),
    'bonus', bonus,
    'status', public._status_json(p)
  ))::json;
end;
$$;

/** Remplace une quête non récupérée par une autre de même difficulté (1 fois par jour) */
create or replace function public.reroll_quest(p_slot int)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles := public._load_profile(uid);
  cur record;
  v_id text;
  d record;
begin
  perform public._ensure_quests(uid);
  if p.quest_rerolled_day = current_date then
    raise exception 'Relance déjà utilisée aujourd''hui' using errcode = 'P0001', hint = 'REROLL_USED';
  end if;
  select uq.claimed_at, pool.tier into cur
    from public.user_quests uq
    join public._quest_pool() pool on pool.id = uq.quest_id
   where uq.user_id = uid and uq.day = current_date and uq.slot = p_slot;
  if not found then
    raise exception 'Quête inconnue' using errcode = 'P0001', hint = 'QUEST_UNKNOWN';
  end if;
  if cur.claimed_at is not null then
    raise exception 'Récompense déjà récupérée' using errcode = 'P0001', hint = 'QUEST_CLAIMED';
  end if;

  v_id := public._pick_quest(cur.tier, array(
    select quest_id from public.user_quests where user_id = uid and day = current_date
  ));
  select * into d from public._quest_pool() q where q.id = v_id;
  update public.user_quests
     set quest_id = v_id, param = public._quest_param(uid, d.kind, d.param), target = d.target, progress = 0
   where user_id = uid and day = current_date and slot = p_slot;
  update public.profiles set quest_rerolled_day = current_date where user_id = uid;

  return public.my_quests();
end;
$$;

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function public._quest_pool(), public._quest_param(uuid, text, text),
  public._pick_quest(smallint, text[]), public._ensure_quests(uuid),
  public._quest_progress(uuid, text, integer, text, boolean), public._current_streak(public.profiles),
  public._quests_json(uuid), public._with_status(json, uuid),
  public._recycle_card_base(text, int), public._recycle_duplicates_base(int, public.card_rarity[]),
  public._craft_card_base(text), public._trade_up_base(public.card_rarity), public._upgrade_card_base(text)
  from public, anon, authenticated;

revoke execute on function public.recycle_card(text, int), public.recycle_duplicates(int, public.card_rarity[]),
  public.craft_card(text), public.trade_up(public.card_rarity), public.upgrade_card(text),
  public.my_quests(), public.claim_quest(int), public.reroll_quest(int)
  from public, anon;
grant execute on function public.recycle_card(text, int), public.recycle_duplicates(int, public.card_rarity[]),
  public.craft_card(text), public.trade_up(public.card_rarity), public.upgrade_card(text),
  public.my_quests(), public.claim_quest(int), public.reroll_quest(int)
  to authenticated;
