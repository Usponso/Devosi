# Devosi : gérer les pseudos offensants

Quand un joueur choisit ou change son pseudo, le serveur le compare à une liste de mots interdits
(table `public.banned_words`). Si le pseudo en contient un, il est refusé avec le message
« Ce pseudo n'est pas autorisé : choisis-en un autre. » (« This username isn't allowed: pick another one. » en anglais).

## Comment la détection fonctionne

- **Majuscules ignorées** : `SALOPE` = `salope`.
- **Chiffres lus comme des lettres** : `0`→o, `1`→i, `3`→e, `4`→a, `5`→s, `7`→t, `8`→b (`S4L0P3` est bloqué).
- **Lettres répétées reconnues** : `fuuuck` est bloqué.
- **Deux sortes de mots** :
  - `whole = false` : le mot est cherché **n'importe où** dans le pseudo (`xxSALOPExx` est bloqué).
    Pour les mots longs et sans ambiguïté.
  - `whole = true` : le mot n'est bloqué que **seul**, séparé par `_` ou des chiffres (`le_con`, `con92`).
    Pour les mots courts qu'on retrouve dans des mots innocents : `con` dans `Connor`, `cock` dans `cockpit`.
- Les pseudos **déjà pris** ne sont pas modifiés : seuls les nouveaux choix de pseudo sont contrôlés.
  La requête « Voir les pseudos concernés » ci-dessous permet de repérer les anciens.

## Où faire la manip

1. Ouvre le dashboard Supabase : https://supabase.com/dashboard
2. Choisis le projet Devosi.
3. Menu de gauche : **SQL Editor**, puis **New query**.
4. Colle une des commandes ci-dessous, adapte-la, puis clique sur **Run** (ou Ctrl + Entrée).

> Attention : en local (`npx supabase start`), les changements vont dans la base de test de ton PC,
> pas en production. Pour les vrais joueurs, passe toujours par le dashboard en ligne.

## Voir la liste des mots interdits

```sql
select word, whole from public.banned_words order by whole, word;
```

## Ajouter un mot

Le mot s'écrit **en minuscules, sans accents, sans chiffres ni espaces** (`encule`, pas `enculé`).

```sql
-- Bloqué n'importe où dans le pseudo
insert into public.banned_words (word, whole) values ('nouveaumot', false);

-- Bloqué seulement comme mot entier (mots courts)
insert into public.banned_words (word, whole) values ('abc', true);

-- Plusieurs mots d'un coup
insert into public.banned_words (word, whole) values ('motun', false), ('motdeux', false);
```

## Retirer un mot ou changer son type

```sql
-- Retirer un mot (faux positif, par exemple)
delete from public.banned_words where word = 'motatort';

-- Passer un mot en « mot entier seulement » (il bloquait des pseudos innocents)
update public.banned_words set whole = true where word = 'motatort';
```

## Tester un pseudo avant de toucher à la liste

```sql
select public._username_offensive('Gr0s_C0nnard');   -- true : bloqué
select public._username_offensive('Connor_92');      -- false : autorisé
```

Pratique pour vérifier qu'un nouveau mot ne bloque pas des pseudos courants : teste quelques pseudos
innocents qui le contiennent avant de l'ajouter en `whole = false`.

## Voir les pseudos concernés

```sql
-- Joueurs dont le pseudo actuel contient un mot interdit
select username, created_at
  from public.profiles
 where username is not null and public._username_offensive(username)
 order by created_at desc;
```

À relancer après avoir ajouté des mots : les pseudos déjà pris ne sont jamais bloqués d'eux-mêmes.

## Corriger un pseudo existant

```sql
-- Renommer le joueur
update public.profiles set username = 'Joueur_1234' where username = 'PseudoOffensant';

-- Ou retirer son pseudo : il disparaît du classement et l'app lui demande d'en choisir un nouveau
update public.profiles set username = null where username = 'PseudoOffensant';
```

Avec `username = null`, le joueur garde sa collection, ses amis et ses échanges ; il doit seulement
choisir un nouveau pseudo (contrôlé, lui) pour réapparaître au classement.

## Faux positif connu

`Scunthorpe` (ville anglaise) est bloqué parce qu'il contient un mot interdit : c'est le prix d'une
recherche « n'importe où ». Si un vrai joueur tombe dessus, il peut choisir une variante.
