# Devosi : gérer les codes promo

Les joueurs saisissent les codes dans **Cartes > Boutique > Code promo**.
Un code rapporte des **Pièces** et/ou des **packs** (versés dans la réserve bonus, sans plafond).

## Les règles

- Chaque joueur ne peut utiliser un code **qu'une seule fois**.
- Majuscules et espaces sont ignorés à la saisie (`bienvenue` = `BIENVENUE`).
- Un code peut avoir une date de début, une durée de validité et un nombre maximum d'utilisations (tous facultatifs).
- Au-delà de 10 codes invalides en une heure, un joueur est bloqué pendant une heure (anti-essais au hasard).
- Les codes ne se créent **que depuis le dashboard Supabase** : aucun joueur ne peut en créer depuis l'app.

## Où faire la manip

1. Ouvre le dashboard Supabase : https://supabase.com/dashboard
2. Choisis le projet Devosi.
3. Menu de gauche : **SQL Editor**, puis **New query**.
4. Colle une des commandes ci-dessous, adapte-la, puis clique sur **Run** (ou Ctrl + Entrée).

> Attention : en local (`npx supabase start`), les codes vont dans la base de test de ton PC,
> pas en production. Pour les vrais joueurs, passe toujours par le dashboard en ligne.

## Créer un code

```sql
select public.create_promo_code('BIENVENUE', p_packs => 3, p_valid_for => interval '7 days');
```

La commande renvoie le code créé.

### Les réglages possibles

| Réglage | À quoi ça sert | Exemple |
|---|---|---|
| 1er argument | Le code : 3 à 32 lettres, chiffres, `-` ou `_`. `null` = code aléatoire de 8 caractères | `'NOEL2026'` ou `null` |
| `p_coins` | Nombre de Pièces offertes | `p_coins => 500` |
| `p_packs` | Nombre de packs offerts | `p_packs => 3` |
| `p_valid_for` | Durée de validité (sans = n'expire jamais) | `p_valid_for => interval '7 days'` |
| `p_starts_at` | Date de début (par défaut : maintenant) | `p_starts_at => '2027-05-23 14:00+02'` |
| `p_max_uses` | Nombre total d'utilisations, tous joueurs confondus (sans = illimité) | `p_max_uses => 100` |
| `p_note` | Une note pour toi | `p_note => 'concours Insta'` |

Il faut au moins des Pièces **ou** des packs. Les durées s'écrivent `interval '30 minutes'`, `'48 hours'`, `'7 days'`, `'1 month'`.

### Exemples prêts à l'emploi

```sql
-- 3 packs pour tout le monde, pendant 7 jours
select public.create_promo_code('BIENVENUE', p_packs => 3, p_valid_for => interval '7 days');

-- 500 Pièces et 1 pack, code aléatoire, une seule utilisation (gagnant d'un concours)
select public.create_promo_code(null, p_coins => 500, p_packs => 1, p_max_uses => 1, p_note => 'concours');

-- Pendant le week-end du GP de Monaco, pour les 100 premiers
select public.create_promo_code('GP-MONACO', p_coins => 200,
  p_starts_at => '2027-05-23 14:00+02', p_valid_for => interval '48 hours', p_max_uses => 100);

-- 10 codes aléatoires d'un coup, une utilisation chacun (à distribuer)
select public.create_promo_code(null, p_packs => 2, p_max_uses => 1, p_note => 'lot de 10')
  from generate_series(1, 10);
```

## Suivre les codes

```sql
-- Tous les codes, du plus récent au plus ancien
select code, coins, packs, uses, max_uses, starts_at, expires_at, note
  from public.promo_codes
 order by created_at desc;

-- Qui a utilisé un code, et quand
select r.redeemed_at, p.username
  from public.promo_redemptions r
  left join public.profiles p on p.user_id = r.user_id
 where r.code = 'BIENVENUE'
 order by r.redeemed_at desc;
```

`uses` = nombre de fois où le code a été utilisé. Un joueur sans pseudo apparaît avec un `username` vide.

## Modifier ou arrêter un code

```sql
-- Désactiver un code immédiatement
update public.promo_codes set expires_at = now() where code = 'BIENVENUE';

-- Prolonger un code de 7 jours
update public.promo_codes set expires_at = expires_at + interval '7 days' where code = 'BIENVENUE';

-- Changer la récompense (n'affecte que les prochaines utilisations)
update public.promo_codes set packs = 5 where code = 'BIENVENUE';

-- Autoriser 50 utilisations de plus
update public.promo_codes set max_uses = max_uses + 50 where code = 'GP-MONACO';
```

Les codes s'enregistrent en majuscules : dans les `where code = '...'`, écris-les en **MAJUSCULES**.

## Messages vus par les joueurs

| Situation | Message |
|---|---|
| Code inconnu | « Ce code n'existe pas. » |
| Déjà utilisé par ce joueur | « Tu as déjà utilisé ce code. » |
| Date de fin dépassée | « Ce code a expiré. » |
| Date de début pas encore atteinte | « Ce code n'est pas encore actif. » |
| Nombre max d'utilisations atteint | « Ce code a déjà été utilisé le nombre maximum de fois. » |
| Trop de codes invalides | « Trop de codes invalides, réessaie dans une heure. » |
| Succès | « Code validé : +3 packs bonus et +50 Pièces ! » |
