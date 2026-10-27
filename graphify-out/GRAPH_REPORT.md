# Graph Report - Devosi  (2026-10-27)

## Corpus Check
- 86 files · ~91,688 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 799 nodes · 1458 edges · 51 communities (43 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f44e5c8a`
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
- collectionStore.js
- AlbumView.vue
- Devosi
- getJSON
- DriverDetail.vue
- CLAUDE.md
- .claude/CLAUDE.md
- AccountDialog.vue
- CollectionView.vue
- build-catalog.mjs
- GpIntro.vue
- PacksView.vue
- HomeView.vue
- carLivery.js
- prefsStore.js
- F1Card.vue
- PlayerView.vue
- TeamDetail.vue
- vue
- TyreStints.vue
- stats.js
- drawRoad
- CarImage.vue
- recycle
- cards.js
- DriversView.vue
- done
- titleContention
- SeasonView.vue
- App.vue
- Icon.vue
- PlayersView.vue
- seasonPhotos
- SessionResults.vue
- TeammateDuel.vue
- pointsProgression
- supabase.js
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
- `season` --calls--> `driverSeasonStats()`  [EXTRACTED]
  src/views/DriverDetail.vue → src/utils/stats.js
- `duel` --calls--> `teammateDuel()`  [EXTRACTED]
  src/views/DriverDetail.vue → src/utils/stats.js
- `duel` --calls--> `teammateDuel()`  [EXTRACTED]
  src/views/TeamDetail.vue → src/utils/stats.js
- `isActive()` --calls--> `isNavActive()`  [EXTRACTED]
  src/components/AppHeader.vue → src/components/navItems.js

## Import Cycles
- None detected.

## Communities (51 total, 8 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.06
Nodes (28): dependencies, gsap, pinia, @supabase/supabase-js, vue, vue-router, devDependencies, supabase (+20 more)

### Community 1 - "NextRaceHero.vue"
Cohesion: 0.08
Nodes (29): ariaLabel, emit, now, pad(), props, remaining, units, isLive (+21 more)

### Community 2 - "AtelierView.vue"
Cohesion: 0.07
Nodes (31): busy, col, confirmRecycle, craft(), craftMatches, craftMore, craftQuery, craftRarity (+23 more)

### Community 3 - "index.js"
Cohesion: 0.11
Nodes (11): pinia, vue-router, animate(), countup, easeOutCubic(), prefersReducedMotion(), reveal, app (+3 more)

### Community 4 - "AppHeader.vue"
Cohesion: 0.07
Nodes (28): chipLabel, currentYear, isActive(), packBadge, prefs, route, router, scrolled (+20 more)

### Community 5 - "RaceDetail.vue"
Cohesion: 0.06
Nodes (47): headshots, useHeadshots(), useWeekendResults(), enrich(), load(), schedulePoll(), fetchLapPositions(), fetchLatestHeadshots() (+39 more)

### Community 6 - "StandingsView.vue"
Cohesion: 0.12
Nodes (14): recentForm(), chartHeight, chartLabels, chartSeries, filter, FILTERS, isMobile, prefs (+6 more)

### Community 7 - "jolpica.js"
Cohesion: 0.09
Nodes (45): flagUrl(), getCountryFlag(), getNationalityFlag(), getNationalityLabel(), NATIONALITY_FR, getTeamColor(), fetchWithRetry(), getJSON() (+37 more)

### Community 11 - "LineChart.vue"
Cohesion: 0.12
Nodes (22): allValues, domain, endLabelPositions, hasHighlight, hoverId, hoverIndex, isDimmed(), isStrong() (+14 more)

### Community 12 - "collectionStore.js"
Cohesion: 0.15
Nodes (27): buyPack(), claimAlbum(), craftCard(), currentUser(), ensureSession(), fetchMyAlbums(), fetchMyCards(), fetchMyProfile() (+19 more)

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
Nodes (13): finishSeries(), career, completed, driver, duel, maxPosition, resultsSeries, roundLabels (+5 more)

### Community 19 - "AccountDialog.vue"
Cohesion: 0.11
Nodes (26): busy, close(), code, col, email, emit, error, fail() (+18 more)

### Community 20 - "CollectionView.vue"
Cohesion: 0.06
Nodes (30): accountOpen, actionBusy, actionError, actionMsg, col, copies, countBy(), filtered (+22 more)

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
Cohesion: 0.13
Nodes (15): biggestMovers(), champion, fastestLap, favDrivers, favTeam, lastRace, leaderPoints, podiumOrder (+7 more)

### Community 25 - "carLivery.js"
Cohesion: 0.17
Nodes (13): cache, hexToRgb(), inBox(), loadModel(), MODEL_GROUND, MODEL_HEIGHT, MODEL_WIDTH, NOSE_BADGE (+5 more)

### Community 26 - "prefsStore.js"
Cohesion: 0.24
Nodes (9): close(), onKey(), prefs, PICKABLE_TEAMS, load(), usePrefsStore, leaderPoints, prefs (+1 more)

### Community 27 - "F1Card.vue"
Cohesion: 0.10
Nodes (16): FINISH_LABEL, hasCircuit, hasPhoto, holo, monogram, photoFailed, props, root (+8 more)

### Community 28 - "PlayerView.vue"
Cohesion: 0.17
Nodes (9): RARITIES, RARITY_LABEL, col, completedAlbums, loading, percent, player, route (+1 more)

### Community 29 - "TeamDetail.vue"
Cohesion: 0.17
Nodes (10): canBeFavorite, career, drivers, duel, isFav, pointsSeries, prefs, route (+2 more)

### Community 30 - "vue"
Cohesion: 0.15
Nodes (14): vue, failed, headshots, photo, props, store, DEFAULT_ACCENT, DRIVER_BIOS (+6 more)

### Community 31 - "TyreStints.vue"
Cohesion: 0.29
Nodes (4): COMPOUND_FR, COMPOUND_VAR, props, usedCompounds

### Community 32 - "stats.js"
Cohesion: 0.54
Nodes (7): applySeasonCounts(), avg(), completedRaces(), driverSeasonStats(), poleSitter(), round1(), teammateDuel()

### Community 33 - "drawRoad"
Cohesion: 0.22
Nodes (9): drawFx(), drawRoad(), drawTrackside(), mix(), packed(), placeCar(), span(), spawn() (+1 more)

### Community 34 - "CarImage.vue"
Cohesion: 0.22
Nodes (9): failed, props, src, BASE_2024, CAR_SLUGS, carImage(), FRONT_VIEW_SEASONS, hasCar (+1 more)

### Community 35 - "recycle"
Cohesion: 0.67
Nodes (3): recycle(), runAction(), upgrade()

### Community 36 - "cards.js"
Cohesion: 0.24
Nodes (9): col, describeCard(), ECONOMY_ERRORS, economyMessage(), formatCoins(), plural(), claim(), buy() (+1 more)

### Community 38 - "done"
Cohesion: 0.40
Nodes (5): build(), done(), emit, finish(), onKey()

### Community 39 - "titleContention"
Cohesion: 0.50
Nodes (4): maxPoints(), titleContention(), contention, contention

### Community 40 - "SeasonView.vue"
Cohesion: 0.20
Nodes (10): formatShortDate(), shortRaceName(), winnerOf(), segmentTitle(), winner, activeFilter, filteredRaces, FILTERS (+2 more)

### Community 41 - "App.vue"
Cohesion: 0.31
Nodes (8): stopRevalidate, store, hexToRgb(), luminance(), readableOn(), useTeamTheme(), onRevalidate(), onTeamColor

### Community 42 - "Icon.vue"
Cohesion: 0.25
Nodes (5): col, sections, ICONS, paths, props

### Community 43 - "PlayersView.vue"
Cohesion: 0.29
Nodes (7): fetchLeaderboard(), col, hasMore, load(), loading, players, query

### Community 44 - "seasonPhotos"
Cohesion: 0.38
Nodes (7): commonsSearch(), fold(), hasNamesake(), namesDriver(), nextSeasonPhoto(), seasonPhotos(), words()

### Community 45 - "SessionResults.vue"
Cohesion: 0.33
Nodes (3): limitedRows, prefs, props

### Community 46 - "TeammateDuel.vue"
Cohesion: 0.67
Nodes (3): makeRow(), props, rows

### Community 47 - "pointsProgression"
Cohesion: 0.50
Nodes (4): pointsProgression(), progression, progression, progression

### Community 49 - "isGp"
Cohesion: 0.67
Nodes (3): atCircuit(), decade(), isGp()

## Knowledge Gaps
- **367 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+362 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 436 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `package.json`, `NextRaceHero.vue`, `AtelierView.vue`, `index.js`, `AppHeader.vue`, `RaceDetail.vue`, `StandingsView.vue`, `LineChart.vue`, `AlbumView.vue`, `DriverDetail.vue`, `AccountDialog.vue`, `CollectionView.vue`, `GpIntro.vue`, `PacksView.vue`, `HomeView.vue`, `prefsStore.js`, `F1Card.vue`, `PlayerView.vue`, `TeamDetail.vue`, `TyreStints.vue`, `CarImage.vue`, `SeasonView.vue`, `App.vue`, `Icon.vue`, `PlayersView.vue`, `SessionResults.vue`, `TeammateDuel.vue`?**
  _High betweenness centrality (0.316) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _367 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.062388591800356503 - nodes in this community are weakly interconnected._
- **Why does `vue-router` connect `index.js` to `package.json`, `AtelierView.vue`, `AppHeader.vue`, `RaceDetail.vue`, `StandingsView.vue`, `AlbumView.vue`, `DriverDetail.vue`, `CollectionView.vue`, `PlayerView.vue`, `TeamDetail.vue`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `NextRaceHero.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.07899159663865546 - nodes in this community are weakly interconnected._
- **Why does `getTeamColor()` connect `jolpica.js` to `RaceDetail.vue`, `build-catalog.mjs`, `vue`, `GpIntro.vue`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `AtelierView.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.06825396825396825 - nodes in this community are weakly interconnected._