-- =============================================================================
-- Pack de bienvenue : offert une seule fois à chaque nouveau joueur, en plus des 3 packs
-- de départ. 5 cartes dont une Épique (ou mieux) garantie et une carte de son écurie
-- favorite. Les joueurs déjà inscrits ne le reçoivent pas.
-- =============================================================================

alter table public.profiles add column welcome_opened boolean not null default false;
-- Joueurs existants : ils ont déjà commencé
update public.profiles set welcome_opened = true;

-- État de la réserve : ajout du pack de bienvenue
create or replace function public._status_json(p public.profiles)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select (public._status_json_base(p)::jsonb
          || jsonb_build_object(
               'achievements_ready', public._achievements_ready(p.user_id),
               'welcome', not p.welcome_opened
             ))::json
$$;

/**
 * Ouvre le pack de bienvenue : 1 Épique ou mieux, 1 carte de l'écurie `p_team` (si elle
 * en a), 3 cartes classiques. Erreur `WELCOME_OPENED` s'il a déjà été ouvert.
 */
create or replace function public.open_welcome_pack(p_team text default null)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles := public._load_profile(uid);
  n int := public._game_setting('cards_per_pack');
  rarities public.card_rarity[] := '{}';
  r public.card_rarity;
  v_card text;
  v_card_ids text[] := '{}';
  result json[] := '{}';
  is_new boolean;
begin
  if p.welcome_opened then
    raise exception 'Pack de bienvenue déjà ouvert' using errcode = 'P0001', hint = 'WELCOME_OPENED';
  end if;

  for i in 1..n loop
    rarities := rarities || public._roll_rarity();
  end loop;
  -- Une Épique ou mieux garantie, en dernière position
  if not exists (select 1 from unnest(rarities) x where x >= 'epic') then
    rarities[n] := 'epic';
  end if;

  for i in 1..n loop
    r := rarities[i];
    v_card := null;
    -- 1re carte : une carte de l'écurie favorite (rareté tirée, sinon la plus proche)
    if i = 1 and p_team is not null then
      -- Un pilote ou l'écurie elle-même plutôt qu'un GP qu'elle a gagné
      select c.id, c.rarity into v_card, r from public.cards c
       where c.team = p_team and c.rarity <= rarities[i]
       order by c.type in ('driver', 'team') desc, c.rarity desc, random()
       limit 1;
      if v_card is null then
        select c.id, c.rarity into v_card, r from public.cards c
         where c.team = p_team order by c.type in ('driver', 'team') desc, c.rarity, random() limit 1;
      end if;
      r := coalesce(r, rarities[i]);
    end if;
    if v_card is null then
      select c.id into v_card from public.cards c where c.rarity = r order by random() limit 1;
    end if;

    insert into public.user_cards as uc (user_id, card_id)
    values (uid, v_card)
    on conflict (user_id, card_id) do update set count = uc.count + 1
    returning (uc.count = 1) into is_new;

    v_card_ids := v_card_ids || v_card;
    result := result || json_build_object('id', v_card, 'rarity', r, 'is_new', is_new, 'team', i = 1 and p_team is not null);
    perform public._quest_progress(uid, 'card', 1, v_card, is_new);
  end loop;
  perform public._quest_progress(uid, 'open', 1);

  update public.profiles
     set welcome_opened = true,
         packs_opened = packs_opened + 1
   where user_id = uid
  returning * into p;
  insert into public.pack_openings (user_id, card_ids) values (uid, v_card_ids);

  return json_build_object('cards', array_to_json(result), 'source', 'welcome', 'status', public._status_json(p));
end;
$$;

revoke execute on function public._status_json(public.profiles) from public, anon, authenticated;
revoke execute on function public.open_welcome_pack(text) from public, anon;
grant execute on function public.open_welcome_pack(text) to authenticated;
