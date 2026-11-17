-- Succès des quêtes (50 et 200 quêtes, séries de 7 et 30 jours) : ils comptaient les lignes
-- de user_quests, effacées chaque jour au tirage des nouvelles quêtes, et repartaient donc à
-- zéro tous les jours. Ils lisent maintenant des compteurs permanents du profil :
--  - quests_claimed : quêtes récupérées au total
--  - quest_run / quest_run_day : jours consécutifs avec les 4 quêtes récupérées (sans la
--    remise à zéro après 7 jours de la série affichée)
--  - quest_run_best : plus longue série
-- L'historique effacé avant cette migration est perdu : les compteurs repartent de ce que
-- l'on sait encore (quêtes du jour, série en cours).

alter table public.profiles
  add column quests_claimed integer not null default 0,
  add column quest_run integer not null default 0,
  add column quest_run_day date,
  add column quest_run_best integer not null default 0;

/** Une quête récupérée : compteur total, et la série quand les 4 du jour sont récupérées */
create or replace function public._count_claimed_quest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.claimed_at is not null or new.claimed_at is null then
    return null;
  end if;
  update public.profiles set quests_claimed = quests_claimed + 1 where user_id = new.user_id;
  if (select count(*) from public.user_quests
       where user_id = new.user_id and day = new.day and claimed_at is not null) = 4 then
    update public.profiles
       set quest_run = case when quest_run_day = new.day - 1 then quest_run + 1
                            when quest_run_day = new.day then quest_run
                            else 1 end,
           quest_run_best = greatest(quest_run_best,
                              case when quest_run_day = new.day - 1 then quest_run + 1
                                   when quest_run_day = new.day then quest_run
                                   else 1 end),
           quest_run_day = new.day
     where user_id = new.user_id;
  end if;
  return null;
end;
$$;

create trigger user_quests_claimed after update of claimed_at on public.user_quests
  for each row execute function public._count_claimed_quest();

revoke execute on function public._count_claimed_quest() from public, anon, authenticated;

-- Reprise de l'existant : quêtes récupérées aujourd'hui, plus les jours de la série en cours
-- (4 quêtes chacun) ; la série en cours devient la série et le record de départ
update public.profiles p
   set quest_run = case when p.streak_day >= current_date - 1 then p.streak else 0 end,
       quest_run_day = case when p.streak_day >= current_date - 1 then p.streak_day end,
       quest_run_best = case when p.streak_day >= current_date - 1 then p.streak else 0 end,
       quests_claimed =
         (select count(*) from public.user_quests q where q.user_id = p.user_id and q.claimed_at is not null)
         + 4 * case when p.streak_day = current_date then greatest(p.streak - 1, 0)
                    when p.streak_day = current_date - 1 then p.streak
                    else 0 end;

-- Succès : compteurs permanents à la place des lignes du jour
alter function public._achievement_stats(uuid) rename to _achievement_stats_base;

create function public._achievement_stats(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public._achievement_stats_base(p_user) || jsonb_build_object(
    'quests', p.quests_claimed,
    'streak', p.quest_run_best
  )
    from public.profiles p
   where p.user_id = p_user
$$;

revoke execute on function public._achievement_stats_base(uuid) from public, anon, authenticated;
revoke execute on function public._achievement_stats(uuid) from public, anon, authenticated;
