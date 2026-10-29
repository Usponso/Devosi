-- =============================================================================
-- Notifications push (Web Push).
--  - Chaque appareil s'abonne (push_subscriptions) ; chaque joueur choisit ses sujets
--    (profiles.notify_prefs) : packs, pronostics, quêtes, échanges et amis, heures calmes.
--  - Les notifications passent par une file (notifications) : déclencheurs immédiats
--    (échange proposé ou conclu, demande d'ami) et rappels planifiés (réserve pleine,
--    pronostics qui ferment, résultats, pack GP, série de quêtes en danger).
--  - La fonction Edge `send-push` vide la file : appelée toutes les 5 min par pg_cron et
--    dès qu'une notification immédiate arrive (pg_net). Heures calmes 22 h - 8 h (Paris),
--    3 rappels par jour au maximum (les échanges et amis ne comptent pas).
--
-- Mise en place (une fois, voir README) : secrets de la fonction (clés VAPID, secret
-- d'appel) et deux secrets Vault : push_url (adresse de la fonction) et push_secret.
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- packs, predictions, quests, social, test
  kind text not null,
  title text not null,
  body text not null,
  url text not null default '/',
  -- Une même notification n'est jamais mise deux fois dans la file
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  send_after timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped'))
);
create index notifications_pending_idx on public.notifications (send_after) where status = 'pending';

alter table public.profiles
  add column notify_prefs jsonb not null
    default '{"packs": true, "predictions": true, "quests": true, "social": true, "quiet": true}';

alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;
revoke all on public.push_subscriptions, public.notifications from anon, authenticated;

-- -----------------------------------------------------------------------------
-- File d'attente
-- -----------------------------------------------------------------------------

/** Appelle la fonction d'envoi (si les secrets Vault sont en place) */
create or replace function public._kick_push()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb
  );
end;
$$;

/**
 * Met une notification dans la file, si le joueur a un appareil abonné et le sujet activé.
 * `p_key` : identifiant unique (la même notification n'est jamais envoyée deux fois).
 */
create or replace function public._notify(
  p_user uuid, p_kind text, p_title text, p_body text, p_url text, p_key text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, title, body, url, dedupe_key)
  select p_user, p_kind, p_title, p_body, p_url, p_key
   where exists (select 1 from public.push_subscriptions s where s.user_id = p_user)
     and (p_kind = 'test' or coalesce((select (p.notify_prefs ->> p_kind)::boolean from public.profiles p where p.user_id = p_user), true))
  on conflict (dedupe_key) do nothing
$$;

-- Échanges et amis : envoi immédiat
create or replace function public._notify_trade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if tg_op = 'INSERT' then
    select username into v_name from public.profiles where user_id = new.from_user;
    perform public._notify(new.to_user, 'social', v_name || ' te propose un échange',
      cardinality(new.give) || ' carte' || case when cardinality(new.give) > 1 then 's' else '' end
        || ' contre ' || cardinality(new.take) || ' des tiennes. Réponds dans les 48 h.',
      '/echanges', 'trade:' || new.id);
  elsif new.status = 'accepted' and old.status = 'pending' then
    select username into v_name from public.profiles where user_id = new.to_user;
    perform public._notify(new.from_user, 'social', v_name || ' a accepté ton échange',
      'Tes nouvelles cartes sont dans ta collection.', '/collection', 'trade-ok:' || new.id);
  end if;
  perform public._kick_push();
  return null;
end;
$$;

create trigger trades_notify after insert or update of status on public.trades
  for each row execute function public._notify_trade();

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
    perform public._notify(new.addressee, 'social', v_name || ' veut être ton ami',
      'Accepte sa demande pour échanger des cartes et comparer vos pronostics.',
      '/joueurs?onglet=amis', 'friend:' || new.requester || ':' || new.addressee);
    perform public._kick_push();
  end if;
  return null;
end;
$$;

create trigger friendships_notify after insert on public.friendships
  for each row execute function public._notify_friend();

