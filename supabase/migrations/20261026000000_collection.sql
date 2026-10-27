-- =============================================================================
-- Collection de cartes F1
-- Les packs s'accumulent (1 par heure, 10 max) et ne s'ouvrent que côté serveur :
-- le client ne peut ni s'ajouter de packs ni choisir ses cartes.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

create type public.card_type as enum ('driver', 'team', 'gp', 'moment');
create type public.card_rarity as enum ('common', 'rare', 'epic', 'legendary', 'mythic');

-- Catalogue (contenu complet des cartes dans src/data/catalog.json, généré par
-- scripts/build-catalog.mjs ; la base n'a besoin que de l'id et de la rareté pour les tirages)
create table public.cards (
  id text primary key,
  type public.card_type not null,
  rarity public.card_rarity not null
);
create index cards_rarity_idx on public.cards (rarity);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Packs en réserve au dernier recalcul (3 offerts à l'inscription)
  packs_banked smallint not null default 3 check (packs_banked between 0 and 10),
  -- Point de départ du compteur vers le prochain pack
  last_refill_at timestamptz not null default now(),
  packs_opened integer not null default 0,
  -- Packs ouverts depuis la dernière carte Légendaire ou Mythique
  pity smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.user_cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null references public.cards (id) on delete cascade,
  count integer not null default 1 check (count > 0),
  first_obtained_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create table public.pack_openings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  card_ids text[] not null,
  opened_at timestamptz not null default now()
);
create index pack_openings_user_idx on public.pack_openings (user_id, opened_at desc);

-- -----------------------------------------------------------------------------
-- Sécurité : lecture de ses propres données uniquement, aucune écriture directe
-- -----------------------------------------------------------------------------
alter table public.cards enable row level security;
alter table public.profiles enable row level security;
alter table public.user_cards enable row level security;
alter table public.pack_openings enable row level security;

create policy "catalogue public" on public.cards for select to anon, authenticated using (true);
create policy "son profil" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "ses cartes" on public.user_cards for select to authenticated using (user_id = (select auth.uid()));
create policy "ses ouvertures" on public.pack_openings for select to authenticated using (user_id = (select auth.uid()));

revoke insert, update, delete, truncate on public.cards, public.profiles, public.user_cards, public.pack_openings
  from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Réglages du jeu
-- -----------------------------------------------------------------------------
create or replace function public._game_setting(key text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case key
    when 'max_packs' then 10
    when 'refill_minutes' then 60
    when 'cards_per_pack' then 5
    when 'pity_limit' then 40
  end
$$;

-- Recalcule la réserve de packs (calcul « paresseux », sans tâche planifiée) et verrouille le profil
create or replace function public._load_profile(p_user uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles;
  max_packs int := public._game_setting('max_packs');
  refill interval := make_interval(mins => public._game_setting('refill_minutes'));
  gained int;
begin
  insert into public.profiles (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into p from public.profiles where user_id = p_user for update;

  if p.packs_banked >= max_packs then
    -- Réserve pleine : le compteur est à l'arrêt
    p.last_refill_at := now();
  else
    gained := floor(extract(epoch from now() - p.last_refill_at) / extract(epoch from refill))::int;
    if gained > 0 then
      p.packs_banked := least(max_packs, p.packs_banked + gained);
      -- On avance d'heures pleines pour ne pas perdre les minutes déjà écoulées
      p.last_refill_at := case
        when p.packs_banked >= max_packs then now()
        else p.last_refill_at + refill * gained
      end;
    end if;
  end if;

  update public.profiles
     set packs_banked = p.packs_banked, last_refill_at = p.last_refill_at
   where user_id = p_user;
  return p;
end;
$$;

create or replace function public._status_json(p public.profiles)
returns json
language sql
stable
set search_path = ''
as $$
  select json_build_object(
    'available', p.packs_banked,
    'max', public._game_setting('max_packs'),
    'next_at', case
      when p.packs_banked >= public._game_setting('max_packs') then null
      else p.last_refill_at + make_interval(mins => public._game_setting('refill_minutes'))
    end,
    'pity_left', public._game_setting('pity_limit') - p.pity,
    'packs_opened', p.packs_opened,
    'server_now', now()
  )
$$;

/** Tirage d'une rareté (aléatoire cryptographique) : 60 / 25 / 10 / 4 / 1 % */
create or replace function public._roll_rarity()
returns public.card_rarity
language plpgsql
volatile
set search_path = ''
as $$
declare
  x double precision := ('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint / 4294967296.0;
begin
  return case
    when x < 0.60 then 'common'
    when x < 0.85 then 'rare'
    when x < 0.95 then 'epic'
    when x < 0.99 then 'legendary'
    else 'mythic'
  end::public.card_rarity;
end;
$$;

-- -----------------------------------------------------------------------------
-- API appelée par le client
-- -----------------------------------------------------------------------------

/** État de la réserve : packs disponibles, prochain pack, garantie Légendaire */
create or replace function public.pack_status()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;
  return public._status_json(public._load_profile(uid));
end;
$$;

/**
 * Ouvre un pack : 5 cartes, au moins une Rare, une Légendaire (ou mieux) garantie
 * au bout de 40 packs sans en obtenir. Renvoie les cartes et le nouvel état.
 */
create or replace function public.open_pack()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  p public.profiles;
  n int := public._game_setting('cards_per_pack');
  rarities public.card_rarity[] := '{}';
  r public.card_rarity;
  v_card text;
  v_card_ids text[] := '{}';
  result json[] := '{}';
  is_new boolean;
  lucky boolean;
begin
  if uid is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  p := public._load_profile(uid);
  if p.packs_banked < 1 then
    raise exception 'Aucun pack disponible' using errcode = 'P0001', hint = 'NO_PACK';
  end if;

  for i in 1..n loop
    rarities := rarities || public._roll_rarity();
  end loop;

  -- Au moins une Rare par pack
  if not exists (select 1 from unnest(rarities) x where x <> 'common') then
    rarities[n] := 'rare';
  end if;

  -- Garantie : Légendaire au 40e pack consécutif sans Légendaire ni Mythique
  lucky := exists (select 1 from unnest(rarities) x where x in ('legendary', 'mythic'));
  if not lucky and p.pity + 1 >= public._game_setting('pity_limit') then
    rarities[n] := 'legendary';
    lucky := true;
  end if;

  foreach r in array rarities loop
    select c.id into v_card from public.cards c where c.rarity = r order by random() limit 1;
    if v_card is null then
      raise exception 'Catalogue vide pour la rareté %', r;
    end if;

    insert into public.user_cards as uc (user_id, card_id)
    values (uid, v_card)
    on conflict (user_id, card_id) do update set count = uc.count + 1
    returning (uc.count = 1) into is_new;

    v_card_ids := v_card_ids || v_card;
    result := result || json_build_object('id', v_card, 'rarity', r, 'is_new', is_new);
  end loop;

  update public.profiles
     set packs_banked = packs_banked - 1,
         packs_opened = packs_opened + 1,
         pity = case when lucky then 0 else pity + 1 end
   where user_id = uid
  returning * into p;

  insert into public.pack_openings (user_id, card_ids) values (uid, v_card_ids);

  return json_build_object('cards', array_to_json(result), 'status', public._status_json(p));
end;
$$;

revoke execute on function public._load_profile(uuid), public._status_json(public.profiles),
  public._roll_rarity(), public._game_setting(text) from public, anon, authenticated;
revoke execute on function public.pack_status(), public.open_pack() from public, anon;
grant execute on function public.pack_status(), public.open_pack() to authenticated;
