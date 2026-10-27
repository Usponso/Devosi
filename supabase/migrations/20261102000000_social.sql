-- =============================================================================
-- Profil personnalisé et amis.
--  - Avatar : une carte possédée (sa photo, son cadre de rareté et sa finition)
--  - Titre : débloqué en complétant un album
--  - Écurie favorite affichée sur le profil public
--  - Amis : demande par pseudo puis acceptation ; classement entre amis
-- Les amis sont réservés aux comptes reliés à un email et dotés d'un pseudo.
-- =============================================================================

alter table public.profiles
  add column avatar_card text references public.cards (id) on delete set null,
  add column title text references public.albums (id) on delete set null,
  add column team text check (team ~ '^[a-z_]{2,30}$');

-- Une ligne par paire de joueurs : demande en attente (accepted_at null) ou amitié
create table public.friendships (
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester, addressee),
  check (requester <> addressee)
);
create unique index friendships_pair_idx on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index friendships_addressee_idx on public.friendships (addressee);

-- Accès uniquement via les fonctions ci-dessous
alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;

/** Réglages : demandes en attente et amis au maximum */
create or replace function public._social_limit(key text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case key
    when 'pending' then 50
    when 'friends' then 200
  end
$$;

/** Amis (demandes acceptées) d'un joueur */
create or replace function public._friend_ids(uid uuid)
returns setof uuid
language sql
stable
set search_path = ''
as $$
  select case when f.requester = uid then f.addressee else f.requester end
    from public.friendships f
   where (f.requester = uid or f.addressee = uid) and f.accepted_at is not null
$$;

/** Relation entre deux joueurs : self, friends, outgoing, incoming ou none */
create or replace function public._friend_status(me uuid, other uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when me is null or other is null then 'none'
    when me = other then 'self'
    else coalesce((
      select case
        when f.accepted_at is not null then 'friends'
        when f.requester = me then 'outgoing'
        else 'incoming'
      end
        from public.friendships f
       where (f.requester = me and f.addressee = other) or (f.requester = other and f.addressee = me)
    ), 'none')
  end
$$;

/** Joueur courant, obligatoirement relié à un email et doté d'un pseudo */
create or replace function public._require_player()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public._is_permanent()
     or not exists (select 1 from public.profiles where user_id = auth.uid() and username is not null) then
    raise exception 'Sauvegarde ta collection et choisis un pseudo pour ajouter des amis'
      using errcode = 'P0001', hint = 'PROFILE_REQUIRED';
  end if;
  return auth.uid();
end;
$$;

/** Identifiant d'un joueur public à partir de son pseudo */
create or replace function public._player_id(p_username text)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  uid uuid;
begin
  select user_id into uid from public.profiles where lower(username::text) = lower(p_username);
  if uid is null then
    raise exception 'Aucun joueur avec ce pseudo' using errcode = 'P0001', hint = 'PLAYER_UNKNOWN';
  end if;
  return uid;
end;
$$;

-- -----------------------------------------------------------------------------
-- Statistiques publiques : ajout de l'avatar, du titre et de l'écurie.
-- Le type de retour change : les fonctions qui en dépendent sont recréées.
-- -----------------------------------------------------------------------------

drop function public.leaderboard(text, int, int);
drop function public.get_player(text);
drop function public._ranked_players();

create function public._ranked_players()
returns table (
  user_id uuid,
  username text,
  owned bigint,
  score bigint,
  packs_opened integer,
  showcase text[],
  created_at timestamptz,
  avatar text,
  avatar_finish smallint,
  title text,
  team text,
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
           p.created_at,
           p.avatar_card as avatar,
           coalesce(max(uc.finish) filter (where uc.card_id = p.avatar_card), 0)::smallint as avatar_finish,
           p.title,
           p.team
      from public.profiles p
      left join public.user_cards uc on uc.user_id = p.user_id
      left join public.cards c on c.id = uc.card_id
     where p.username is not null
     group by p.user_id
  )
  select s.*, rank() over (order by s.score desc, s.owned desc) as rank
    from stats s
$$;

/** Classement général, ou entre amis (le joueur courant inclus) */
create function public.leaderboard(
  p_query text default null,
  p_limit int default 50,
  p_offset int default 0,
  p_friends boolean default false
)
returns table (
  rank bigint,
  username text,
  owned bigint,
  score bigint,
  showcase text[],
  avatar text,
  avatar_finish smallint,
  title text,
  team text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.rank, r.username, r.owned, r.score, r.showcase, r.avatar, r.avatar_finish, r.title, r.team
    from public._ranked_players() r
   where (p_query is null or p_query = ''
          or r.username ilike replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') || '%')
     and (not p_friends
          or r.user_id = auth.uid()
          or r.user_id in (select public._friend_ids(auth.uid())))
   order by r.rank, r.username
   limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0)
$$;

/** Profil public, avec la relation d'amitié vue par le joueur courant */
create function public.get_player(p_username text)
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
    'avatar', r.avatar,
    'avatar_finish', r.avatar_finish,
    'title', r.title,
    'team', r.team,
    'friendship', public._friend_status(auth.uid(), r.user_id),
    'friends', (select count(*) from public._friend_ids(r.user_id)),
    'finishes', (
      select coalesce(json_object_agg(uc.card_id, uc.finish), '{}')
        from public.user_cards uc
       where uc.user_id = r.user_id and uc.card_id = any (r.showcase) and uc.finish > 0
    ),
    'albums', (
      select coalesce(json_agg(ua.album_id order by ua.completed_at), '[]')
        from public.user_albums ua
       where ua.user_id = r.user_id
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

-- -----------------------------------------------------------------------------
-- Mon profil
-- -----------------------------------------------------------------------------

/** Mon profil : pseudo, vitrine, avatar, titre, écurie, demandes d'amis reçues */
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
    'permanent', public._is_permanent(),
    'requests', (select count(*) from public.friendships where addressee = p.user_id and accepted_at is null)
  );
end;
$$;

/** Avatar : une carte possédée, ou null pour revenir à l'initiale du pseudo */
create or replace function public.set_avatar(p_card text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
begin
  if p_card is not null
     and not exists (select 1 from public.user_cards where user_id = uid and card_id = p_card) then
    raise exception 'Tu ne possèdes pas cette carte' using errcode = 'P0001', hint = 'AVATAR_NOT_OWNED';
  end if;
  perform public._load_profile(uid);
  update public.profiles set avatar_card = p_card where user_id = uid;
  return public.my_profile();
end;
$$;

/** Titre : celui d'un album complété (récompense récupérée), ou null */
create or replace function public.set_title(p_album text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
begin
  if p_album is not null
     and not exists (select 1 from public.user_albums where user_id = uid and album_id = p_album) then
    raise exception 'Complète cet album pour débloquer son titre' using errcode = 'P0001', hint = 'TITLE_LOCKED';
  end if;
  perform public._load_profile(uid);
  update public.profiles set title = p_album where user_id = uid;
  return public.my_profile();
end;
$$;

/** Écurie favorite affichée sur le profil public, ou null */
create or replace function public.set_team(p_team text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
begin
  if p_team is not null and p_team !~ '^[a-z_]{2,30}$' then
    raise exception 'Écurie inconnue' using errcode = 'P0001', hint = 'TEAM_INVALID';
  end if;
  perform public._load_profile(uid);
  update public.profiles set team = p_team where user_id = uid;
  return public.my_profile();
end;
$$;

-- -----------------------------------------------------------------------------
-- Amis
-- -----------------------------------------------------------------------------

/** Mes amis et demandes en cours, avec leurs statistiques publiques */
create or replace function public.my_friends()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  with rel as (
    select case when f.requester = auth.uid() then f.addressee else f.requester end as other,
           case
             when f.accepted_at is not null then 'friends'
             when f.requester = auth.uid() then 'outgoing'
             else 'incoming'
           end as kind,
           coalesce(f.accepted_at, f.created_at) as since
      from public.friendships f
     where f.requester = auth.uid() or f.addressee = auth.uid()
  ),
  players as (
    select rel.kind, rel.since,
           json_build_object(
             'username', r.username, 'rank', r.rank, 'owned', r.owned, 'score', r.score,
             'avatar', r.avatar, 'avatar_finish', r.avatar_finish, 'title', r.title, 'team', r.team
           ) as player
      from rel
      join public._ranked_players() r on r.user_id = rel.other
  )
  select json_build_object(
    'friends', coalesce((select json_agg(player order by (player ->> 'score')::bigint desc) from players where kind = 'friends'), '[]'),
    'incoming', coalesce((select json_agg(player order by since desc) from players where kind = 'incoming'), '[]'),
    'outgoing', coalesce((select json_agg(player order by since desc) from players where kind = 'outgoing'), '[]')
  )
$$;

/** Envoie une demande d'ami ; accepte directement si l'autre joueur en avait envoyé une */
create or replace function public.send_friend_request(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := public._require_player();
  other uuid := public._player_id(p_username);
  status text;
begin
  -- Sérialise les opérations du joueur (comme pour les packs)
  perform public._load_profile(me);
  if other = me then
    raise exception 'Tu ne peux pas t''ajouter toi-même' using errcode = 'P0001', hint = 'FRIEND_SELF';
  end if;

  status := public._friend_status(me, other);
  if status = 'incoming' then
    update public.friendships set accepted_at = now() where requester = other and addressee = me;
    return 'friends';
  end if;
  if status <> 'none' then
    return status;
  end if;

  if (select count(*) from public.friendships where requester = me and accepted_at is null) >= public._social_limit('pending')
     or (select count(*) from public._friend_ids(me)) >= public._social_limit('friends') then
    raise exception 'Limite de demandes ou d''amis atteinte' using errcode = 'P0001', hint = 'FRIEND_LIMIT';
  end if;

  begin
    insert into public.friendships (requester, addressee) values (me, other);
  exception when unique_violation then
    -- Demande croisée envoyée au même instant
    return public._friend_status(me, other);
  end;
  return 'outgoing';
end;
$$;

/** Accepte ou refuse une demande reçue */
create or replace function public.respond_friend_request(p_username text, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := public._require_player();
  other uuid := public._player_id(p_username);
begin
  if not exists (
    select 1 from public.friendships where requester = other and addressee = me and accepted_at is null
  ) then
    raise exception 'Aucune demande de ce joueur' using errcode = 'P0001', hint = 'REQUEST_UNKNOWN';
  end if;

  if p_accept then
    update public.friendships set accepted_at = now() where requester = other and addressee = me;
    return 'friends';
  end if;
  delete from public.friendships where requester = other and addressee = me;
  return 'none';
end;
$$;

/** Retire un ami ou annule une demande envoyée */
create or replace function public.remove_friend(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := public._require_user();
  other uuid := public._player_id(p_username);
begin
  delete from public.friendships
   where (requester = me and addressee = other) or (requester = other and addressee = me);
  return 'none';
end;
$$;

revoke execute on function public._social_limit(text), public._friend_ids(uuid), public._friend_status(uuid, uuid),
  public._require_player(), public._player_id(text), public._ranked_players() from public, anon, authenticated;
revoke execute on function public.leaderboard(text, int, int, boolean), public.get_player(text) from public;
grant execute on function public.leaderboard(text, int, int, boolean), public.get_player(text) to anon, authenticated;
revoke execute on function public.set_avatar(text), public.set_title(text), public.set_team(text), public.my_friends(),
  public.send_friend_request(text), public.respond_friend_request(text, boolean), public.remove_friend(text)
  from public, anon;
grant execute on function public.set_avatar(text), public.set_title(text), public.set_team(text), public.my_friends(),
  public.send_friend_request(text), public.respond_friend_request(text, boolean), public.remove_friend(text)
  to authenticated;
