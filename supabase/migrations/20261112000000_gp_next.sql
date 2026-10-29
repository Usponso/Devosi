-- =============================================================================
-- Boutique : le prochain pack GP est annoncé avant son week-end de course (compte à
-- rebours, prix, circuit).
-- =============================================================================

create or replace function public._status_json(p public.profiles)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select (public._status_json_base(p)::jsonb
          || jsonb_build_object(
               'achievements_ready', public._achievements_ready(p.user_id),
               'welcome', not p.welcome_opened,
               -- Prochain week-end de course (pas encore commencé)
               'gp_next', (
                 select jsonb_build_object(
                   'season', r.season,
                   'round', r.round,
                   'name', r.name,
                   'circuit', r.circuit_id,
                   'starts_at', r.weekend_start,
                   'price', public._gp_setting('pack_price')
                 )
                   from public.races r
                  where r.weekend_start > now()
                  order by r.weekend_start
                  limit 1
               )
             ))::json
$$;

revoke execute on function public._status_json(public.profiles) from public, anon, authenticated;
