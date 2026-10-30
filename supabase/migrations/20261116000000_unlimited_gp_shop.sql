-- =============================================================================
-- Pack GP : plus de limite de 3 achats par week-end, seule la fenêtre du week-end
-- de course compte. Le compteur gp_bought est conservé pour les statistiques.
-- =============================================================================

/** Achète un pack GP (pendant le week-end de course, sans limite de nombre) */
create or replace function public.buy_gp_pack()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles := public._load_profile(uid);
  w public.races := public._current_weekend();
  v_key integer;
  bought int;
  price int := public._gp_setting('pack_price');
begin
  if w.season is null then
    raise exception 'Pas de week-end de course en cours' using errcode = 'P0001', hint = 'NO_WEEKEND';
  end if;
  v_key := w.season * 100 + w.round;
  bought := case when p.gp_key = v_key then p.gp_bought else 0 end;

  if p.coins < price then
    raise exception 'Pas assez de Pièces' using errcode = 'P0001', hint = 'NOT_ENOUGH_COINS';
  end if;

  update public.profiles
     set coins = coins - price,
         gp_packs = case when gp_key = v_key then gp_packs else 0 end + 1,
         gp_bought = bought + 1,
         gp_key = v_key
   where user_id = uid
  returning * into p;
  return json_build_object('status', public._status_json(p));
end;
$$;
