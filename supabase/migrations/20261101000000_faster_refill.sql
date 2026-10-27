-- =============================================================================
-- Recharge des packs plus rapide : 1 pack toutes les 30 minutes (au lieu de 60).
-- Le recalcul paresseux de _load_profile utilise directement ce réglage.
-- =============================================================================

create or replace function public._game_setting(key text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case key
    when 'max_packs' then 10
    when 'refill_minutes' then 30
    when 'cards_per_pack' then 5
    when 'pity_limit' then 100
    when 'pack_price' then 150
    when 'daily_buys' then 3
    when 'trade_up_cost' then 5
    when 'chrome_copies' then 5
    when 'gold_copies' then 10
  end
$$;
