-- =============================================================================
-- Bandeau « En direct » : les tirages marquants de tous les joueurs (Légendaire et
-- Mythique, éditions vainqueur, affiches, Chefs-d'œuvre) des dernières 24 h.
--  - Un déclencheur sur user_cards enregistre chaque carte marquante obtenue, quelle que
--    soit sa provenance (pack, carte mystère, Atelier, échange, pronostic…).
--  - Seuls les joueurs avec un pseudo apparaissent, et chacun peut s'en retirer
--    (profiles.show_in_ticker) : le filtre s'applique à la lecture, y compris au passé.
-- =============================================================================

alter table public.profiles add column show_in_ticker boolean not null default true;

create table public.ticker_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null references public.cards (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index ticker_events_created_idx on public.ticker_events (created_at desc);

alter table public.ticker_events enable row level security;
revoke all on public.ticker_events from anon, authenticated;

/** Enregistre une carte marquante obtenue (nouvel exemplaire, quelle que soit la source) */
create or replace function public._ticker_capture()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.count <= old.count then
    return new;
  end if;
  if exists (
    select 1 from public.cards c
     where c.id = new.card_id
       and (c.rarity in ('legendary', 'mythic') or c.edition_of is not null or c.type in ('poster', 'masterpiece'))
  ) then
    insert into public.ticker_events (user_id, card_id) values (new.user_id, new.card_id);
    -- Rétention : on ne garde que 2 jours
    delete from public.ticker_events where created_at < now() - interval '2 days';
  end if;
  return new;
end;
$$;

create trigger user_cards_ticker
  after insert or update of count on public.user_cards
  for each row execute function public._ticker_capture();

/** Tirages marquants des dernières 24 h (20 au maximum), pour tous, même sans compte */
create or replace function public.live_ticker()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(row_to_json(t) order by t.at desc), '[]')
    from (
      select p.username::text as username, e.card_id as card, e.created_at as at
        from public.ticker_events e
        join public.profiles p on p.user_id = e.user_id
       where e.created_at > now() - interval '24 hours'
         and p.username is not null
         and p.show_in_ticker
       order by e.created_at desc
       limit 20
    ) t
$$;

/** Apparaître ou non dans le bandeau « En direct » */
create or replace function public.set_show_in_ticker(p_show boolean)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
begin
  perform public._load_profile(uid);
  update public.profiles set show_in_ticker = p_show where user_id = uid;
  return public.my_profile();
end;
$$;

/** Profil du joueur connecté (ajout du réglage du bandeau) */
create or replace function public.my_profile()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;
  p := public._load_profile(auth.uid());
  return json_build_object(
    'username', p.username,
    'showcase', p.showcase,
    'avatar', p.avatar_card,
    'title', p.title,
    'team', p.team,
    'badges', p.badges,
    'completion', public._profile_completion(p),
    'permanent', public._is_permanent(),
    'requests', (select count(*) from public.friendships where addressee = p.user_id and accepted_at is null),
    'show_in_ticker', p.show_in_ticker
  );
end;
$$;

revoke execute on function public._ticker_capture() from public, anon, authenticated;
revoke execute on function public.live_ticker(), public.set_show_in_ticker(boolean) from public;
grant execute on function public.live_ticker() to anon, authenticated;
revoke execute on function public.set_show_in_ticker(boolean) from anon;
grant execute on function public.set_show_in_ticker(boolean) to authenticated;
