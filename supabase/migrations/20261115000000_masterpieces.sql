-- Série « Chefs-d'œuvre » : les Moments de légende repeints, cartes à part entière.
-- Elles entrent dans le tirage normal des packs selon leur rareté (les lignes de
-- public.cards et l'album viennent de supabase/seed.sql, généré par scripts/build-catalog.mjs).
alter type public.card_type add value if not exists 'masterpiece';
