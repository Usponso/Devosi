-- =============================================================================
-- Quêtes : la quête « une carte de l'écurie X » n'est tirée que si le catalogue
-- connaît l'écurie des cartes (colonne cards.team remplie par seed.sql). Sinon elle
-- n'avait pas d'écurie (« Obtenir une carte null ») et ne pouvait pas être terminée.
-- =============================================================================

/** Quête au hasard d'une difficulté, hors de celles déjà prises et de celles impossibles */
create or replace function public._pick_quest(p_tier smallint, p_exclude text[])
returns text
language sql
volatile
set search_path = ''
as $$
  select q.id from public._quest_pool() q
   where q.tier = p_tier and not (q.id = any (coalesce(p_exclude, '{}')))
     and (q.kind <> 'team' or exists (
       select 1 from public.cards c where c.team is not null
        group by c.team having count(*) >= 80
     ))
   order by random() limit 1
$$;

-- Quêtes déjà tirées sans écurie : remplacées par une autre quête moyenne du joueur
do $$
declare
  q record;
  v_id text;
  d record;
begin
  for q in
    select user_id, day, slot from public.user_quests
     where quest_id = 'team-1' and param is null and claimed_at is null
  loop
    v_id := public._pick_quest(2::smallint, array(
      select quest_id from public.user_quests where user_id = q.user_id and day = q.day
    ));
    select * into d from public._quest_pool() p where p.id = v_id;
    update public.user_quests
       set quest_id = v_id, param = public._quest_param(q.user_id, d.kind, d.param), target = d.target, progress = 0
     where user_id = q.user_id and day = q.day and slot = q.slot;
  end loop;
end;
$$;

revoke execute on function public._pick_quest(smallint, text[]) from public, anon, authenticated;
