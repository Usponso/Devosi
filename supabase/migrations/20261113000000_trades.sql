-- =============================================================================
-- Échanges de cartes entre amis.
--  - Réservés aux joueurs reliés à un email, dotés d'un pseudo, et amis entre eux.
--  - Une proposition : 1 à 5 cartes données contre 1 à 5 cartes demandées, sans Pièces.
--    Les éditions vainqueur ne s'échangent pas. Le dernier exemplaire peut s'échanger.
--  - L'ami accepte ou refuse dans les 48 h ; l'auteur peut annuler avant.
--  - À l'acceptation, le serveur vérifie que chacun possède toujours ses cartes, puis
--    échange tout d'un coup. La finition reste à son propriétaire (la carte reçue arrive
--    en standard) ; une carte qui n'est plus possédée quitte la vitrine et l'avatar.
--  - Limites : 10 propositions envoyées en attente, 5 échanges conclus par jour.
-- =============================================================================

create table public.trades (
  id bigint generated always as identity primary key,
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  -- Cartes données par l'auteur, cartes demandées à l'ami
  give text[] not null,
  take text[] not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired', 'failed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours',
  resolved_at timestamptz,
  check (from_user <> to_user),
  check (cardinality(give) between 1 and 5 and cardinality(take) between 1 and 5)
);
create index trades_to_idx on public.trades (to_user, status);
create index trades_from_idx on public.trades (from_user, status);

alter table public.trades enable row level security;
revoke all on public.trades from anon, authenticated;

