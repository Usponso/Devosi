# Graph Report - Devosi  (2026-10-27)

## Corpus Check
- 87 files · ~92,142 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 802 nodes · 1465 edges · 43 communities (37 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `16d8fef6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- NextRaceHero.vue
- AtelierView.vue
- index.js
- AppHeader.vue
- RaceDetail.vue
- StandingsView.vue
- jolpica.js
- LineChart.vue
- openf1.js
- AlbumView.vue
- Devosi
- getJSON
- DriverDetail.vue
- CLAUDE.md
- .claude/CLAUDE.md
- collectionStore.js
- CollectionView.vue
- build-catalog.mjs
- GpIntro.vue
- PacksView.vue
- HomeView.vue
- carLivery.js
- http.js
- F1Card.vue
- Icon.vue
- TeamDetail.vue
- DriverAvatar.vue
- stats.js
- drawRoad
- vue
- cards.js
- SeasonView.vue
- done
- teams.js
- formatCoins
- seasonPhotos
- TeammateDuel.vue
- isGp
- values

## God Nodes (most connected - your core abstractions)
1. `vue` - 38 edges
2. `rpc()` - 18 edges
3. `useF1Store` - 16 edges
4. `useCollectionStore` - 13 edges
5. `usePrefsStore` - 13 edges
6. `vue-router` - 12 edges
7. `useWeekendResults()` - 12 edges
8. `getTeamColor()` - 12 edges
9. `weekendSessions()` - 12 edges
10. `formatCoins()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `subLabel` --calls--> `getNationalityLabel()`  [EXTRACTED]
  src/components/cards/F1Card.vue → src/data/nationalities.js
- `hasCar` --calls--> `carImage()`  [EXTRACTED]
  src/views/TeamDetail.vue → src/data/cars.js
- `season` --calls--> `driverSeasonStats()`  [EXTRACTED]
  src/views/DriverDetail.vue → src/utils/stats.js
- `winner` --calls--> `winnerOf()`  [EXTRACTED]
  src/views/RaceDetail.vue → src/utils/stats.js
- `isActive()` --calls--> `isNavActive()`  [EXTRACTED]
  src/components/AppHeader.vue → src/components/navItems.js

## Import Cycles
- None detected.

## Communities (43 total, 6 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.06
Nodes (29): dependencies, gsap, pinia, @supabase/supabase-js, vue, vue-router, devDependencies, supabase (+21 more)

### Community 1 - "NextRaceHero.vue"
Cohesion: 0.11
Nodes (23): isLive, lastSession, now, props, session, sessionLive, { sessions: weekend }, titleWords (+15 more)

### Community 2 - "AtelierView.vue"
Cohesion: 0.06
Nodes (32): RARITY_VALUE, TRADE_UP_COST, busy, col, confirmRecycle, craft(), craftMatches, craftMore (+24 more)

### Community 3 - "index.js"
Cohesion: 0.13
Nodes (9): animate(), countup, easeOutCubic(), prefersReducedMotion(), reveal, app, router, routes (+1 more)

### Community 4 - "AppHeader.vue"
Cohesion: 0.12
Nodes (19): vue-router, chipLabel, currentYear, isActive(), packBadge, prefs, route, router (+11 more)

### Community 5 - "RaceDetail.vue"
Cohesion: 0.07
Nodes (29): activeSession, bestTimes, circuitLength, hasOpenF1, isNext, maxLap, mountedAt, openf1 (+21 more)

### Community 6 - "StandingsView.vue"
Cohesion: 0.10
Nodes (18): maxPoints(), recentForm(), titleContention(), contention, chartHeight, chartLabels, chartSeries, contention (+10 more)

### Community 7 - "jolpica.js"
Cohesion: 0.15
Nodes (30): flagUrl(), getCountryFlag(), getNationalityFlag(), getNationalityLabel(), NATIONALITY_FR, getTeamColor(), buildUrl(), countTotal() (+22 more)

### Community 11 - "LineChart.vue"
Cohesion: 0.12
Nodes (22): allValues, domain, endLabelPositions, hasHighlight, hoverId, hoverIndex, isDimmed(), isStrong() (+14 more)

### Community 12 - "openf1.js"
Cohesion: 0.22
Nodes (17): useWeekendResults(), enrich(), load(), schedulePoll(), fetchLapPositions(), fetchOpenF1(), fetchPits(), fetchSessionDrivers() (+9 more)

### Community 13 - "AlbumView.vue"
Cohesion: 0.13
Nodes (14): album, busy, cards, col, direction, go(), message, messageError (+6 more)

### Community 14 - "Devosi"
Cohesion: 0.18
Nodes (10): 1. Cloner le projet, 2. Installer les dépendances, 3. Compiler, Collection de cartes, Devosi, En local (Docker requis), En production, Fonctionnalités (+2 more)

### Community 15 - "getJSON"
Cohesion: 0.26
Nodes (13): categoryPhoto(), commonsInfo(), eventPhoto(), fileKey(), getJSON(), jolpicaAll(), pageImages(), resolvePhotos() (+5 more)

### Community 16 - "DriverDetail.vue"
Cohesion: 0.15
Nodes (13): age(), finishSeries(), career, completed, driver, maxPosition, resultsSeries, roundLabels (+5 more)

### Community 19 - "collectionStore.js"
Cohesion: 0.06
Nodes (59): @supabase/supabase-js, busy, close(), code, col, email, emit, error (+51 more)

### Community 20 - "CollectionView.vue"
Cohesion: 0.05
Nodes (36): CARD_TYPES, FINISHES, accountOpen, actionBusy, actionError, actionMsg, col, copies (+28 more)

### Community 21 - "build-catalog.mjs"
Cohesion: 0.05
Nodes (30): ALBUMS, byFamily, cards, catalog, CURRENT_YEAR, driverById, driverPodiums, driverSeasons (+22 more)

### Community 22 - "GpIntro.vue"
Cohesion: 0.06
Nodes (26): barBottom, barTop, blackout, carCanvas, carEl, carLayer, flash, FOG (+18 more)

### Community 23 - "PacksView.vue"
Cohesion: 0.08
Nodes (21): packChance(), advance(), available, busy, canBuy, col, countdown, current (+13 more)

### Community 24 - "HomeView.vue"
Cohesion: 0.12
Nodes (18): shortRaceName(), biggestMovers(), winnerOf(), champion, fastestLap, favDrivers, favTeam, lastRace (+10 more)

### Community 25 - "carLivery.js"
Cohesion: 0.17
Nodes (13): cache, hexToRgb(), inBox(), loadModel(), MODEL_GROUND, MODEL_HEIGHT, MODEL_WIDTH, NOSE_BADGE (+5 more)

### Community 26 - "http.js"
Cohesion: 0.19
Nodes (16): fetchWithRetry(), getJSON(), getQueue(), HOST_RATE, inflight, purgeCache(), queues, readCache() (+8 more)

### Community 27 - "F1Card.vue"
Cohesion: 0.07
Nodes (25): FINISH_LABEL, hasCircuit, hasPhoto, holo, monogram, photoFailed, props, root (+17 more)

### Community 28 - "Icon.vue"
Cohesion: 0.33
Nodes (4): col, ICONS, paths, props

### Community 29 - "TeamDetail.vue"
Cohesion: 0.13
Nodes (14): pointsProgression(), progression, progression, canBeFavorite, career, drivers, hasCar, isFav (+6 more)

### Community 30 - "DriverAvatar.vue"
Cohesion: 0.24
Nodes (8): failed, headshots, photo, props, store, headshots, useHeadshots(), fetchLatestHeadshots()

### Community 32 - "stats.js"
Cohesion: 0.38
Nodes (9): applySeasonCounts(), avg(), completedRaces(), driverSeasonStats(), poleSitter(), round1(), teammateDuel(), duel (+1 more)

### Community 33 - "drawRoad"
Cohesion: 0.22
Nodes (9): drawFx(), drawRoad(), drawTrackside(), mix(), packed(), placeCar(), span(), spawn() (+1 more)

### Community 34 - "vue"
Cohesion: 0.06
Nodes (33): vue, available, col, countdown, hasSession, max, now, ready (+25 more)

### Community 36 - "cards.js"
Cohesion: 0.33
Nodes (6): describeCard(), ECONOMY_ERRORS, economyMessage(), plural(), claim(), buy()

### Community 37 - "SeasonView.vue"
Cohesion: 0.17
Nodes (7): prefs, store, activeFilter, filteredRaces, FILTERS, sprintCount, store

### Community 38 - "done"
Cohesion: 0.40
Nodes (5): build(), done(), emit, finish(), onKey()

### Community 41 - "teams.js"
Cohesion: 0.11
Nodes (22): stopRevalidate, store, limitedRows, prefs, props, close(), onKey(), prefs (+14 more)

### Community 42 - "formatCoins"
Cohesion: 0.29
Nodes (5): col, sections, formatCoins(), recycleAll(), buyBlocker

### Community 44 - "seasonPhotos"
Cohesion: 0.38
Nodes (7): commonsSearch(), fold(), hasNamesake(), namesDriver(), nextSeasonPhoto(), seasonPhotos(), words()

### Community 46 - "TeammateDuel.vue"
Cohesion: 0.67
Nodes (3): makeRow(), props, rows

### Community 49 - "isGp"
Cohesion: 0.67
Nodes (3): atCircuit(), decade(), isGp()

## Knowledge Gaps
- **368 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+363 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 438 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `package.json`, `NextRaceHero.vue`, `AtelierView.vue`, `index.js`, `AppHeader.vue`, `RaceDetail.vue`, `StandingsView.vue`, `LineChart.vue`, `openf1.js`, `AlbumView.vue`, `DriverDetail.vue`, `collectionStore.js`, `CollectionView.vue`, `GpIntro.vue`, `PacksView.vue`, `HomeView.vue`, `F1Card.vue`, `Icon.vue`, `TeamDetail.vue`, `DriverAvatar.vue`, `SeasonView.vue`, `teams.js`, `formatCoins`, `TeammateDuel.vue`?**
  _High betweenness centrality (0.317) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _368 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06050420168067227 - nodes in this community are weakly interconnected._
- **Why does `vue-router` connect `AppHeader.vue` to `package.json`, `AtelierView.vue`, `index.js`, `RaceDetail.vue`, `StandingsView.vue`, `AlbumView.vue`, `DriverDetail.vue`, `CollectionView.vue`, `F1Card.vue`, `TeamDetail.vue`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `NextRaceHero.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.10846560846560846 - nodes in this community are weakly interconnected._
- **Why does `getTeamColor()` connect `jolpica.js` to `teams.js`, `openf1.js`, `build-catalog.mjs`, `GpIntro.vue`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `AtelierView.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.06456456456456457 - nodes in this community are weakly interconnected._