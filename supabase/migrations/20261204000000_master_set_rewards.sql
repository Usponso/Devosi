-- Master set : récompenses à la hauteur de l'effort.
--  - Pièces : 15 % de la valeur de recyclage des doublons mis de côté (4 par carte pour le
--    Set Chrome, 5 de plus pour le Master set Or), arrondies à 50, avec un minimum de 2 fois
--    (Chrome) ou 4 fois (Or) la récompense de l'album.
--  - Packs spéciaux (Épique garantie) : 1 pour le Set Chrome, 3 pour le Master set Or.
--  - Rattrapage : les paliers déjà récupérés reçoivent la différence de Pièces et les packs.

/** Récompense d'un palier (1 Chrome, 2 Or) d'un album : (coins, packs) */
create or replace function public._album_tier_reward(p_album text, p_tier int)
returns table (coins integer, packs integer)
language sql
stable
set search_path = ''
as $$
  select greatest(
           a.reward * 2 * p_tier,
           (round(0.15 * case p_tier when 1 then 4 else 5 end
                  * coalesce((select sum(public._card_value(c.rarity, 'recycle'))
                                from public.album_cards ac join public.cards c on c.id = ac.card_id
                               where ac.album_id = a.id), 0) / 50) * 50)::int
         ),
         case p_tier when 1 then 1 else 3 end
    from public.albums a
   where a.id = p_album
$$;

/** Récupère la récompense d'un palier (1 Chrome, 2 Or) d'un album complété : { reward, packs, status } */
create or replace function public.claim_album_tier(p_album text, p_tier int)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_user();
  p public.profiles;
  r record;
begin
  if not exists (select 1 from public.albums where id = p_album) then
    raise exception 'Album inconnu' using errcode = 'P0001', hint = 'ALBUM_UNKNOWN';
  end if;
  if p_tier not in (1, 2) then
    raise exception 'Palier inconnu' using errcode = 'P0001', hint = 'ALBUM_UNKNOWN';
  end if;
  if exists (select 1 from public.album_cards ac join public.cards c on c.id = ac.card_id
              where ac.album_id = p_album and c.print_run is not null) then
    raise exception 'Pas de finition pour cet album' using errcode = 'P0001', hint = 'MASTER_UNAVAILABLE';
  end if;

  p := public._load_profile(uid);
  if not exists (select 1 from public.user_albums where user_id = uid and album_id = p_album) then
    raise exception 'Album pas encore complété' using errcode = 'P0001', hint = 'ALBUM_INCOMPLETE';
  end if;
  if exists (select 1 from public.user_album_tiers where user_id = uid and album_id = p_album and tier = p_tier) then
    raise exception 'Récompense déjà récupérée' using errcode = 'P0001', hint = 'ALBUM_CLAIMED';
  end if;
  if exists (
    select 1 from public.album_cards ac
     where ac.album_id = p_album
       and not exists (select 1 from public.user_cards uc
                        where uc.user_id = uid and uc.card_id = ac.card_id and uc.finish >= p_tier)
  ) then
    raise exception 'Finitions incomplètes' using errcode = 'P0001', hint = 'MASTER_INCOMPLETE';
  end if;

  select * into r from public._album_tier_reward(p_album, p_tier);
  insert into public.user_album_tiers (user_id, album_id, tier) values (uid, p_album, p_tier);
  update public.profiles
     set coins = coins + r.coins,
         special_packs = least(special_packs + r.packs, 32767)
   where user_id = uid
  returning * into p;
  return json_build_object('reward', r.coins, 'packs', r.packs, 'status', public._status_json(p));
end;
$$;

-- -----------------------------------------------------------------------------
-- Rattrapage des paliers déjà récupérés (ancienne récompense : celle de l'album × palier)
-- -----------------------------------------------------------------------------
create temporary table master_catchup on commit drop as
select t.user_id,
       sum(greatest(r.coins - a.reward * t.tier, 0))::int as coins,
       sum(r.packs)::int as packs,
       count(*) as tiers
  from public.user_album_tiers t
  join public.albums a on a.id = t.album_id
  cross join lateral public._album_tier_reward(t.album_id, t.tier) r
 group by t.user_id;

update public.profiles p
   set coins = p.coins + c.coins,
       special_packs = least(p.special_packs + c.packs, 32767)
  from master_catchup c
 where c.user_id = p.user_id;

-- Prévenir les joueurs concernés (notification push, s'ils les ont activées)
select public._notify(c.user_id, 'packs',
         public._tr(c.user_id, 'Master set : récompenses revalorisées', 'Master set: bigger rewards'),
         public._tr(c.user_id,
           '+' || c.coins || ' Pièces et ' || public._plural(c.packs, 'pack spécial', 'packs spéciaux') || ' pour tes paliers déjà récupérés.',
           '+' || c.coins || ' Coins and ' || public._plural(c.packs, 'special pack', 'special packs') || ' for the tiers you already claimed.'),
         '/packs', 'master-catchup:' || c.user_id)
  from master_catchup c;

revoke execute on function public._album_tier_reward(text, int) from public, anon, authenticated;
