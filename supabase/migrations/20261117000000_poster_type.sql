-- Série « Affiches d'époque » : une affiche par Grand Prix, à obtenir uniquement dans le
-- pack GP de son week-end (tirage dans 20261117000001_posters.sql). Le type est ajouté dans
-- sa propre migration : une nouvelle valeur d'enum n'est utilisable qu'une fois validée.
alter type public.card_type add value if not exists 'poster';
