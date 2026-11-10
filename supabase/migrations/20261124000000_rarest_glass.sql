-- Vitraux numérotés encore plus rares : environ 1 pack sur 500 (2 pour mille). Avec ~457 packs
-- ouverts par jour, ~1 vitrail par jour et la série de 280 exemplaires dure environ 10 mois.
create or replace function public._gp_setting(key text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case key
    when 'pack_price' then 200
    when 'weekend_buys' then 3
    when 'circuit_cards' then 2
    -- Chances de l'édition vainqueur par pack, en pour mille
    when 'edition_odds' then 5
    when 'edition_odds_gp' then 15
    when 'edition_days' then 7
    when 'coins_per_point' then 5
    -- Chances de l'affiche du week-end par pack GP, en pour mille
    when 'poster_odds_gp' then 250
    -- Chances d'un vitrail numéroté par pack (tous les packs), en pour mille : environ 1 pack sur 500
    when 'glass_odds' then 2
  end
$$;
