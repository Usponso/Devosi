-- =============================================================================
-- Doublons : recyclage en Pièces, boutique de packs, atelier de fabrication,
-- vitesse supérieure (5 doublons → 1 carte de la rareté supérieure) et finitions
-- Chrome / Or. Tout est calculé côté serveur ; le dernier exemplaire d'une carte
-- n'est jamais consommé.
-- Valeurs à garder synchronisées avec src/stores/collectionStore.js (RARITIES, FINISHES).
-- =============================================================================

alter table public.profiles
  add column coins integer not null default 0 check (coins >= 0),
  -- Packs achetés à la boutique ce jour-là (UTC)
  add column bought_today smallint not null default 0,
  add column bought_day date;

-- Finition débloquée : 0 standard, 1 Chrome, 2 Or (définitive, même après recyclage)
alter table public.user_cards
  add column finish smallint not null default 0 check (finish between 0 and 2);

create or replace function public._game_setting(key text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case key
    when 'max_packs' then 10
    when 'refill_minutes' then 60
    when 'cards_per_pack' then 5
    when 'pity_limit' then 100
    when 'pack_price' then 150
    when 'daily_buys' then 3
    when 'trade_up_cost' then 5
    when 'chrome_copies' then 5
    when 'gold_copies' then 10
  end
$$;

/** Valeur d'une carte : `recycle` (Pièces gagnées) ou `craft` (Pièces dépensées) */
create or replace function public._card_value(r public.card_rarity, kind text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case r
    when 'common' then 5
    when 'rare' then 20
    when 'epic' then 100
    when 'legendary' then 400
    when 'mythic' then 2000
  end * case kind when 'craft' then 4 else 1 end
$$;

create or replace function public._status_json(p public.profiles)
returns json
language sql
stable
set search_path = ''
as $$
  select json_build_object(
    'available', p.packs_banked,
    'max', public._game_setting('max_packs'),
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
    'server_now', now()
  )
$$;

create or replace function public._require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;
  return auth.uid();
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. Recyclage
-- -----------------------------------------------------------------------------

/** Recycle `p_qty` exemplaires d'une carte (il en reste toujours au moins un) */
create or replace function public.recycle_card(p_card text, p_qty int default 1)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles;
  v_count int;
  v_rarity public.card_rarity;
  gained int;
begin
  p := public._load_profile(uid);
  select uc.count, c.rarity into v_count, v_rarity
    from public.user_cards uc
    join public.cards c on c.id = uc.card_id
   where uc.user_id = uid and uc.card_id = p_card
     for update of uc;

  if coalesce(p_qty, 0) < 1 or v_count is null or v_count - p_qty < 1 then
    raise exception 'Pas assez de doublons' using errcode = 'P0001', hint = 'NOT_ENOUGH_DUPLICATES';
  end if;

  update public.user_cards set count = count - p_qty where user_id = uid and card_id = p_card;
  gained := p_qty * public._card_value(v_rarity, 'recycle');
  update public.profiles set coins = coins + gained where user_id = uid returning * into p;

  return json_build_object(
    'gained', gained,
    'cards', json_build_array(json_build_object('id', p_card, 'count', v_count - p_qty)),
    'status', public._status_json(p)
  );
end;
$$;

/**
 * Recycle tous les doublons au-delà de `p_keep` exemplaires (1 au minimum),
 * éventuellement limités à certaines raretés.
 */
create or replace function public.recycle_duplicates(p_keep int default 1, p_rarities public.card_rarity[] default null)
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
     and (p_rarities is null or c.rarity = any (p_rarities));

  update public.user_cards uc
     set count = keep
    from public.cards c
   where c.id = uc.card_id and uc.user_id = uid and uc.count > keep
     and (p_rarities is null or c.rarity = any (p_rarities));

  update public.profiles set coins = coins + gained where user_id = uid returning * into p;
  return json_build_object('gained', gained, 'cards', changed, 'status', public._status_json(p));
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Boutique : un pack contre des Pièces (3 par jour)
-- -----------------------------------------------------------------------------
create or replace function public.buy_pack()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles;
  bought int;
  price int := public._game_setting('pack_price');
begin
  p := public._load_profile(uid);
  bought := case when p.bought_day = current_date then p.bought_today else 0 end;

  if bought >= public._game_setting('daily_buys') then
    raise exception 'Limite d''achats du jour atteinte' using errcode = 'P0001', hint = 'SHOP_LIMIT';
  end if;
  if p.packs_banked >= public._game_setting('max_packs') then
    raise exception 'Réserve de packs pleine' using errcode = 'P0001', hint = 'BANK_FULL';
  end if;
  if p.coins < price then
    raise exception 'Pas assez de Pièces' using errcode = 'P0001', hint = 'NOT_ENOUGH_COINS';
  end if;

  update public.profiles
     set coins = coins - price,
         packs_banked = packs_banked + 1,
         bought_today = bought + 1,
         bought_day = current_date
   where user_id = uid
  returning * into p;
  return json_build_object('status', public._status_json(p));
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Atelier : fabriquer une carte manquante
-- -----------------------------------------------------------------------------
create or replace function public.craft_card(p_card text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles;
  v_rarity public.card_rarity;
  cost int;
begin
  select rarity into v_rarity from public.cards where id = p_card;
  if v_rarity is null then
    raise exception 'Carte inconnue' using errcode = 'P0001', hint = 'CARD_UNKNOWN';
  end if;

  p := public._load_profile(uid);
  if exists (select 1 from public.user_cards where user_id = uid and card_id = p_card) then
    raise exception 'Carte déjà possédée' using errcode = 'P0001', hint = 'ALREADY_OWNED';
  end if;
  cost := public._card_value(v_rarity, 'craft');
  if p.coins < cost then
    raise exception 'Pas assez de Pièces' using errcode = 'P0001', hint = 'NOT_ENOUGH_COINS';
  end if;

  insert into public.user_cards (user_id, card_id) values (uid, p_card);
  update public.profiles set coins = coins - cost where user_id = uid returning * into p;
  return json_build_object(
    'card', json_build_object('id', p_card, 'rarity', v_rarity, 'is_new', true),
    'status', public._status_json(p)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Vitesse supérieure : 5 doublons d'une rareté → 1 carte de la rareté supérieure
-- -----------------------------------------------------------------------------
create or replace function public.trade_up(p_rarity public.card_rarity)
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

  select c.id into v_card from public.cards c where c.rarity = next_rarity order by random() limit 1;
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

-- -----------------------------------------------------------------------------
-- 5. Finitions : Chrome (5 exemplaires, 4 consommés) puis Or (10 exemplaires, 9 consommés)
-- -----------------------------------------------------------------------------
create or replace function public.upgrade_card(p_card text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  v_count int;
  v_finish int;
  need int;
begin
  perform public._load_profile(uid);
  select count, finish into v_count, v_finish
    from public.user_cards where user_id = uid and card_id = p_card for update;

  if v_finish is null then
    raise exception 'Carte non possédée' using errcode = 'P0001', hint = 'NOT_OWNED';
  end if;
  if v_finish >= 2 then
    raise exception 'Finition maximale' using errcode = 'P0001', hint = 'MAX_FINISH';
  end if;
  need := public._game_setting(case v_finish when 0 then 'chrome_copies' else 'gold_copies' end);
  if v_count < need then
    raise exception 'Pas assez d''exemplaires' using errcode = 'P0001', hint = 'NOT_ENOUGH_COPIES';
  end if;

  update public.user_cards
     set count = count - (need - 1), finish = finish + 1
   where user_id = uid and card_id = p_card;
  return json_build_object('id', p_card, 'count', v_count - (need - 1), 'finish', v_finish + 1);
end;
$$;

-- -----------------------------------------------------------------------------
-- Classement : une finition multiplie les points de la carte (Chrome ×2, Or ×3)
-- -----------------------------------------------------------------------------
create or replace function public._ranked_players()
returns table (
  user_id uuid,
  username text,
  owned bigint,
  score bigint,
  packs_opened integer,
  showcase text[],
  created_at timestamptz,
  rank bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with stats as (
    select p.user_id,
           p.username::text as username,
           count(uc.card_id) as owned,
           coalesce(sum(public._rarity_points(c.rarity) * (1 + uc.finish)), 0) as score,
           p.packs_opened,
           p.showcase,
           p.created_at
      from public.profiles p
      left join public.user_cards uc on uc.user_id = p.user_id
      left join public.cards c on c.id = uc.card_id
     where p.username is not null
     group by p.user_id
  )
  select s.*, rank() over (order by s.score desc, s.owned desc) as rank
    from stats s
$$;

/** Profil public : ajoute la finition des cartes de la vitrine */
create or replace function public.get_player(p_username text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'username', r.username,
    'rank', r.rank,
    'owned', r.owned,
    'total', (select count(*) from public.cards),
    'score', r.score,
    'packs_opened', r.packs_opened,
    'showcase', r.showcase,
    'finishes', (
      select coalesce(json_object_agg(uc.card_id, uc.finish), '{}')
        from public.user_cards uc
       where uc.user_id = r.user_id and uc.card_id = any (r.showcase) and uc.finish > 0
    ),
    'member_since', r.created_at,
    'players', (select count(*) from public.profiles where username is not null),
    'by_rarity', (
      select json_object_agg(c.rarity, n)
        from (
          select c.rarity, count(*) as n
            from public.user_cards uc
            join public.cards c on c.id = uc.card_id
           where uc.user_id = r.user_id
           group by c.rarity
        ) c
    )
  )
    from public._ranked_players() r
   where lower(r.username) = lower(p_username)
   limit 1
$$;

revoke execute on function public._card_value(public.card_rarity, text), public._require_user(),
  public._game_setting(text), public._status_json(public.profiles) from public, anon, authenticated;
revoke execute on function public.recycle_card(text, int), public.recycle_duplicates(int, public.card_rarity[]),
  public.buy_pack(), public.craft_card(text), public.trade_up(public.card_rarity), public.upgrade_card(text)
  from public, anon;
grant execute on function public.recycle_card(text, int), public.recycle_duplicates(int, public.card_rarity[]),
  public.buy_pack(), public.craft_card(text), public.trade_up(public.card_rarity), public.upgrade_card(text)
  to authenticated;
