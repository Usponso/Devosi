-- =============================================================================
-- Succès : objectifs à long terme en 4 familles (collection, écuries et pilotes,
-- pronostics, fidélité) et 4 niveaux (Bronze 50, Argent 150, Or 500, Légende 1 000
-- Pièces). La progression est calculée à partir des données du jeu : les succès déjà
-- mérités sont débloqués dès la mise en ligne. Jusqu'à 3 succès débloqués s'affichent
-- en badges sur le profil public.
-- =============================================================================

create table public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;
revoke all on public.user_achievements from anon, authenticated;

-- Badges affichés sur le profil (3 au maximum)
alter table public.profiles add column badges text[] not null default '{}';

/** Pièces gagnées par niveau : 1 Bronze, 2 Argent, 3 Or, 4 Légende */
create or replace function public._achievement_coins(p_tier smallint)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_tier when 1 then 50 when 2 then 150 when 3 then 500 else 1000 end
$$;

-- -----------------------------------------------------------------------------
-- Catalogue des succès
--   kind : packs, cards (cartes différentes), rarity (une carte de cette rareté),
--          chrome / gold (cartes avec cette finition), edition (éditions vainqueur),
--          team (toutes les cartes d'une écurie), album (toutes les cartes d'un album),
--          predictions, winners (bons vainqueurs), perfect (podiums parfaits),
--          poles (poles trouvées), top10 (top 10 d'une saison de pronostics),
--          streak (série de quêtes), quests (quêtes terminées), friends, promo
--   target null : nombre de cartes de l'écurie ou de l'album
-- -----------------------------------------------------------------------------
create or replace function public._achievement_pool()
returns table (id text, family text, tier smallint, title text, description text, kind text, param text, target integer)
language sql
immutable
set search_path = ''
as $$
  values
    ('packs-10',      'collection', 1::smallint, 'Premiers pas',       '10 packs ouverts',                    'packs',  null::text, 10),
    ('packs-100',     'collection', 2::smallint, 'Accro aux packs',    '100 packs ouverts',                   'packs',  null, 100),
    ('packs-500',     'collection', 3::smallint, 'Déballeur fou',      '500 packs ouverts',                   'packs',  null, 500),
    ('packs-1000',    'collection', 4::smallint, 'Usine à packs',      '1 000 packs ouverts',                 'packs',  null, 1000),
    ('cards-100',     'collection', 1::smallint, 'Collectionneur',     '100 cartes différentes',              'cards',  null, 100),
    ('cards-500',     'collection', 2::smallint, 'Grand collectionneur', '500 cartes différentes',            'cards',  null, 500),
    ('cards-1000',    'collection', 3::smallint, 'Archiviste',         '1 000 cartes différentes',            'cards',  null, 1000),
    ('cards-2000',    'collection', 4::smallint, 'Encyclopédie',       '2 000 cartes différentes',            'cards',  null, 2000),
    ('epic-1',        'collection', 1::smallint, 'Épique !',           'Obtenir une carte Épique',            'rarity', 'epic', 1),
    ('legendary-1',   'collection', 2::smallint, 'Légendaire',         'Obtenir une carte Légendaire',        'rarity', 'legendary', 1),
    ('mythic-1',      'collection', 3::smallint, 'Mythomane',          'Obtenir une carte Mythique',          'rarity', 'mythic', 1),
    ('chrome-1',      'collection', 1::smallint, 'Chromé',             'Débloquer une finition Chrome',       'chrome', null, 1),
    ('gold-1',        'collection', 2::smallint, 'Plaqué or',          'Débloquer une finition Or',           'gold',   null, 1),
    ('gold-10',       'collection', 3::smallint, 'Midas',              '10 cartes en finition Or',            'gold',   null, 10),
    ('edition-1',     'collection', 2::smallint, 'Vainqueur du jour',  'Obtenir une édition vainqueur',       'edition', null, 1),
    ('edition-10',    'collection', 4::smallint, 'Galerie des vainqueurs', '10 éditions vainqueur',           'edition', null, 10),

    ('team-ferrari',      'teams', 4::smallint, 'Tifoso',             'Toutes les cartes Ferrari',          'team', 'ferrari', null),
    ('team-mclaren',      'teams', 4::smallint, 'Papaya',             'Toutes les cartes McLaren',          'team', 'mclaren', null),
    ('team-mercedes',     'teams', 4::smallint, 'Flèche d''argent',   'Toutes les cartes Mercedes',         'team', 'mercedes', null),
    ('team-red_bull',     'teams', 4::smallint, 'Taureau rouge',      'Toutes les cartes Red Bull',         'team', 'red_bull', null),
    ('team-williams',     'teams', 4::smallint, 'Esprit de Grove',    'Toutes les cartes Williams',         'team', 'williams', null),
    ('team-alpine',       'teams', 2::smallint, 'Bleu Alpine',        'Toutes les cartes Alpine',           'team', 'alpine', null),
    ('team-haas',         'teams', 2::smallint, 'Écurie américaine',  'Toutes les cartes Haas',             'team', 'haas', null),
    ('team-rb',           'teams', 2::smallint, 'Junior de Faenza',   'Toutes les cartes Racing Bulls',     'team', 'rb', null),
    ('team-aston_martin', 'teams', 1::smallint, 'Vert anglais',       'Toutes les cartes Aston Martin',     'team', 'aston_martin', null),
    ('team-audi',         'teams', 1::smallint, 'Nouvelle ère',       'La carte Audi',                      'team', 'audi', null),
    ('team-cadillac',     'teams', 1::smallint, 'Rêve américain',     'La carte Cadillac',                  'team', 'cadillac', null),
    ('album-champions',   'teams', 3::smallint, 'Panthéon',           'Tous les champions du monde',        'album', 'champions', null),
    ('album-francais',    'teams', 3::smallint, 'Cocorico',           'Toutes les cartes de l''album Français', 'album', 'francais', null),
    ('album-grille-2026', 'teams', 3::smallint, 'Grille de départ',   'Toute la grille 2026',               'album', 'grille-2026', null),
    ('album-moments',     'teams', 4::smallint, 'Mémoire de la F1',   'Tous les Moments',                   'album', 'moments', null),

    ('pred-1',        'predictions', 1::smallint, 'Premier pronostic',   'Pronostiquer un Grand Prix',        'predictions', null, 1),
    ('pred-5',        'predictions', 1::smallint, 'Habitué',             '5 Grands Prix pronostiqués',        'predictions', null, 5),
    ('pred-10',       'predictions', 2::smallint, 'Pronostiqueur',       '10 Grands Prix pronostiqués',       'predictions', null, 10),
    ('pred-20',       'predictions', 3::smallint, 'Abonné du paddock',   '20 Grands Prix pronostiqués',       'predictions', null, 20),
    ('winner-1',      'predictions', 1::smallint, 'Bien vu',             'Trouver le vainqueur d''un GP',     'winners', null, 1),
    ('winner-10',     'predictions', 3::smallint, 'Devin',               'Trouver 10 vainqueurs',             'winners', null, 10),
    ('pole-5',        'predictions', 2::smallint, 'Chrono en tête',      'Trouver 5 poles',                   'poles', null, 5),
    ('perfect-1',     'predictions', 3::smallint, 'Oracle',              'Un podium parfait',                 'perfect', null, 1),
    ('top10',         'predictions', 4::smallint, 'Top 10',              'Finir une saison dans le top 10 des pronostics', 'top10', null, 1),

    ('streak-7',      'loyalty', 2::smallint, 'Semaine parfaite',    'Une série de quêtes de 7 jours',    'streak', null, 7),
    ('streak-30',     'loyalty', 4::smallint, 'Mois parfait',        'Une série de quêtes de 30 jours',   'streak', null, 30),
    ('quests-50',     'loyalty', 2::smallint, 'Aventurier',          '50 quêtes terminées',               'quests', null, 50),
    ('quests-200',    'loyalty', 3::smallint, 'Infatigable',         '200 quêtes terminées',              'quests', null, 200),
    ('friends-5',     'loyalty', 1::smallint, 'Écurie d''amis',      '5 amis',                            'friends', null, 5),
    ('promo-1',       'loyalty', 1::smallint, 'Code secret',         'Utiliser un code promo',            'promo', null, 1)
$$;

/** Compteurs d'un joueur utilisés par les succès */
create or replace function public._achievement_stats(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'packs', (select packs_opened from public.profiles where user_id = p_user),
    'cards', (select count(*) from public.user_cards where user_id = p_user),
    'rarity', (
      select coalesce(jsonb_object_agg(c.rarity, n), '{}') from (
        select c.rarity, count(*) as n from public.user_cards uc join public.cards c on c.id = uc.card_id
         where uc.user_id = p_user group by c.rarity
      ) c
    ),
    'chrome', (select count(*) from public.user_cards where user_id = p_user and finish >= 1),
    'gold', (select count(*) from public.user_cards where user_id = p_user and finish >= 2),
    'edition', (select count(*) from public.user_editions where user_id = p_user),
    'team', (
      select coalesce(jsonb_object_agg(team, n), '{}') from (
        select c.team, count(*) as n from public.user_cards uc join public.cards c on c.id = uc.card_id
         where uc.user_id = p_user and c.team is not null group by c.team
      ) t
    ),
    'album', (
      select coalesce(jsonb_object_agg(album_id, n), '{}') from (
        select ac.album_id, count(*) as n from public.album_cards ac
          join public.user_cards uc on uc.card_id = ac.card_id and uc.user_id = p_user
         group by ac.album_id
      ) a
    ),
    'predictions', (select count(*) from public.predictions where user_id = p_user),
    'winners', (
      select count(*) from public.predictions pr join public.races r using (season, round)
       where pr.user_id = p_user and r.scored_at is not null and pr.p1 = r.p1
    ),
    'poles', (
      select count(*) from public.predictions pr join public.races r using (season, round)
       where pr.user_id = p_user and r.scored_at is not null and pr.pole = r.pole
    ),
    'perfect', (
      select count(*) from public.predictions pr join public.races r using (season, round)
       where pr.user_id = p_user and r.scored_at is not null and pr.p1 = r.p1 and pr.p2 = r.p2 and pr.p3 = r.p3
    ),
    -- Saisons de pronostics terminées (toutes les courses notées) finies dans le top 10
    'top10', (
      select count(*) from (select distinct season from public.races) s
       where not exists (select 1 from public.races r where r.season = s.season and r.scored_at is null)
         and exists (select 1 from public._prediction_ranking(s.season) k where k.user_id = p_user and k.rank <= 10)
    ),
    -- Plus longue suite de jours avec les 4 quêtes récupérées
    'streak', (
      select coalesce(max(n), 0) from (
        select count(*) as n from (
          select day, day - (row_number() over (order by day))::int as grp
            from public.user_quests where user_id = p_user and claimed_at is not null
           group by day having count(*) = 4
        ) d group by grp
      ) runs
    ),
    'quests', (select count(*) from public.user_quests where user_id = p_user and claimed_at is not null),
    'friends', (select count(*) from public._friend_ids(p_user)),
    'promo', (select count(*) from public.promo_redemptions where user_id = p_user)
  )
$$;

/** Succès d'un joueur avec leur progression */
create or replace function public._achievements(p_user uuid)
returns table (
  id text, family text, tier smallint, title text, description text, kind text, param text,
  progress integer, target integer, coins integer, claimed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (select public._achievement_stats(p_user) as v),
  pool as (
    select a.*,
           coalesce(a.target, case a.kind
             when 'team' then (select count(*) from public.cards c where c.team = a.param)
             when 'album' then (select count(*) from public.album_cards ac where ac.album_id = a.param)
           end)::integer as goal
      from public._achievement_pool() a
  )
  select a.id, a.family, a.tier, a.title, a.description, a.kind, a.param,
         least(a.goal, coalesce(case a.kind
           when 'rarity' then (s.v -> 'rarity' ->> a.param)::int
           when 'team' then (s.v -> 'team' ->> a.param)::int
           when 'album' then (s.v -> 'album' ->> a.param)::int
           else (s.v ->> a.kind)::int
         end, 0))::integer,
         a.goal,
         public._achievement_coins(a.tier),
         ua.claimed_at
    from pool a
    cross join s
    left join public.user_achievements ua on ua.user_id = p_user and ua.achievement_id = a.id
   where a.goal > 0
$$;

/** Succès débloqués dont la récompense attend */
create or replace function public._achievements_ready(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public._achievements(p_user) a where a.progress >= a.target and a.claimed_at is null
$$;

-- État de la réserve : ajout des succès à récupérer
alter function public._status_json(public.profiles) rename to _status_json_base;

create function public._status_json(p public.profiles)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select (public._status_json_base(p)::jsonb
          || jsonb_build_object('achievements_ready', public._achievements_ready(p.user_id)))::json
$$;

-- -----------------------------------------------------------------------------
-- API
-- -----------------------------------------------------------------------------

/** Tous les succès, les badges affichés sur le profil et l'état de la réserve */
create or replace function public.my_achievements()
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
    'achievements', (
      select coalesce(json_agg(json_build_object(
               'id', a.id, 'family', a.family, 'tier', a.tier, 'title', a.title,
               'description', a.description, 'kind', a.kind, 'param', a.param,
               'progress', a.progress, 'target', a.target, 'coins', a.coins,
               'unlocked', a.progress >= a.target, 'claimed_at', a.claimed_at
             ) order by a.family, a.tier, a.id), '[]')
        from public._achievements(uid) a
    ),
    'badges', p.badges,
    'status', public._status_json(p)
  );
end;
$$;

/** Récupère la récompense d'un succès débloqué */
create or replace function public.claim_achievement(p_id text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  a record;
begin
  perform public._load_profile(uid);
  select * into a from public._achievements(uid) x where x.id = p_id;
  if a.id is null then
    raise exception 'Succès inconnu' using errcode = 'P0001', hint = 'ACHIEVEMENT_UNKNOWN';
  end if;
  if a.claimed_at is not null then
    raise exception 'Récompense déjà récupérée' using errcode = 'P0001', hint = 'ACHIEVEMENT_CLAIMED';
  end if;
  if a.progress < a.target then
    raise exception 'Succès pas encore débloqué' using errcode = 'P0001', hint = 'ACHIEVEMENT_LOCKED';
  end if;

  insert into public.user_achievements (user_id, achievement_id) values (uid, p_id);
  update public.profiles set coins = coins + a.coins where user_id = uid;
  return (public.my_achievements()::jsonb || jsonb_build_object('coins', a.coins))::json;
end;
$$;

/** Badges du profil public : jusqu'à 3 succès débloqués */
create or replace function public.set_badges(p_ids text[])
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  v_ids text[] := coalesce(p_ids, '{}');
begin
  perform public._load_profile(uid);
  if cardinality(v_ids) > 3 then
    raise exception '3 badges maximum' using errcode = 'P0001', hint = 'BADGES_FULL';
  end if;
  if exists (
    select 1 from unnest(v_ids) b
     where not exists (select 1 from public._achievements(uid) a where a.id = b and a.progress >= a.target)
  ) then
    raise exception 'Succès pas encore débloqué' using errcode = 'P0001', hint = 'ACHIEVEMENT_LOCKED';
  end if;

  if cardinality(v_ids) <> (select count(distinct b) from unnest(v_ids) b) then
    raise exception 'Badge en double' using errcode = 'P0001', hint = 'BADGES_DUPLICATE';
  end if;

  update public.profiles set badges = v_ids where user_id = uid;
  return public.my_achievements();
end;
$$;

-- Profil public : ajout des badges
alter function public.get_player(text) rename to _get_player_base;

create function public.get_player(p_username text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select (b::jsonb || jsonb_build_object('badges', coalesce((
            select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'description', a.description,
                                                'tier', a.tier, 'kind', a.kind) order by x.ord)
              from public.profiles p
              cross join unnest(p.badges) with ordinality x (id, ord)
              join public._achievement_pool() a on a.id = x.id
             where lower(p.username::text) = lower(p_username)
          ), '[]')))::json
    from public._get_player_base(p_username) b
   where b is not null
$$;

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke execute on function
  public._achievement_coins(smallint),
  public._achievement_pool(),
  public._achievement_stats(uuid),
  public._achievements(uuid),
  public._achievements_ready(uuid),
  public._status_json(public.profiles),
  public._status_json_base(public.profiles),
  public._get_player_base(text)
  from public, anon, authenticated;

revoke execute on function public.my_achievements(), public.claim_achievement(text), public.set_badges(text[])
  from public, anon;
grant execute on function public.my_achievements(), public.claim_achievement(text), public.set_badges(text[])
  to authenticated;

-- Profil public : lisible par les visiteurs comme avant
revoke execute on function public.get_player(text) from public;
grant execute on function public.get_player(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Profil complet : pseudo, avatar, écurie, 5 cartes en vitrine et 3 badges.
-- 200 Pièces une seule fois quand tout est rempli.
-- -----------------------------------------------------------------------------
alter table public.profiles add column profile_rewarded boolean not null default false;

/** Étapes du profil et pourcentage rempli */
create or replace function public._profile_completion(p public.profiles)
returns json
language sql
stable
set search_path = ''
as $$
  with s as (
    select p.username is not null as username,
           p.avatar_card is not null as avatar,
           p.team is not null as team,
           least(5, coalesce(cardinality(p.showcase), 0)) as showcase,
           least(3, coalesce(cardinality(p.badges), 0)) as badges
  )
  select json_build_object(
    'username', s.username,
    'avatar', s.avatar,
    'team', s.team,
    'showcase', s.showcase,
    'badges', s.badges,
    -- Pseudo, avatar et écurie : 1 point chacun ; vitrine 5 ; badges 3 (sur 11)
    'percent', round((s.username::int + s.avatar::int + s.team::int + s.showcase + s.badges) * 100.0 / 11),
    'reward', 200,
    'rewarded', p.profile_rewarded
  )
    from s
$$;

/** Mon profil : ajout des badges et de la complétion */
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
    'requests', (select count(*) from public.friendships where addressee = p.user_id and accepted_at is null)
  );
end;
$$;

/** Récompense du profil complet (une seule fois) */
create or replace function public.claim_profile_reward()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles := public._load_profile(uid);
  c json := public._profile_completion(p);
begin
  if p.profile_rewarded then
    raise exception 'Récompense déjà récupérée' using errcode = 'P0001', hint = 'PROFILE_REWARDED';
  end if;
  if (c ->> 'percent')::int < 100 then
    raise exception 'Profil incomplet' using errcode = 'P0001', hint = 'PROFILE_INCOMPLETE';
  end if;

  update public.profiles set coins = coins + 200, profile_rewarded = true where user_id = uid
  returning * into p;
  return json_build_object('coins', 200, 'profile', public.my_profile(), 'status', public._status_json(p));
end;
$$;

revoke execute on function public._profile_completion(public.profiles) from public, anon, authenticated;
revoke execute on function public.claim_profile_reward() from public, anon;
grant execute on function public.claim_profile_reward() to authenticated;
