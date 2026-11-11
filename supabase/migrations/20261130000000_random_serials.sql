-- Vitraux numérotés : le numéro d'un exemplaire est tiré au hasard parmi ceux encore libres
-- (on peut tomber sur le 19/25 comme sur le 07/25), au lieu de suivre l'ordre des tirages.
-- Les numéros déjà distribués ne changent pas.

/**
 * Prochain exemplaire numéroté à distribuer : une carte tirée au hasard parmi les
 * exemplaires restants (la rosace, tirée à 5, sort donc 5 fois moins qu'un vitrail à 25),
 * puis un numéro libre au hasard. Verrou de transaction : deux tirages simultanés ne
 * peuvent pas recevoir le même numéro. Rien si toute la série est distribuée.
 */
create or replace function public._next_serial()
returns table (card_id text, serial smallint)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_card text;
  v_run smallint;
begin
  perform pg_advisory_xact_lock(hashtext('card_serials'));

  select c.id, c.print_run into v_card, v_run
    from public.cards c
    left join public.card_serials s on s.card_id = c.id
   where c.print_run is not null
   group by c.id, c.print_run
  having count(s.serial) < c.print_run
   order by -ln(1 - random()) / (c.print_run - count(s.serial))
   limit 1;
  if v_card is null then
    return;
  end if;

  return query
    select v_card, n::smallint
      from generate_series(1, v_run) n
     where not exists (select 1 from public.card_serials s where s.card_id = v_card and s.serial = n)
     order by random()
     limit 1;
end;
$$;

revoke execute on function public._next_serial() from public, anon, authenticated;
