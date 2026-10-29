-- =============================================================================
-- Boutique : plus de limite d'achats de packs par jour. Seules restent les Pièces et
-- la place dans la réserve (10 packs).
-- =============================================================================

create or replace function public.buy_pack()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles;
  price int := public._game_setting('pack_price');
begin
  p := public._load_profile(uid);

  if p.packs_banked >= public._game_setting('max_packs') then
    raise exception 'Réserve de packs pleine' using errcode = 'P0001', hint = 'BANK_FULL';
  end if;
  if p.coins < price then
    raise exception 'Pas assez de Pièces' using errcode = 'P0001', hint = 'NOT_ENOUGH_COINS';
  end if;

  update public.profiles
     set coins = coins - price,
         packs_banked = packs_banked + 1
   where user_id = uid
  returning * into p;
  return json_build_object('status', public._status_json(p));
end;
$$;