/** Rappels planifiés (appelée par la fonction d'envoi avant chaque passage) */
create or replace function public.queue_scheduled_notifications()
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
  perform public._notify(p.user_id, 'packs', 'Ta réserve est pleine',
            max_packs || ' packs t''attendent : ouvre-les pour en recevoir d''autres.',
            '/packs', 'bank:' || p.user_id || ':' || p.packs_opened)
     from public.profiles p
    where exists (select 1 from public.push_subscriptions s where s.user_id = p.user_id)
      and p.packs_banked + floor(extract(epoch from now() - p.last_refill_at) / extract(epoch from refill)) >= max_packs;

  -- Pronostics qui ferment dans l'heure (joueurs qui n'ont pas encore pronostiqué)
  for r in select * from public.races where quali_at > now() and quali_at <= now() + interval '70 minutes' loop
    perform public._notify(s.user_id, 'predictions', 'Pronostics · ' || r.name,
              'Fermeture dans 1 h : qui sera sur le podium ?', '/pronostics',
              'pred-close:' || r.season || '-' || r.round || ':' || s.user_id)
       from (select distinct user_id from public.push_subscriptions) s
      where not exists (select 1 from public.predictions pr
                         where pr.user_id = s.user_id and pr.season = r.season and pr.round = r.round);
  end loop;

  -- Résultats des pronostics : gains à récupérer
  perform public._notify(pr.user_id, 'predictions', 'Résultats · ' || ra.name,
            'Tu as marqué ' || pr.points || ' point' || case when pr.points > 1 then 's' else '' end
              || ' : viens récupérer tes gains.', '/pronostics',
            'pred-res:' || pr.season || '-' || pr.round || ':' || pr.user_id)
     from public.predictions pr
     join public.races ra using (season, round)
    where pr.points is not null and pr.claimed_at is null and ra.scored_at > now() - interval '1 day';

  -- Pack GP du week-end disponible
  for r in select * from public.races where weekend_start <= now() and weekend_start > now() - interval '6 hours' loop
    perform public._notify(s.user_id, 'packs', 'Pack ' || r.name || ' disponible',
              'Ton pack GP du jour est offert, avec 2 cartes liées au circuit.', '/packs',
              'gp:' || r.season || '-' || r.round || ':' || s.user_id)
       from (select distinct user_id from public.push_subscriptions) s;
  end loop;

  -- Série de quêtes en danger (à partir de 20 h, heure de Paris)
  if extract(hour from paris) between 20 and 21 then
    perform public._notify(p.user_id, 'quests', 'Ta série de ' || p.streak || ' jour' || case when p.streak > 1 then 's' else '' end || ' est en danger',
              'Termine tes 4 quêtes avant minuit pour la garder.', '/quetes',
              'streak:' || current_date || ':' || p.user_id)
       from public.profiles p
      where exists (select 1 from public.push_subscriptions s where s.user_id = p.user_id)
        and p.streak > 0 and p.streak_day = current_date - 1;
  end if;
end;
$$;

/**
 * Notifications à envoyer maintenant, avec les appareils de chaque joueur. Applique les
 * heures calmes (report à 8 h) et la limite de 3 rappels par jour ; les notifications
 * renvoyées sont marquées envoyées.
 */
create or replace function public.claim_notifications(p_limit int default 200)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  paris timestamp := now() at time zone 'Europe/Paris';
  quiet boolean := extract(hour from paris) >= 22 or extract(hour from paris) < 8;
  wake timestamptz := ((date_trunc('day', paris) + case when extract(hour from paris) >= 22 then interval '1 day' else interval '0' end
                        + interval '8 hours') at time zone 'Europe/Paris');
  day_start timestamptz := (date_trunc('day', paris) at time zone 'Europe/Paris');
  result json;
