-- Atelier : les cartes du Jeu des pilotes ne se fabriquent plus (packs et échanges
-- seulement), comme les affiches, les éditions et les vitraux numérotés.
create or replace function public.craft_card(p_card text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  res json;
begin
  if exists (select 1 from public.cards where id = p_card and edition_of is not null) then
    raise exception 'Carte d''édition : impossible à fabriquer' using errcode = 'P0001', hint = 'EDITION_NOT_CRAFTABLE';
  end if;
  if exists (select 1 from public.cards where id = p_card and type = 'poster') then
    raise exception 'Affiche : uniquement dans le pack GP de son week-end' using errcode = 'P0001', hint = 'POSTER_NOT_CRAFTABLE';
  end if;
  if exists (select 1 from public.cards where id = p_card and print_run is not null) then
    raise exception 'Carte numérotée : uniquement dans les packs' using errcode = 'P0001', hint = 'NUMBERED_LOCKED';
  end if;
  if exists (select 1 from public.cards where id = p_card and type = 'playing_card') then
    raise exception 'Carte à jouer : uniquement dans les packs' using errcode = 'P0001', hint = 'PLAYING_CARD_NOT_CRAFTABLE';
  end if;
  res := public._craft_card_base(p_card);
  perform public._quest_progress(auth.uid(), 'craft', 1);
  perform public._quest_progress(auth.uid(), 'card', 1, p_card, true);
  return public._with_status(res, auth.uid());
end;
$$;
