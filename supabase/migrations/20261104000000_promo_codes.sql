-- =============================================================================
-- Codes promo : saisis dans la boutique, ils rapportent des Pièces et/ou des packs
-- (versés dans la réserve bonus). Chaque joueur ne peut utiliser un code qu'une fois.
--
-- Créer un code (éditeur SQL du dashboard Supabase, jamais depuis l'app) :
--   select public.create_promo_code('BIENVENUE', p_packs => 3, p_valid_for => interval '7 days');
--   select public.create_promo_code(null, p_coins => 500, p_max_uses => 1);  -- code aléatoire, 1 seule utilisation
-- Suivre les codes :
--   select * from public.promo_codes order by created_at desc;
-- =============================================================================

create table public.promo_codes (
  code extensions.citext primary key check (code ~ '^[A-Za-z0-9_-]{3,32}$'),
  coins integer not null default 0 check (coins >= 0),
  packs integer not null default 0 check (packs >= 0),
  starts_at timestamptz not null default now(),
  -- null : sans date de fin
  expires_at timestamptz,
  -- null : nombre d'utilisations illimité (chaque joueur reste limité à une fois)
  max_uses integer check (max_uses > 0),
  uses integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  check (coins > 0 or packs > 0)
);

create table public.promo_redemptions (
  code extensions.citext not null references public.promo_codes (code) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code, user_id)
);

-- Tentatives ratées (limite contre les essais de codes au hasard)
alter table public.profiles
  add column code_failures smallint not null default 0,
  add column code_failures_since timestamptz;

-- Accès uniquement via les fonctions ci-dessous
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
revoke all on public.promo_codes, public.promo_redemptions from anon, authenticated;

/**
 * Crée un code promo (réservé à l'administration). `p_code` null : code aléatoire de
 * 8 caractères. Renvoie le code créé.
 */
create or replace function public.create_promo_code(
  p_code text default null,
  p_coins integer default 0,
  p_packs integer default 0,
  p_valid_for interval default null,
  p_max_uses integer default null,
  p_starts_at timestamptz default now(),
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(coalesce(p_code,
    -- Sans caractères ambigus (0/O, 1/I/L)
    (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(b, i) % 31), 1), '')
       from extensions.gen_random_bytes(8) b, generate_series(0, 7) i)));
begin
  insert into public.promo_codes (code, coins, packs, starts_at, expires_at, max_uses, note)
  values (v_code, coalesce(p_coins, 0), coalesce(p_packs, 0), p_starts_at,
          case when p_valid_for is null then null else p_starts_at + p_valid_for end,
          p_max_uses, p_note);
  return v_code;
end;
$$;

/**
 * Utilise un code promo. Les échecs ne lèvent pas d'erreur (le compteur de tentatives
 * doit être enregistré) : la réponse contient `error` (CODE_INVALID, CODE_NOT_STARTED,
 * CODE_EXPIRED, CODE_USED_UP, CODE_ALREADY_USED, CODE_RATE_LIMIT) ou la récompense.
 */
create or replace function public.redeem_code(p_code text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles := public._load_profile(uid);
  c public.promo_codes;
  err text;
begin
  -- 10 tentatives ratées par heure au maximum
  if p.code_failures_since is null or p.code_failures_since < now() - interval '1 hour' then
    p.code_failures := 0;
    p.code_failures_since := now();
  end if;
  if p.code_failures >= 10 then
    return json_build_object('error', 'CODE_RATE_LIMIT');
  end if;

  -- Codes stockés en majuscules : la saisie ne tient pas compte de la casse
  select * into c from public.promo_codes
   where code::text = upper(trim(coalesce(p_code, '')))
     for update;

  err := case
    when c.code is null then 'CODE_INVALID'
    when exists (select 1 from public.promo_redemptions r where r.code = c.code and r.user_id = uid) then 'CODE_ALREADY_USED'
    when now() < c.starts_at then 'CODE_NOT_STARTED'
    when c.expires_at is not null and now() >= c.expires_at then 'CODE_EXPIRED'
    when c.max_uses is not null and c.uses >= c.max_uses then 'CODE_USED_UP'
  end;

  if err is not null then
    update public.profiles
       set code_failures = p.code_failures + case when err = 'CODE_INVALID' then 1 else 0 end,
           code_failures_since = p.code_failures_since
     where user_id = uid;
    return json_build_object('error', err);
  end if;

  insert into public.promo_redemptions (code, user_id) values (c.code, uid);
  update public.promo_codes set uses = uses + 1 where code = c.code;
  update public.profiles
     set coins = coins + c.coins,
         bonus_packs = bonus_packs + c.packs,
         code_failures = 0,
         code_failures_since = null
   where user_id = uid
  returning * into p;

  return json_build_object('coins', c.coins, 'packs', c.packs, 'status', public._status_json(p));
end;
$$;

revoke execute on function public.create_promo_code(text, integer, integer, interval, integer, timestamptz, text)
  from public, anon, authenticated;
revoke execute on function public.redeem_code(text) from public, anon;
grant execute on function public.redeem_code(text) to authenticated;
