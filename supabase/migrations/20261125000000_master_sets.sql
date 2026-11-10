-- =============================================================================
-- Master set : deux paliers de plus par album, une fois l'album complété.
--  - Set Chrome (palier 1) : toutes les cartes de l'album en Chrome ou mieux,
--    récompense = celle de l'album en Pièces.
--  - Master set Or (palier 2) : toutes les cartes en Or, récompense = deux fois celle de
--    l'album ; le titre de l'album s'affiche alors en lettres d'or.
-- Pas de pack dans ces récompenses. Les albums qui contiennent des cartes numérotées
-- (sans finition, comme les Vitraux) n'ont pas de paliers.
-- =============================================================================

create table public.user_album_tiers (
  user_id uuid not null references auth.users (id) on delete cascade,
  album_id text not null references public.albums (id) on delete cascade,
  tier smallint not null check (tier in (1, 2)),
  claimed_at timestamptz not null default now(),
  primary key (user_id, album_id, tier)
);

alter table public.user_album_tiers enable row level security;
revoke all on public.user_album_tiers from anon, authenticated;
grant select on public.user_album_tiers to authenticated;
create policy "ses paliers d'album" on public.user_album_tiers for select to authenticated using (user_id = (select auth.uid()));

/** Récupère la récompense d'un palier (1 Chrome, 2 Or) d'un album complété : { reward, status } */
create or replace function public.claim_album_tier(p_album text, p_tier int)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles;
  v_reward int;
begin
  select reward into v_reward from public.albums where id = p_album;
  if v_reward is null then
    raise exception 'Album inconnu' using errcode = 'P0001', hint = 'ALBUM_UNKNOWN';
  end if;
  if p_tier not in (1, 2) then
    raise exception 'Palier inconnu' using errcode = 'P0001', hint = 'ALBUM_UNKNOWN';
  end if;
  if exists (select 1 from public.album_cards ac join public.cards c on c.id = ac.card_id
              where ac.album_id = p_album and c.print_run is not null) then
    raise exception 'Pas de finition pour cet album' using errcode = 'P0001', hint = 'MASTER_UNAVAILABLE';
  end if;

  p := public._load_profile(uid);
  if not exists (select 1 from public.user_albums where user_id = uid and album_id = p_album) then
    raise exception 'Album pas encore complété' using errcode = 'P0001', hint = 'ALBUM_INCOMPLETE';
  end if;
  if exists (select 1 from public.user_album_tiers where user_id = uid and album_id = p_album and tier = p_tier) then
    raise exception 'Récompense déjà récupérée' using errcode = 'P0001', hint = 'ALBUM_CLAIMED';
  end if;
  if exists (
    select 1 from public.album_cards ac
     where ac.album_id = p_album
       and not exists (select 1 from public.user_cards uc
                        where uc.user_id = uid and uc.card_id = ac.card_id and uc.finish >= p_tier)
  ) then
    raise exception 'Finitions incomplètes' using errcode = 'P0001', hint = 'MASTER_INCOMPLETE';
  end if;

  v_reward := v_reward * p_tier;
  insert into public.user_album_tiers (user_id, album_id, tier) values (uid, p_album, p_tier);
  update public.profiles set coins = coins + v_reward where user_id = uid returning * into p;
  return json_build_object('reward', v_reward, 'status', public._status_json(p));
end;
$$;

-- Profil public : palier le plus haut de chaque album (titre doré pour un Master set)
alter function public.get_player(text) rename to _get_player_badges;

create function public.get_player(p_username text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select (b::jsonb || jsonb_build_object('album_tiers', coalesce((
            select jsonb_object_agg(t.album_id, t.tier)
              from (select ut.album_id, max(ut.tier) as tier
                      from public.user_album_tiers ut
                      join public.profiles p on p.user_id = ut.user_id
                     where lower(p.username::text) = lower(p_username)
                     group by ut.album_id) t
          ), '{}')))::json
    from public._get_player_badges(p_username) b
   where b is not null
$$;

revoke execute on function public._get_player_badges(text) from public, anon, authenticated;
revoke execute on function public.get_player(text) from public;
grant execute on function public.get_player(text) to anon, authenticated;
revoke execute on function public.claim_album_tier(text, int) from public, anon;
grant execute on function public.claim_album_tier(text, int) to authenticated;
