-- Bandeau « En direct » : reprise des tirages marquants des dernières 24 h faits avant sa
-- mise en ligne, retrouvés dans l'historique des ouvertures de packs (une seule fois).
insert into public.ticker_events (user_id, card_id, created_at)
select po.user_id, x.card_id, po.opened_at
  from public.pack_openings po
 cross join lateral unnest(po.card_ids) as x (card_id)
  join public.cards c on c.id = x.card_id
 where po.opened_at > now() - interval '24 hours'
   and (c.rarity in ('legendary', 'mythic') or c.edition_of is not null or c.type in ('poster', 'masterpiece'))
   and not exists (
     select 1 from public.ticker_events e
      where e.user_id = po.user_id and e.card_id = x.card_id and e.created_at = po.opened_at
   );
