-- =============================================================================
-- Échanges : 3 au maximum avec un même ami sur 7 jours glissants (dans les deux sens),
-- en plus de la limite de 5 par jour. Freine les transferts d'un second compte vers le
-- compte principal.
-- =============================================================================

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
    -- Échanges acceptés avec un même ami sur 7 jours glissants
    when 'pair_weekly' then 3
  end
$$;

/** Échanges acceptés entre deux joueurs sur les 7 derniers jours */
create or replace function public._pair_trades(p_a uuid, p_b uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.trades
   where status = 'accepted' and resolved_at > now() - interval '7 days'
     and ((from_user = p_a and to_user = p_b) or (from_user = p_b and to_user = p_a))
$$;

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
  if public._pair_trades(uid, other) >= public._trade_setting('pair_weekly') then
    raise exception 'Limite d''échanges avec cet ami atteinte' using errcode = 'P0001', hint = 'TRADE_PAIR_LIMIT';
  end if;
  if (select count(*) from public.trades where from_user = uid and status = 'pending') >= public._trade_setting('max_pending') then
    raise exception 'Trop de propositions en attente' using errcode = 'P0001', hint = 'TRADE_PENDING_LIMIT';
  end if;
  if not public._trade_cards_ok(uid, p_give) or not public._trade_cards_ok(other, p_take) then
    raise exception 'Cartes invalides pour un échange' using errcode = 'P0001', hint = 'TRADE_INVALID';
  end if;
  if not public._trade_balanced(p_give, p_take) then
    raise exception 'Échange trop déséquilibré' using errcode = 'P0001', hint = 'TRADE_UNBALANCED';
  end if;

  insert into public.trades (from_user, to_user, give, take) values (uid, other, p_give, p_take);
  return public.my_trades();
end;
$$;

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
  if public._pair_trades(uid, t.from_user) >= public._trade_setting('pair_weekly') then
    raise exception 'Limite d''échanges avec cet ami atteinte' using errcode = 'P0001', hint = 'TRADE_PAIR_LIMIT';
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
  -- Proposition faite avant la règle d'équilibre : clôturée si elle est trop déséquilibrée
  if not public._trade_balanced(t.give, t.take) then
    update public.trades set status = 'failed', resolved_at = now() where id = t.id;
    return (public.my_trades()::jsonb || jsonb_build_object('error', 'TRADE_UNBALANCED'))::json;
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

revoke execute on function public._pair_trades(uuid, uuid) from public, anon, authenticated;