/** Réglages des échanges */
create or replace function public._trade_setting(key text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case key
    when 'max_cards' then 5
    when 'max_pending' then 10
    when 'daily' then 5
  end
$$;

/** Propositions en attente arrivées à expiration */
create or replace function public._expire_trades(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.trades
     set status = 'expired', resolved_at = now()
   where status = 'pending' and expires_at <= now() and (from_user = p_user or to_user = p_user)
$$;

/** Les cartes sont valides pour un échange : distinctes, existantes, hors éditions, possédées */
create or replace function public._trade_cards_ok(p_user uuid, p_cards text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cardinality(p_cards) between 1 and public._trade_setting('max_cards')
     and cardinality(p_cards) = (select count(distinct x) from unnest(p_cards) x)
     and not exists (
       select 1 from unnest(p_cards) x
        where not exists (
          select 1 from public.user_cards uc
            join public.cards c on c.id = uc.card_id
           where uc.user_id = p_user and uc.card_id = x and c.edition_of is null
        )
     )
$$;

/** Échanges conclus aujourd'hui par un joueur */
create or replace function public._trades_today(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.trades
   where status = 'accepted' and resolved_at >= current_date::timestamptz
     and (from_user = p_user or to_user = p_user)
$$;

/** Une carte passe d'un joueur à l'autre (un exemplaire) */
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

  insert into public.user_cards as uc (user_id, card_id)
  values (p_to, p_card)
  on conflict (user_id, card_id) do update set count = uc.count + 1
  returning (uc.count = 1) into is_new;
  perform public._quest_progress(p_to, 'card', 1, p_card, is_new);
end;
$$;

-- -----------------------------------------------------------------------------
-- API
-- -----------------------------------------------------------------------------

/** Mes échanges : reçus et envoyés en attente, historique récent, limites */
create or replace function public.my_trades()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
begin
  perform public._expire_trades(uid);
  return json_build_object(
    'trades', coalesce((
      select json_agg(json_build_object(
               'id', t.id,
               'direction', case when t.from_user = uid then 'sent' else 'received' end,
               'other', o.username,
               'other_avatar', o.avatar_card,
               'other_team', o.team,
               'give', t.give,
               'take', t.take,
               'status', t.status,
               'created_at', t.created_at,
               'expires_at', t.expires_at,
               'resolved_at', t.resolved_at
             ) order by coalesce(t.resolved_at, t.created_at) desc)
        from (
          select * from public.trades
           where (from_user = uid or to_user = uid)
             and (status = 'pending' or resolved_at > now() - interval '30 days')
           order by coalesce(resolved_at, created_at) desc
           limit 60
        ) t
        join public.profiles o on o.user_id = case when t.from_user = uid then t.to_user else t.from_user end
    ), '[]'),
    'pending_sent', (select count(*) from public.trades where from_user = uid and status = 'pending'),
    'max_pending', public._trade_setting('max_pending'),
    'today', public._trades_today(uid),
    'daily', public._trade_setting('daily')
  );
end;
$$;

/** Cartes d'un ami (pour composer un échange) : [{ id, count }], hors éditions */
create or replace function public.friend_cards(p_username text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_player();
  other uuid := public._player_id(p_username);
begin
  if public._friend_status(uid, other) <> 'friends' then
    raise exception 'Échanges réservés aux amis' using errcode = 'P0001', hint = 'TRADE_FRIENDS_ONLY';
  end if;
  return (
    select coalesce(json_agg(json_build_object('id', uc.card_id, 'count', uc.count)), '[]')
      from public.user_cards uc
      join public.cards c on c.id = uc.card_id
     where uc.user_id = other and c.edition_of is null
  );
end;
$$;

/** Propose un échange à un ami */
create or replace function public.propose_trade(p_username text, p_give text[], p_take text[])
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_player();
  other uuid := public._player_id(p_username);
begin
  perform public._expire_trades(uid);
  if public._friend_status(uid, other) <> 'friends' then
    raise exception 'Échanges réservés aux amis' using errcode = 'P0001', hint = 'TRADE_FRIENDS_ONLY';
  end if;
  if (select count(*) from public.trades where from_user = uid and status = 'pending') >= public._trade_setting('max_pending') then
    raise exception 'Trop de propositions en attente' using errcode = 'P0001', hint = 'TRADE_PENDING_LIMIT';
  end if;
  if not public._trade_cards_ok(uid, p_give) or not public._trade_cards_ok(other, p_take) then
    raise exception 'Cartes invalides pour un échange' using errcode = 'P0001', hint = 'TRADE_INVALID';
  end if;

  insert into public.trades (from_user, to_user, give, take) values (uid, other, p_give, p_take);
  return public.my_trades();
end;
$$;

/**
 * Accepte ou refuse une proposition reçue. Si une carte n'est plus disponible, la
 * proposition est clôturée et la réponse contient `error` (TRADE_INVALID).
 */
create or replace function public.respond_trade(p_id bigint, p_accept boolean)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_player();
  t public.trades;
  v_card text;
begin
  perform public._expire_trades(uid);
  select * into t from public.trades where id = p_id and to_user = uid for update;
  if t.id is null or t.status <> 'pending' then
    raise exception 'Proposition introuvable ou expirée' using errcode = 'P0001', hint = 'TRADE_UNKNOWN';
  end if;

  if not p_accept then
    update public.trades set status = 'declined', resolved_at = now() where id = t.id;
    return public.my_trades();
  end if;

  if public._trades_today(uid) >= public._trade_setting('daily')
     or public._trades_today(t.from_user) >= public._trade_setting('daily') then
    raise exception 'Limite d''échanges du jour atteinte' using errcode = 'P0001', hint = 'TRADE_DAILY_LIMIT';
  end if;

  -- Les deux joueurs possèdent-ils toujours leurs cartes ?
  perform 1 from public.user_cards
   where (user_id = t.from_user and card_id = any (t.give)) or (user_id = uid and card_id = any (t.take))
   for update;
  -- Échange devenu impossible : clôturé (une erreur levée annulerait ce changement d'état)
  if not public._trade_cards_ok(t.from_user, t.give) or not public._trade_cards_ok(uid, t.take) then
    update public.trades set status = 'failed', resolved_at = now() where id = t.id;
    return (public.my_trades()::jsonb || jsonb_build_object('error', 'TRADE_INVALID'))::json;
  end if;

  perform public._load_profile(t.from_user);
  perform public._load_profile(uid);
  foreach v_card in array t.give loop
    perform public._move_card(t.from_user, uid, v_card);
  end loop;
  foreach v_card in array t.take loop
    perform public._move_card(uid, t.from_user, v_card);
  end loop;

  update public.trades set status = 'accepted', resolved_at = now() where id = t.id;
  return (public.my_trades()::jsonb || jsonb_build_object('received', t.give, 'given', t.take))::json;
end;
$$;

/** Annule une proposition envoyée, tant qu'elle est en attente */
create or replace function public.cancel_trade(p_id bigint)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
begin
  update public.trades set status = 'cancelled', resolved_at = now()
   where id = p_id and from_user = uid and status = 'pending';
  if not found then
    raise exception 'Proposition introuvable ou déjà traitée' using errcode = 'P0001', hint = 'TRADE_UNKNOWN';
  end if;
  return public.my_trades();
end;
$$;

-- État de la réserve : ajout des propositions d'échange reçues
alter function public._status_json(public.profiles) rename to _status_json_cards;

create function public._status_json(p public.profiles)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select (public._status_json_cards(p)::jsonb || jsonb_build_object(
    'trades_ready', (
      select count(*) from public.trades
       where to_user = p.user_id and status = 'pending' and expires_at > now()
    )
  ))::json
$$;

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function
  public._trade_setting(text),
  public._expire_trades(uuid),
  public._trade_cards_ok(uuid, text[]),
  public._trades_today(uuid),
  public._move_card(uuid, uuid, text),
  public._status_json(public.profiles),
  public._status_json_cards(public.profiles)
  from public, anon, authenticated;

revoke execute on function
  public.my_trades(),
  public.friend_cards(text),
  public.propose_trade(text, text[], text[]),
  public.respond_trade(bigint, boolean),
  public.cancel_trade(bigint)
  from public, anon;
grant execute on function
  public.my_trades(),
  public.friend_cards(text),
  public.propose_trade(text, text[], text[]),
  public.respond_trade(bigint, boolean),
  public.cancel_trade(bigint)
  to authenticated;
