-- Pseudos offensants : refusés au moment du choix du pseudo (hint USERNAME_OFFENSIVE).
--  - Liste dans public.banned_words, modifiable en SQL (français et anglais au départ)
--  - `whole` = faux : le mot est cherché n'importe où dans le pseudo (« xSALOPEx »)
--    `whole` = vrai : seulement comme mot entier, séparé par _ ou des chiffres, pour les mots
--    courts qui apparaissent dans des mots innocents (« con » dans « Connor », « cock » dans « cockpit »)
--  - Le pseudo est normalisé : minuscules, chiffres et symboles façon leet (0→o, 1→i, 3→e,
--    4→a, 5→s, 7→t, 8→b) et lettres répétées (« fuuuck ») reconnus.
-- Les pseudos déjà pris ne sont pas modifiés : requête de contrôle en bas de fichier.

create table public.banned_words (
  word text primary key check (word ~ '^[a-z]+$'),
  whole boolean not null default false
);

alter table public.banned_words enable row level security;
revoke all on public.banned_words from anon, authenticated;

insert into public.banned_words (word, whole) values
  -- Français, n'importe où dans le pseudo
  ('encule', false), ('enculer', false), ('salop', false), ('connard', false), ('connasse', false),
  ('batard', false), ('putain', false), ('enfoire', false), ('branleur', false), ('couille', false),
  ('tapette', false), ('bougnoul', false), ('youpin', false), ('chintok', false), ('negre', false),
  ('niquetamere', false), ('ntamere', false), ('filsdepute', false), ('sucemoi', false),
  ('pedophile', false), ('hitler', false), ('siegheil', false), ('kkk', false),
  -- Français, mot entier seulement
  ('con', true), ('cul', true), ('pd', true), ('fdp', true), ('ntm', true), ('pute', true),
  ('bite', true), ('chatte', true), ('pedale', true), ('pedo', true), ('nazi', true), ('negro', true),
  ('nique', true), ('suce', true), ('bicot', true),
  -- Anglais, n'importe où
  ('fuck', false), ('shit', false), ('bitch', false), ('cunt', false), ('nigger', false), ('nigga', false),
  ('whore', false), ('faggot', false), ('rapist', false), ('pussy', false), ('motherf', false),
  ('asshole', false), ('dickhead', false), ('porn', false), ('wanker', false),
  -- Anglais, mot entier seulement
  ('ass', true), ('fag', true), ('dick', true), ('cock', true), ('rape', true), ('slut', true),
  ('isis', true), ('tits', true), ('cum', true), ('twat', true), ('retarded', true);

/**
 * Motif d'un mot interdit : chaque lettre peut être répétée (« fuuuck »), et un chiffre ou un
 * symbole peut remplacer une lettre (déjà traduit par la normalisation du pseudo)
 */
create or replace function public._banned_pattern(p_word text)
returns text
language sql
immutable
set search_path = ''
as $$
  select string_agg(c || '+', '') from regexp_split_to_table(p_word, '') as c
$$;

/** Vrai si le pseudo contient un mot interdit */
create or replace function public._username_offensive(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with norm as (
    select
      -- Lettres seules, chiffres lus comme des lettres (« s4l0p3 » → « salope »)
      translate(lower(p_username), '0134578_', 'oieastb') as leet,
      -- Mots séparés par _ ou des chiffres (« le_con_92 » → le, con)
      regexp_split_to_array(lower(p_username), '[_0-9]+') as tokens
  )
  select exists (
    select 1
      from public.banned_words w, norm n
     where (not w.whole and (n.leet ~ public._banned_pattern(w.word)
                             or regexp_replace(lower(p_username), '[^a-z]', '', 'g') ~ public._banned_pattern(w.word)))
        or (w.whole and (exists (select 1 from unnest(n.tokens) t where t ~ ('^' || public._banned_pattern(w.word) || '$'))
                         or n.leet ~ ('^' || public._banned_pattern(w.word) || '$')))
  )
$$;

-- Choix du pseudo : même fonction, avec le contrôle en plus
create or replace function public.set_username(p_username text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public._is_permanent() then
    raise exception 'Relie ta collection à un email pour choisir un pseudo'
      using errcode = 'P0001', hint = 'ACCOUNT_REQUIRED';
  end if;
  if p_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Pseudo invalide : 3 à 20 lettres, chiffres ou _'
      using errcode = 'P0001', hint = 'USERNAME_INVALID';
  end if;
  if public._username_offensive(p_username) then
    raise exception 'Ce pseudo n''est pas autorisé' using errcode = 'P0001', hint = 'USERNAME_OFFENSIVE';
  end if;

  perform public._load_profile(auth.uid());
  begin
    update public.profiles set username = p_username where user_id = auth.uid();
  exception when unique_violation then
    raise exception 'Ce pseudo est déjà pris' using errcode = 'P0001', hint = 'USERNAME_TAKEN';
  end;
  return public.my_profile();
end;
$$;

revoke execute on function public._banned_pattern(text) from public, anon, authenticated;
revoke execute on function public._username_offensive(text) from public, anon, authenticated;

-- Contrôle des pseudos existants (à lancer à la main dans l'éditeur SQL) :
--   select username from public.profiles where username is not null and public._username_offensive(username);
