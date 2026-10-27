-- =============================================================================
-- Droits de lecture explicites sur les tables lues directement par l'app.
-- Les nouveaux projets Supabase n'exposent plus automatiquement les tables à
-- l'API (pas de GRANT par défaut aux rôles anon / authenticated) : sans ces
-- droits, PostgREST répond 403 même si les règles RLS autorisent la lecture.
-- Les règles RLS continuent de limiter chaque joueur à ses propres lignes.
-- =============================================================================

-- Catalogue et albums : publics
grant select on public.cards, public.albums, public.album_cards to anon, authenticated;

-- Données du joueur (les invités ont aussi le rôle authenticated)
grant select on public.profiles, public.user_cards, public.user_albums, public.pack_openings to authenticated;
