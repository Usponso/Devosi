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

Packs gratuits (1 toutes les 30 minutes, 10 en réserve au maximum, 3 offerts au départ), 5 cartes par pack. Chances par pack : au moins une Rare 40 %, une Épique 5 % (1 sur 20), une Légendaire 1,6 % (1 sur 63), une Mythique 0,1 % (1 sur 1 000) ; une Légendaire est garantie au bout de 100 packs sans en obtenir. La **boutique** de la page Packs vend 1 pack pour 150 Pièces, 3 achats par jour au maximum.

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
$ npx supabase db push --include-seed
```

Puis, dans le projet Supabase :

- **Authentication > Sign In / Providers** : activer *Allow anonymous sign-ins* et laisser *Confirm email* activé (sinon un email peut être relié sans vérification).
- **Authentication > Emails** : dans les modèles *Magic Link*, *Confirm signup* et *Change Email Address*, afficher le code à 6 chiffres avec `{{ .Token }}` (voir `supabase/templates/code.html`). L'app demande un code, pas un lien.
- **Authentication > Emails > SMTP** : configurer un vrai fournisseur d'emails (le service intégré de Supabase est limité à quelques envois par heure).
- Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables d'environnement Netlify.

Comptes : chacun joue d'abord en invité (session anonyme). « Sauvegarder ma collection » relie la session à un email (code à 6 chiffres, collection conservée) ; « J'ai déjà un compte » permet de se connecter depuis un autre appareil. Seuls les comptes reliés à un email et dotés d'un pseudo apparaissent dans le classement (`/joueurs`) et ont une vitrine publique (`/joueurs/<pseudo>`).

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
