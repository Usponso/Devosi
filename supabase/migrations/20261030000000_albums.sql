-- =============================================================================
-- Classeur façon Panini : des albums thématiques (une carte peut figurer dans
-- plusieurs albums). Un album complet rapporte une fois sa récompense en Pièces.
-- Le contenu des albums est généré par scripts/build-catalog.mjs (seed.sql).
-- =============================================================================

create table public.albums (
  id text primary key,
  reward integer not null check (reward >= 0)
);

create table public.album_cards (
  album_id text not null references public.albums (id) on delete cascade,
  card_id text not null references public.cards (id) on delete cascade,
  primary key (album_id, card_id)
);
create index album_cards_card_idx on public.album_cards (card_id);

-- Albums complétés (récompense versée)
create table public.user_albums (
  user_id uuid not null references auth.users (id) on delete cascade,
  album_id text not null references public.albums (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, album_id)
);

alter table public.albums enable row level security;
alter table public.album_cards enable row level security;
alter table public.user_albums enable row level security;

create policy "albums publics" on public.albums for select to anon, authenticated using (true);
create policy "contenu des albums public" on public.album_cards for select to anon, authenticated using (true);
create policy "ses albums" on public.user_albums for select to authenticated using (user_id = (select auth.uid()));

revoke insert, update, delete, truncate on public.albums, public.album_cards, public.user_albums
  from anon, authenticated;

/** Récupère la récompense d'un album complet (une seule fois) */
create or replace function public.claim_album(p_album text)
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

  p := public._load_profile(uid);
  if exists (select 1 from public.user_albums where user_id = uid and album_id = p_album) then
    raise exception 'Récompense déjà récupérée' using errcode = 'P0001', hint = 'ALBUM_CLAIMED';
  end if;
  if exists (
    select 1 from public.album_cards ac
     where ac.album_id = p_album
       and not exists (select 1 from public.user_cards uc where uc.user_id = uid and uc.card_id = ac.card_id)
  ) then
    raise exception 'Album incomplet' using errcode = 'P0001', hint = 'ALBUM_INCOMPLETE';
  end if;

  insert into public.user_albums (user_id, album_id) values (uid, p_album);
  update public.profiles set coins = coins + v_reward where user_id = uid returning * into p;
  return json_build_object('reward', v_reward, 'status', public._status_json(p));
end;
$$;

/** Profil public : ajoute les albums complétés */
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

revoke execute on function public.claim_album(text) from public, anon;
grant execute on function public.claim_album(text) to authenticated;
