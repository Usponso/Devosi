-- =============================================================================
-- Raretés plus exigeantes, raisonnées « par pack » de 5 cartes :
--   Rare 40 % des packs, Épique 5 %, Légendaire 1,6 %, Mythique ~0,1 % (1 sur 1 000).
-- Plus de Rare garantie ; Légendaire (ou mieux) garantie au bout de 100 packs sans.
-- Probabilités par carte à garder synchronisées avec src/stores/collectionStore.js (RARITIES).
-- =============================================================================

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
    when 'pity_limit' then 100
  end
$$;

/** Tirage d'une rareté (aléatoire cryptographique) : 88,94 / 9,7 / 1,02 / 0,32 / 0,02 % */
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
    when x < 0.8894 then 'common'
    when x < 0.9864 then 'rare'
    when x < 0.9966 then 'epic'
    when x < 0.9998 then 'legendary'
    else 'mythic'
  end::public.card_rarity;
end;
$$;

/**
 * Ouvre un pack : 5 cartes tirées indépendamment ; une Légendaire (ou mieux) est
 * garantie au 100e pack consécutif sans en obtenir. Renvoie les cartes et le nouvel état.
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

  -- Garantie : Légendaire au 100e pack consécutif sans Légendaire ni Mythique
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

revoke execute on function public._game_setting(text), public._roll_rarity() from public, anon, authenticated;
revoke execute on function public.open_pack() from public, anon;
grant execute on function public.open_pack() to authenticated;
