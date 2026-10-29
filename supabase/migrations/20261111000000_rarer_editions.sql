-- =============================================================================
-- Édition vainqueur plus rare dans les packs : 0,5 % par pack (au lieu de 3 %) et 1,5 %
-- dans un pack GP (au lieu de 6 %), soit entre une Légendaire et une Mythique.
-- Le bon pronostic reste le moyen sûr de l'obtenir.
-- =============================================================================

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
  end
$$;
