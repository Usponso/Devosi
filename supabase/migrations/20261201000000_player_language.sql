-- Langue du joueur (français ou anglais) : les notifications push sont écrites dans sa langue.
--  - profiles.lang, mise à jour par l'app (set_lang) quand le joueur change de langue
--  - races.name_en : nom anglais du Grand Prix (« Monaco GP »), envoyé par la synchro des courses
-- Les textes français des notifications ne changent pas.

alter table public.profiles
  add column lang text not null default 'fr' check (lang in ('fr', 'en'));

alter table public.races add column name_en text;

/** Langue de l'app d'un joueur */
create or replace function public.set_lang(p_lang text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_lang not in ('fr', 'en') then
    raise exception 'Langue inconnue' using errcode = 'P0001', hint = 'LANG_INVALID';
  end if;
  update public.profiles set lang = p_lang where user_id = public._require_user();
end;
$$;

/** Texte d'un joueur dans sa langue */
create or replace function public._tr(p_user uuid, p_fr text, p_en text)
returns text
language sql
stable
set search_path = ''
as $$
  select case when (select lang from public.profiles where user_id = p_user) = 'en' then p_en else p_fr end
$$;

/** « 1 carte » / « 3 cartes » */
create or replace function public._plural(p_n integer, p_one text, p_many text)
returns text
language sql
immutable
set search_path = ''
as $$
  select p_n || ' ' || case when p_n > 1 then p_many else p_one end
$$;

-- -----------------------------------------------------------------------------
-- Synchro des courses : nom anglais en plus
-- -----------------------------------------------------------------------------
alter function public.sync_races(jsonb) rename to _sync_races_fantasy;

create function public.sync_races(p_races jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._sync_races_fantasy(p_races);
  update public.races r
     set name_en = x.name_en
    from jsonb_to_recordset(p_races) as x (season smallint, round smallint, name_en text)
   where r.season = x.season and r.round = x.round and x.name_en is not null;
end;
$$;

revoke execute on function public._sync_races_fantasy(jsonb) from public, anon, authenticated;
revoke execute on function public.sync_races(jsonb) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Notifications immédiates : échanges et amis
-- -----------------------------------------------------------------------------
create or replace function public._notify_trade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  n_give int := cardinality(new.give);
  n_take int := cardinality(new.take);
begin
  if tg_op = 'INSERT' then
    select username into v_name from public.profiles where user_id = new.from_user;
    perform public._notify(new.to_user, 'social',
      public._tr(new.to_user, v_name || ' te propose un échange', v_name || ' offers you a trade'),
      public._tr(new.to_user,
        public._plural(n_give, 'carte', 'cartes') || ' contre ' || n_take || ' des tiennes. Réponds dans les 48 h.',
        public._plural(n_give, 'card', 'cards') || ' for ' || n_take || ' of yours. Reply within 48 h.'),
      '/echanges', 'trade:' || new.id);
  elsif new.status = 'accepted' and old.status = 'pending' then
    select username into v_name from public.profiles where user_id = new.to_user;
    perform public._notify(new.from_user, 'social',
      public._tr(new.from_user, v_name || ' a accepté ton échange', v_name || ' accepted your trade'),
      public._tr(new.from_user, 'Tes nouvelles cartes sont dans ta collection.', 'Your new cards are in your collection.'),
      '/collection', 'trade-ok:' || new.id);
  end if;
  perform public._kick_push();
  return null;
end;
$$;

create or replace function public._notify_friend()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if new.accepted_at is null then
    select username into v_name from public.profiles where user_id = new.requester;
    perform public._notify(new.addressee, 'social',
      public._tr(new.addressee, v_name || ' veut être ton ami', v_name || ' wants to be your friend'),
      public._tr(new.addressee,
        'Accepte sa demande pour échanger des cartes et comparer vos pronostics.',
        'Accept the request to trade cards and compare your predictions.'),
      '/joueurs?onglet=amis', 'friend:' || new.requester || ':' || new.addressee);
    perform public._kick_push();
  end if;
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- Rappels planifiés
-- -----------------------------------------------------------------------------
create or replace function public._queue_scheduled_base()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  paris timestamp := now() at time zone 'Europe/Paris';
  max_packs int := public._game_setting('max_packs');
  refill interval := make_interval(mins => public._game_setting('refill_minutes'));
  r public.races;
begin
  -- Réserve pleine (une fois par remplissage : la clé change à chaque pack ouvert)
  perform public._notify(p.user_id, 'packs',
            case when p.lang = 'en' then 'Your pack stock is full' else 'Ta réserve est pleine' end,
            case when p.lang = 'en' then max_packs || ' packs are waiting: open them to receive more.'
                 else max_packs || ' packs t''attendent : ouvre-les pour en recevoir d''autres.' end,
            '/packs', 'bank:' || p.user_id || ':' || p.packs_opened)
     from public.profiles p
    where exists (select 1 from public.push_subscriptions s where s.user_id = p.user_id)
      and p.packs_banked + floor(extract(epoch from now() - p.last_refill_at) / extract(epoch from refill)) >= max_packs;

  -- Pronostics qui ferment dans l'heure (joueurs qui n'ont pas encore pronostiqué)
  for r in select * from public.races where quali_at > now() and quali_at <= now() + interval '70 minutes' loop
    perform public._notify(s.user_id, 'predictions',
              public._tr(s.user_id, 'Pronostics · ' || r.name, 'Predictions · ' || coalesce(r.name_en, r.name)),
              public._tr(s.user_id, 'Fermeture dans 1 h : qui sera sur le podium ?', 'Closing in 1 h: who will be on the podium?'),
              '/pronostics', 'pred-close:' || r.season || '-' || r.round || ':' || s.user_id)
       from (select distinct user_id from public.push_subscriptions) s
      where not exists (select 1 from public.predictions pr
                         where pr.user_id = s.user_id and pr.season = r.season and pr.round = r.round);
  end loop;

  -- Résultats des pronostics : gains à récupérer
  perform public._notify(pr.user_id, 'predictions',
            public._tr(pr.user_id, 'Résultats · ' || ra.name, 'Results · ' || coalesce(ra.name_en, ra.name)),
            public._tr(pr.user_id,
              'Tu as marqué ' || public._plural(pr.points, 'point', 'points') || ' : viens récupérer tes gains.',
              'You scored ' || public._plural(pr.points, 'point', 'points') || ': come and claim your winnings.'),
            '/pronostics', 'pred-res:' || pr.season || '-' || pr.round || ':' || pr.user_id)
     from public.predictions pr
     join public.races ra using (season, round)
    where pr.points is not null and pr.claimed_at is null and ra.scored_at > now() - interval '1 day';

  -- Pack GP du week-end disponible
  for r in select * from public.races where weekend_start <= now() and weekend_start > now() - interval '6 hours' loop
    perform public._notify(s.user_id, 'packs',
              public._tr(s.user_id, 'Pack ' || r.name || ' disponible', coalesce(r.name_en, r.name) || ' pack available'),
              public._tr(s.user_id, 'Ton pack GP du jour est offert, avec 2 cartes liées au circuit.',
                'Your daily GP pack is free, with 2 cards tied to the circuit.'),
              '/packs', 'gp:' || r.season || '-' || r.round || ':' || s.user_id)
       from (select distinct user_id from public.push_subscriptions) s;
  end loop;

  -- Série de quêtes en danger (à partir de 20 h, heure de Paris)
  if extract(hour from paris) between 20 and 21 then
    perform public._notify(p.user_id, 'quests',
              case when p.lang = 'en' then 'Your ' || p.streak || '-day streak is at risk'
                   else 'Ta série de ' || public._plural(p.streak, 'jour', 'jours') || ' est en danger' end,
              case when p.lang = 'en' then 'Finish your 4 quests before midnight to keep it.'
                   else 'Termine tes 4 quêtes avant minuit pour la garder.' end,
              '/quetes', 'streak:' || current_date || ':' || p.user_id)
       from public.profiles p
      where exists (select 1 from public.push_subscriptions s where s.user_id = p.user_id)
        and p.streak > 0 and p.streak_day = current_date - 1;
  end if;
end;
$$;

-- Rappel du soir : série de connexion en jeu (19 h, heure de Paris)
create or replace function public.queue_scheduled_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._queue_scheduled_base();
  if extract(hour from now() at time zone 'Europe/Paris') = 19 then
    perform public._notify(p.user_id, 'packs',
              case when p.lang = 'en' then 'Your ' || public._login_streak(p) || '-day streak is on the line'
                   else 'Ta série de ' || public._plural(public._login_streak(p), 'jour', 'jours') || ' est en jeu' end,
              case when p.lang = 'en' then 'Come and claim today''s reward before midnight.'
                   else 'Passe récupérer ta récompense du jour avant minuit.' end,
              '/packs', 'login:' || current_date || ':' || p.user_id)
       from public.profiles p
      where exists (select 1 from public.push_subscriptions s where s.user_id = p.user_id)
        and p.login_day = current_date - 1
        and p.login_streak > 1;
  end if;
end;
$$;

/** Notification de test sur mes appareils */
create or replace function public.send_test_notification()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
begin
  if not exists (select 1 from public.push_subscriptions where user_id = uid) then
    raise exception 'Aucun appareil abonné' using errcode = 'P0001', hint = 'PUSH_NO_DEVICE';
  end if;
  perform public._notify(uid, 'test', 'Devosi',
    public._tr(uid, 'Les notifications fonctionnent sur cet appareil.', 'Notifications are working on this device.'),
    '/packs', 'test:' || uid || ':' || extract(epoch from now())::bigint);
  perform public._kick_push();
  return public.my_notifications();
end;
$$;

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function public._tr(uuid, text, text) from public, anon, authenticated;
revoke execute on function public._plural(integer, text, text) from public, anon, authenticated;
revoke execute on function public._queue_scheduled_base() from public, anon, authenticated;
revoke execute on function public.set_lang(text) from public, anon;
grant execute on function public.set_lang(text) to authenticated;
