-- Échanges : un vitrail numéroté pèse 150 points dans l'équilibre (plus qu'une Mythique, qui
-- reste fabricable), la Rosace (5 exemplaires) 300. Les autres cartes gardent leurs points de
-- rareté. Seul l'équilibre des échanges change (classement et Écurie du week-end inchangés).

/** Poids d'une carte dans un échange */
create or replace function public._trade_card_value(p_rarity public.card_rarity, p_print_run smallint)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_print_run is null then public._rarity_points(p_rarity)
    when p_print_run <= 5 then 300
    else 150
  end
$$;

/** Valeur d'une liste de cartes dans un échange */
create or replace function public._trade_value(p_cards text[])
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(public._trade_card_value(c.rarity, c.print_run)), 0)::int
    from unnest(p_cards) x (id)
    join public.cards c on c.id = x.id
$$;

revoke execute on function public._trade_card_value(public.card_rarity, smallint) from public, anon, authenticated;