begin
  -- Heures calmes : reportées au réveil
  if quiet then
    update public.notifications n
       set send_after = wake
      from public.profiles p
     where n.status = 'pending' and n.send_after <= now() and n.kind <> 'test'
       and p.user_id = n.user_id and coalesce((p.notify_prefs ->> 'quiet')::boolean, true);
  end if;

  -- Au-delà de 3 rappels aujourd'hui : abandonnés (les échanges et amis passent toujours)
  update public.notifications n
     set status = 'skipped'
   where n.status = 'pending' and n.send_after <= now() and n.kind not in ('social', 'test')
     and (select count(*) from public.notifications x
           where x.user_id = n.user_id and x.status = 'sent' and x.kind not in ('social', 'test')
             and x.send_after >= day_start) >= 3;

  with picked as (
    update public.notifications n
       set status = 'sent'
     where n.id in (
       select id from public.notifications
        where status = 'pending' and send_after <= now()
        order by id
        limit p_limit
        for update skip locked
     )
    returning n.*
  )
  select coalesce(json_agg(json_build_object(
           'id', k.id, 'title', k.title, 'body', k.body, 'url', k.url, 'tag', k.kind,
           'subscriptions', (
             select coalesce(json_agg(json_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]')
               from public.push_subscriptions s where s.user_id = k.user_id
           )
         )), '[]')
    into result
    from picked k;
  return result;
end;
$$;

/** Appareils dont l'abonnement a expiré (réponse 404 / 410 du service push) */
create or replace function public.remove_push_subscriptions(p_endpoints text[])
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = any (p_endpoints)
$$;

-- -----------------------------------------------------------------------------
-- API des joueurs
-- -----------------------------------------------------------------------------

/** Réglages : { prefs, devices } */
create or replace function public.my_notifications()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles := public._load_profile(uid);
begin
  return json_build_object(
    'prefs', p.notify_prefs,
    'devices', (select count(*) from public.push_subscriptions where user_id = uid)
  );
end;
$$;

/** Abonne cet appareil (ou le rattache au joueur connecté) */
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
begin
  if p_endpoint !~ '^https://' or length(p_endpoint) > 2000 then
    raise exception 'Abonnement invalide' using errcode = 'P0001', hint = 'PUSH_INVALID';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, uid, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = uid, p256dh = excluded.p256dh, auth = excluded.auth;
  return public.my_notifications();
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
begin
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = uid;
  return public.my_notifications();
end;
$$;

/** Sujets activés : { packs, predictions, quests, social, quiet } */
create or replace function public.set_notify_prefs(p_prefs jsonb)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
begin
  perform public._load_profile(uid);
  update public.profiles
     set notify_prefs = notify_prefs || (
       select coalesce(jsonb_object_agg(k, to_jsonb((p_prefs ->> k)::boolean)), '{}')
         from jsonb_object_keys(p_prefs) k
        where k in ('packs', 'predictions', 'quests', 'social', 'quiet')
     )
   where user_id = uid;
  return public.my_notifications();
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
  perform public._notify(uid, 'test', 'Devosi', 'Les notifications fonctionnent sur cet appareil.', '/packs',
    'test:' || uid || ':' || extract(epoch from now())::bigint);
  perform public._kick_push();
  return public.my_notifications();
end;
$$;

-- Passage toutes les 5 minutes : rappels planifiés et envois
select cron.schedule('devosi-push', '*/5 * * * *', 'select public._kick_push()');

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function
  public._kick_push(),
  public._notify(uuid, text, text, text, text, text),
  public._notify_trade(),
  public._notify_friend(),
  public.queue_scheduled_notifications(),
  public.claim_notifications(int),
  public.remove_push_subscriptions(text[])
  from public, anon, authenticated;

-- La fonction d'envoi (rôle service_role) vide la file
grant execute on function
  public.queue_scheduled_notifications(),
  public.claim_notifications(int),
  public.remove_push_subscriptions(text[])
  to service_role;

revoke execute on function
  public.my_notifications(),
  public.save_push_subscription(text, text, text),
  public.delete_push_subscription(text),
  public.set_notify_prefs(jsonb),
  public.send_test_notification()
  from public, anon;
grant execute on function
  public.my_notifications(),
  public.save_push_subscription(text, text, text),
  public.delete_push_subscription(text),
  public.set_notify_prefs(jsonb),
  public.send_test_notification()
  to authenticated;
