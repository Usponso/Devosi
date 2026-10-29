# Devosi : mettre en place les notifications push

À faire **une seule fois**, dans cet ordre. Compte une quinzaine de minutes.

## 1. Générer les clés

Dans le terminal, à la racine du projet :

```
node scripts/vapid-keys.mjs
```

La commande affiche deux lignes :

- `VAPID_PUBLIC_KEY=...` : la clé **publique**, qui peut aller dans le front ;
- `VAPID_PRIVATE_KEY=...` : la clé **privée**. Elle ne doit jamais aller dans Netlify ni dans le code.

Génère aussi un secret d'appel (une longue chaîne aléatoire) :

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Garde ces trois valeurs sous la main pour les étapes suivantes.

## 2. Secrets de la fonction d'envoi (Supabase)

Dashboard Supabase → **Edge Functions** → **Secrets** → ajoute :

| Nom | Valeur |
|---|---|
| `VAPID_PUBLIC_KEY` | la clé publique |
| `VAPID_PRIVATE_KEY` | la clé privée |
| `VAPID_SUBJECT` | `mailto:` suivi de ton adresse email (contact pour les services push) |
| `PUSH_SECRET` | le secret d'appel |

## 3. Clé publique dans Netlify

Netlify → **Site configuration** → **Environment variables** → ajoute :

- `VITE_VAPID_PUBLIC_KEY` : la clé **publique** (c'est une valeur publique, ne la marque pas comme secrète).

## 4. Pousser le code

Le workflow GitHub « Base de données » applique la migration et déploie la fonction `send-push`. Netlify redéploie le site avec la clé publique.

## 5. Brancher la base sur la fonction (Vault)

Une fois le workflow vert, dans le **SQL Editor** de Supabase (remplace les deux valeurs) :

```sql
select vault.create_secret('https://TON-PROJET.supabase.co/functions/v1/send-push', 'push_url');
select vault.create_secret('LE-SECRET-D-APPEL', 'push_secret');
```

- `TON-PROJET` : la référence du projet (Project Settings → General → Reference ID).
- Le secret d'appel doit être **le même** que `PUSH_SECRET` à l'étape 2.

Tant que ces deux secrets n'existent pas, la base n'appelle pas la fonction et aucune notification ne part (rien ne casse).

## 6. Tester

1. Sur le site, menu du compte → **Notifications** → **Activer**, puis accepte la demande du navigateur.
2. Clique sur **Envoyer un test** : la notification arrive en quelques secondes.
3. Sur iPhone : ajoute d'abord le site à l'écran d'accueil (Partager → Sur l'écran d'accueil) et ouvre-le depuis l'icône.

## En cas de souci

```sql
-- Dernières notifications de la file (sent = envoyée, skipped = limite du jour atteinte)
select created_at, kind, title, status, send_after from public.notifications order by id desc limit 20;

-- Appareils abonnés
select count(*) from public.push_subscriptions;

-- Appels de la base vers la fonction (code 200 attendu)
select created, status_code, content from net._http_response order by created desc limit 10;
```

Les journaux de la fonction : Dashboard → Edge Functions → `send-push` → Logs.
