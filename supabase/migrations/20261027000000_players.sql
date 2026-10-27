-- =============================================================================
-- Joueurs : pseudo public, vitrine de 5 cartes, classement et recherche.
-- Seuls les comptes reliés à un email (non anonymes) et dotés d'un pseudo sont publics.
-- =============================================================================

create extension if not exists citext with schema extensions;

alter table public.profiles
  add column username extensions.citext unique
    check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  add column showcase text[] not null default '{}'
    check (cardinality(showcase) <= 5);

/** Poids d'une rareté dans le score (cartes distinctes) */
create or replace function public._rarity_points(r public.card_rarity)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case r
    when 'common' then 1
    when 'rare' then 3
    when 'epic' then 10
    when 'legendary' then 25
    when 'mythic' then 100
  end
$$;

/** Le compte courant est-il permanent (relié à un email) ? */
create or replace function public._is_permanent()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

/** Statistiques publiques de tous les joueurs ayant un pseudo, avec leur rang */
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
           coalesce(sum(public._rarity_points(c.rarity)), 0) as score,
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

-- -----------------------------------------------------------------------------
-- API du joueur connecté
-- -----------------------------------------------------------------------------

/** Mon profil : pseudo, vitrine, type de compte */
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
    'permanent', public._is_permanent()
  );
end;
$$;

/** Choisir ou changer son pseudo (comptes reliés à un email uniquement) */
create or replace function public.set_username(p_username text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public._is_permanent() then
    raise exception 'Relie ta collection à un email pour choisir un pseudo'
      using errcode = 'P0001', hint = 'ACCOUNT_REQUIRED';
  end if;
  if p_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Pseudo invalide : 3 à 20 lettres, chiffres ou _'
      using errcode = 'P0001', hint = 'USERNAME_INVALID';
  end if;

  perform public._load_profile(auth.uid());
  begin
    update public.profiles set username = p_username where user_id = auth.uid();
  exception when unique_violation then
    raise exception 'Ce pseudo est déjà pris' using errcode = 'P0001', hint = 'USERNAME_TAKEN';
  end;
  return public.my_profile();
end;
$$;

/** Définir sa vitrine : jusqu'à 5 cartes distinctes, toutes possédées */
create or replace function public.set_showcase(p_cards text[])
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  cards text[] := coalesce(p_cards, '{}');
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;
  if cardinality(cards) > 5 then
    raise exception '5 cartes maximum dans la vitrine' using errcode = 'P0001', hint = 'SHOWCASE_FULL';
  end if;
  if (select count(distinct x) from unnest(cards) x) <> cardinality(cards) then
    raise exception 'Carte en double dans la vitrine' using errcode = 'P0001', hint = 'SHOWCASE_DUPLICATE';
  end if;
  if exists (
    select 1 from unnest(cards) x
     where not exists (select 1 from public.user_cards uc where uc.user_id = auth.uid() and uc.card_id = x)
  ) then
    raise exception 'Tu ne possèdes pas toutes ces cartes' using errcode = 'P0001', hint = 'SHOWCASE_NOT_OWNED';
  end if;

  perform public._load_profile(auth.uid());
  update public.profiles set showcase = cards where user_id = auth.uid();
  return public.my_profile();
end;
$$;

-- -----------------------------------------------------------------------------
-- API publique (accessible sans compte)
-- -----------------------------------------------------------------------------

/** Classement, avec recherche facultative par pseudo (préfixe, insensible à la casse) */
create or replace function public.leaderboard(p_query text default null, p_limit int default 50, p_offset int default 0)
returns table (rank bigint, username text, owned bigint, score bigint, showcase text[])
language sql
stable
security definer
set search_path = ''
as $$
  select r.rank, r.username, r.owned, r.score, r.showcase
    from public._ranked_players() r
   where p_query is null or p_query = ''
      or r.username ilike replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') || '%'
   order by r.rank, r.username
   limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0)
$$;

/** Profil public d'un joueur : vitrine, statistiques et répartition par rareté */
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

revoke execute on function public._rarity_points(public.card_rarity), public._is_permanent(),
  public._ranked_players() from public, anon, authenticated;
revoke execute on function public.my_profile(), public.set_username(text), public.set_showcase(text[]),
  public.leaderboard(text, int, int), public.get_player(text) from public;
grant execute on function public.my_profile(), public.set_username(text), public.set_showcase(text[]) to authenticated;
grant execute on function public.leaderboard(text, int, int), public.get_player(text) to anon, authenticated;
