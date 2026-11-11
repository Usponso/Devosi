-- Profil public : numéro des cartes numérotées mises en vitrine (le plus petit possédé),
-- pour afficher « 07/25 » sur la vitrine d'un autre joueur
alter function public.get_player(text) rename to _get_player_tiers;

create function public.get_player(p_username text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select (b::jsonb || jsonb_build_object('serials', coalesce((
            select jsonb_object_agg(s.card_id, s.serial)
              from (select cs.card_id, min(cs.serial) as serial
                      from public.card_serials cs
                      join public.profiles p on p.user_id = cs.user_id
                     where lower(p.username::text) = lower(p_username)
                       and cs.card_id = any (p.showcase)
                     group by cs.card_id) s
          ), '{}')))::json
    from public._get_player_tiers(p_username) b
   where b is not null
$$;

revoke execute on function public._get_player_tiers(text) from public, anon, authenticated;
revoke execute on function public.get_player(text) from public;
grant execute on function public.get_player(text) to anon, authenticated;
