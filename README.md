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
