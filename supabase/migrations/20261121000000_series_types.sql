-- Séries « Vitraux » (numérotées) et « Le jeu des pilotes » : nouveaux types de carte,
-- ajoutés dans leur propre migration (une valeur d'enum n'est utilisable qu'une fois validée).
alter type public.card_type add value if not exists 'stained_glass';
alter type public.card_type add value if not exists 'playing_card';
