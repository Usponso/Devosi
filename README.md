# Devosi

[![Netlify Status](https://api.netlify.com/api/v1/badges/a272679a-7eef-49de-9bf3-2c40c68d04cf/deploy-status)](https://app.netlify.com/sites/devosi/deploys)

Devosi est une application Formule 1 pensée pour les fans : prochain Grand Prix, classements, lutte pour le titre, duels entre coéquipiers et stratégies pneus.

Construite avec Vue 3, Pinia et Vite.

## Fonctionnalités

* **Prochain Grand Prix** : compte à rebours jusqu'à la prochaine séance, programme du week-end en heure locale, météo par séance, tracé animé du circuit, derniers vainqueurs sur ce circuit
* **Classements** pilotes et constructeurs, forme récente, écart au leader, évolution des points manche par manche
* **Lutte pour le titre** : points encore en jeu et pilotes mathématiquement encore en course
* **Grands Prix** : résultats (places gagnées, meilleur tour), qualifications, sprint, stratégie pneus et positions tour par tour (depuis 2023)
* **Pilotes et écuries** : statistiques de saison et de carrière, duel entre coéquipiers
* **Écurie favorite** : l'app prend ses couleurs et met ses pilotes en avant
* Toutes les saisons depuis 1950

## Sources de données

| Source | Usage |
| --- | --- |
| [Jolpica F1](https://github.com/jolpica/jolpica-f1) (successeur d'Ergast) | Calendrier, classements, résultats, qualifications, statistiques de carrière |
| [OpenF1](https://openf1.org) | Relais pneus, positions tour par tour, photos des pilotes (depuis 2023) |
| [Open-Meteo](https://open-meteo.com) | Prévisions météo des séances |
| [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) (MIT) | Tracés des circuits, convertis en SVG dans `src/data/circuits.json` |

Les réponses des API sont mises en cache dans le `localStorage` (stale-while-revalidate), et les requêtes passent par une file d'attente qui respecte les limites de débit (`src/services/http.js`).

Pour régénérer les tracés des circuits :

```sh
$ node scripts/build-circuits.mjs chemin/vers/f1-circuits.geojson
```

## Collection de cartes

Packs gratuits (1 toutes les 30 minutes, 10 en réserve au maximum, 3 offerts au départ), 5 cartes par pack. Chances par pack : au moins une Rare 40 %, une Épique 5 % (1 sur 20), une Légendaire 1,6 % (1 sur 63), une Mythique 0,1 % (1 sur 1 000) ; une Légendaire est garantie au bout de 100 packs sans en obtenir. La **boutique** (onglet Boutique, `/boutique`) vend 1 pack pour 150 Pièces, 3 achats par jour au maximum.

**Codes promo** (onglet Boutique) : un code rapporte des Pièces et/ou des packs bonus, une seule fois par joueur, avec une date de début, une date de fin et un nombre d'utilisations maximum facultatifs. Les codes se créent depuis l'éditeur SQL du dashboard Supabase (la fonction n'est pas accessible depuis l'app) :

```sql
-- 3 packs, valable 7 jours, utilisable par tout le monde
select public.create_promo_code('BIENVENUE', p_packs => 3, p_valid_for => interval '7 days');
-- 500 Pièces et 1 pack, code aléatoire, 1 seule utilisation au total
select public.create_promo_code(null, p_coins => 500, p_packs => 1, p_max_uses => 1, p_note => 'concours');
-- Actif à partir d'une date précise, pendant 48 h, pour les 100 premiers
select public.create_promo_code('GP-MONACO', p_coins => 200, p_starts_at => '2027-05-23 14:00+02', p_valid_for => interval '48 hours', p_max_uses => 100);
-- Suivre les codes et leurs utilisations
select code, coins, packs, uses, max_uses, expires_at, note from public.promo_codes order by created_at desc;
-- Désactiver un code tout de suite
update public.promo_codes set expires_at = now() where code = 'BIENVENUE';
```

**Quêtes du jour** (onglet Quêtes, `/quetes`) : 4 quêtes renouvelées à minuit UTC (2 faciles à 50 Pièces, 1 moyenne à 100 Pièces, 1 difficile qui rapporte un pack), avec 1 relance par jour. Les 4 terminées donnent un pack de plus et un jour de série ; au 7e jour de série, un pack spécial avec au moins une Épique garantie. Les packs gagnés vont dans une **réserve bonus** sans plafond, à part de la réserve qui se recharge (10 max) ; à l'ouverture, les packs spéciaux passent en premier, puis la réserve rechargée, puis la réserve bonus. La progression est suivie côté serveur par les fonctions du jeu (`supabase/migrations/20261103000000_quests.sql`). Chaque carte s'ouvre en plein écran au clic : on peut la faire pivoter (glisser, double-clic pour la retourner), passer aux cartes voisines et lire sa fiche (statistiques, albums, finitions, recyclage, vitrine). L'ouverture est sonorisée : déchirure de papier à l'ouverture, page qui tourne et marimba (plus de notes pour les cartes rares) à chaque carte. Les sons sont synthétisés dans le navigateur avec la Web Audio API, sans fichier audio ; le bouton haut-parleur de la page Packs coupe le son, et ce choix est mémorisé.

**Classeur** (`/collection`) : 21 albums thématiques façon Panini (champions, vainqueurs, Français, écuries, grille de la saison, Grands Prix par décennie, Monaco, Monza, Silverstone, Spa, courses mythiques, moments). Une carte peut figurer dans plusieurs albums ; un album complet rapporte une fois sa récompense en Pièces (250 à 800) et apparaît sur le profil public. Les albums sont définis dans `scripts/build-catalog.mjs` (`ALBUMS`).

**Atelier** (`/atelier`), pour faire quelque chose des doublons (le dernier exemplaire d'une carte n'est jamais consommé) :

- **Recycler** un doublon rapporte des Pièces : Commune 5, Rare 20, Épique 100, Légendaire 400, Mythique 2 000.
- **Fabriquer** une carte manquante coûte 4 fois sa valeur de recyclage (Commune 20 … Mythique 8 000).
- **Vitesse supérieure** : 5 doublons d'une rareté donnent 1 carte au hasard de la rareté supérieure.
- **Finitions** : Chrome avec 5 exemplaires d'une carte, puis Or avec 10 (les exemplaires en trop sont consommés). Dans le classement, une carte Chrome compte double et une carte Or triple.

- **Backend** : [Supabase](https://supabase.com) (connexion anonyme, Postgres). Les packs sont comptés et ouverts uniquement côté serveur (`supabase/migrations`), le client ne peut ni s'ajouter de packs ni choisir ses cartes.
- **Catalogue** : généré par `node scripts/build-catalog.mjs` (pilotes, écuries et Grands Prix depuis 1950 via Jolpica, 50 moments historiques dans `scripts/catalog/moments.json`, photos sous licence libre de Wikimedia Commons avec crédits). Il produit `src/data/catalog.json` et `supabase/seed.sql`.

### En local (Docker requis)

```sh
$ npx supabase start      # affiche l'URL et la clé « anon »
$ cp .env.example .env.local   # puis y coller la clé anon
$ npm run dev
```

### En production

```sh
$ npx supabase link --project-ref <ref-du-projet>
$ npx supabase db push
```

Puis exécuter `supabase/seed.sql` (le catalogue) dans le SQL Editor du dashboard. Ensuite, le workflow GitHub `Base de données` applique les migrations et rejoue le catalogue à chaque push (secret `SUPABASE_DB_URL` requis). `db push --include-seed` n'applique le seed qu'une seule fois puis ignore ses modifications : ne pas compter dessus.

Puis, dans le projet Supabase :

- **Authentication > Sign In / Providers** : activer *Allow anonymous sign-ins* et laisser *Confirm email* activé (sinon un email peut être relié sans vérification).
- **Authentication > Emails** : dans les modèles *Magic Link*, *Confirm signup* et *Change Email Address*, afficher le code à 6 chiffres avec `{{ .Token }}` (voir `supabase/templates/code.html`). L'app demande un code, pas un lien.
- **Authentication > Emails > SMTP** : configurer un vrai fournisseur d'emails (le service intégré de Supabase est limité à quelques envois par heure).
- Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables d'environnement Netlify.

Comptes : chacun joue d'abord en invité (session anonyme). « Sauvegarder ma collection » relie la session à un email (code à 6 chiffres, collection conservée) ; « J'ai déjà un compte » permet de se connecter depuis un autre appareil. Seuls les comptes reliés à un email et dotés d'un pseudo apparaissent dans le classement (`/joueurs`) et ont une vitrine publique (`/joueurs/<pseudo>`).

Toutes les pages de la collection partagent une barre d'onglets : Packs, Quêtes, Boutique, Collection, Atelier, Joueurs.

**Pronostics** (`/pronostics`, dans le menu principal) : avant chaque Grand Prix, on pronostique le podium (ordre exact) et la pole, jusqu'au début des qualifications. Barème : 10 points par pilote à la bonne place, 4 par pilote du podium mal placé, 10 pour la pole, +15 pour un podium parfait ; 1 point = 5 Pièces, podium parfait = 1 pack bonus. Classement de la saison (général et entre amis) ; en fin de saison, 10, 6 et 3 packs pour le top 3.

**Week-end de course** : du jour des premiers essais à la fin du jour de la course, un **pack GP** est offert chaque jour et 3 sont achetables en boutique (200 Pièces). 2 de ses 5 cartes sont liées au circuit (GP disputés là-bas, pilotes et écuries qui y ont gagné). Les packs GP achetés et pas ouverts rejoignent la réserve bonus à la fin du week-end.

**Édition vainqueur** : pendant les 7 jours qui suivent une course, la carte du vainqueur existe en édition tamponnée « Vainqueur ». Elle est garantie à ceux qui avaient trouvé le vainqueur, et tirable dans les packs (3 % par pack, 6 % dans un pack GP). Elle compte comme la carte normale pour les albums et s'affiche à part dans la collection.

Le calendrier et les résultats sont copiés depuis Jolpica dans la base par `scripts/sync-races.mjs`, que le workflow GitHub `Courses` lance toutes les heures du vendredi au lundi et une fois par jour le reste de la semaine : il ferme les pronostics, les note dès que le podium est connu et ouvre les week-ends de course (`supabase/migrations/20261106000000_predictions.sql`).

Profil public : chaque joueur choisit sa **vitrine** (5 cartes), un **avatar** parmi ses cartes (cadre aux couleurs de la rareté, reflet Chrome ou Or), un **titre** débloqué en complétant un album et son **écurie favorite** (couleurs du profil). Les **amis** s'ajoutent depuis un profil (demande à accepter) ; l'onglet Amis de `/joueurs` affiche les demandes reçues et envoyées et le classement entre amis. La bulle du compte, en haut à droite, donne accès à tout cela depuis n'importe quelle page (profil, personnalisation, amis, collection, compte) ; pour un invité, elle devient « Sauvegarder » ou « Se connecter ».

## Lancer le projet

### 1. Cloner le projet

```sh
# SSH
$ git clone git@github.com:Usponso/Devosi.git
```
OU
```sh
# HTTPS
$ git clone https://github.com/Usponso/Devosi.git
```

### 2. Installer les dépendances

```sh
$ npm install
```

### 3. Compiler

***Rechargement à chaud pour le développement***
```sh
$ npm run dev
```
**OU**

***Compilation pour la production***

```sh
$ npm run build
```

Devosi n'est pas affilié à la Formule 1 ni à la FIA.
