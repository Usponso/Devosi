-- Style du titre choisi par le joueur parmi ceux débloqués par l'album du titre :
-- 0 normal, 1 argenté (Set Chrome récupéré), 2 lettres d'or (Master set Or récupéré).
-- null (par défaut) : le meilleur style débloqué, comme avant. Changer de titre remet null.

alter table public.profiles
  add column title_style smallint check (title_style in (0, 1, 2));

/** Choisir son titre : le style repart sur « le meilleur débloqué » */
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
  update public.profiles
     set title_style = case when title is distinct from p_album then null else title_style end,
         title = p_album
   where user_id = uid;
  return public.my_profile();
end;
$$;

/** Style du titre actuel (null : le meilleur débloqué) ; seulement un palier récupéré */
create or replace function public.set_title_style(p_style smallint)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles;
begin
  p := public._load_profile(uid);
  if p_style is not null and p_style not in (0, 1, 2) then
    raise exception 'Style inconnu' using errcode = 'P0001', hint = 'TITLE_STYLE_LOCKED';
  end if;
  if p.title is null and p_style is not null then
    raise exception 'Choisis d''abord un titre' using errcode = 'P0001', hint = 'TITLE_STYLE_LOCKED';
  end if;
  if p_style > 0 and not exists (
    select 1 from public.user_album_tiers t where t.user_id = uid and t.album_id = p.title and t.tier >= p_style
  ) then
    raise exception 'Style pas encore débloqué' using errcode = 'P0001', hint = 'TITLE_STYLE_LOCKED';
  end if;
  update public.profiles set title_style = p_style where user_id = uid;
  return public.my_profile();
end;
$$;

-- Mon profil : le style en plus
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
    'title_style', p.title_style,
    'team', p.team,
    'badges', p.badges,
    'completion', public._profile_completion(p),
    'permanent', public._is_permanent(),
    'requests', (select count(*) from public.friendships where addressee = p.user_id and accepted_at is null),
    'show_in_ticker', p.show_in_ticker
  );
end;
$$;

-- Profil public : le style en plus
alter function public.get_player(text) rename to _get_player_serials;

create function public.get_player(p_username text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select (b::jsonb || jsonb_build_object('title_style', (
            select p.title_style from public.profiles p where lower(p.username::text) = lower(p_username)
          )))::json
    from public._get_player_serials(p_username) b
   where b is not null
$$;

revoke execute on function public._get_player_serials(text) from public, anon, authenticated;
revoke execute on function public.get_player(text) from public;
grant execute on function public.get_player(text) to anon, authenticated;
revoke execute on function public.set_title_style(smallint) from public, anon;
grant execute on function public.set_title_style(smallint) to authenticated;
