# Graph Report - Devosi  (2026-10-26)

## Corpus Check
- 78 files · ~75,112 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 656 nodes · 1182 edges · 40 communities (34 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f44e5c8a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- NextRaceHero.vue
- teams.js
- DriverDetail.vue
- index.js
- RaceDetail.vue
- StandingsView.vue
- jolpica.js
- LineChart.vue
- AppHeader.vue
- http.js
- Devosi
- Countdown.vue
- TeamDetail.vue
- CLAUDE.md
- .claude/CLAUDE.md
- AccountDialog.vue
- CollectionView.vue
- build-catalog.mjs
- GpIntro.vue
- PacksView.vue
- HomeView.vue
- carLivery.js
- TeamsView.vue
- vue
- SeasonView.vue
- openf1.js
- DriverAvatar.vue
- TyreStints.vue
- SessionResults.vue
- drawRoad
- TeammateDuel.vue
- stats.js
- DriversView.vue
- done
- titleContention
- pointsProgression

## God Nodes (most connected - your core abstractions)
1. `vue` - 33 edges
2. `useF1Store` - 16 edges
3. `usePrefsStore` - 13 edges
4. `useWeekendResults()` - 12 edges
5. `getTeamColor()` - 12 edges
6. `weekendSessions()` - 12 edges
7. `rpc()` - 11 edges
8. `getJSON()` - 10 edges
9. `fetchOpenF1()` - 10 edges
10. `vue-router` - 9 edges

## Surprising Connections (you probably didn't know these)
- `season` --calls--> `driverSeasonStats()`  [EXTRACTED]
  src/views/DriverDetail.vue → src/utils/stats.js
- `duel` --calls--> `teammateDuel()`  [EXTRACTED]
  src/views/DriverDetail.vue → src/utils/stats.js
- `duel` --calls--> `teammateDuel()`  [EXTRACTED]
  src/views/TeamDetail.vue → src/utils/stats.js
- `isActive()` --calls--> `isNavActive()`  [EXTRACTED]
  src/components/AppHeader.vue → src/components/navItems.js
- `src` --calls--> `carImage()`  [EXTRACTED]
  src/components/CarImage.vue → src/data/cars.js

## Import Cycles
- None detected.

## Communities (40 total, 6 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.06
Nodes (29): dependencies, gsap, pinia, @supabase/supabase-js, vue, vue-router, devDependencies, supabase (+21 more)

### Community 1 - "NextRaceHero.vue"
Cohesion: 0.11
Nodes (22): isLive, lastSession, now, props, session, sessionLive, { sessions: weekend }, titleWords (+14 more)

### Community 2 - "teams.js"
Cohesion: 0.21
Nodes (11): close(), onKey(), prefs, DEFAULT_ACCENT, DRIVER_BIOS, PICKABLE_TEAMS, TEAM_COLORS, TEAM_LIVERIES (+3 more)

### Community 3 - "DriverDetail.vue"
Cohesion: 0.14
Nodes (14): age(), finishSeries(), career, completed, driver, duel, maxPosition, resultsSeries (+6 more)

### Community 4 - "index.js"
Cohesion: 0.13
Nodes (9): animate(), countup, easeOutCubic(), prefersReducedMotion(), reveal, app, router, routes (+1 more)

### Community 5 - "RaceDetail.vue"
Cohesion: 0.07
Nodes (28): activeSession, bestTimes, circuitLength, hasOpenF1, isNext, maxLap, mountedAt, openf1 (+20 more)

### Community 6 - "StandingsView.vue"
Cohesion: 0.12
Nodes (14): recentForm(), chartHeight, chartLabels, chartSeries, filter, FILTERS, isMobile, prefs (+6 more)

### Community 7 - "jolpica.js"
Cohesion: 0.12
Nodes (35): subLabel, COUNTRY_CODES, flagUrl(), getCountryFlag(), getNationalityFlag(), getNationalityLabel(), NATIONALITY_CODES, NATIONALITY_FR (+27 more)

### Community 11 - "LineChart.vue"
Cohesion: 0.12
Nodes (22): allValues, domain, endLabelPositions, hasHighlight, hoverId, hoverIndex, isDimmed(), isStrong() (+14 more)

### Community 12 - "AppHeader.vue"
Cohesion: 0.11
Nodes (18): vue-router, chipLabel, currentYear, isActive(), prefs, route, router, scrolled (+10 more)

### Community 13 - "http.js"
Cohesion: 0.19
Nodes (16): fetchWithRetry(), getJSON(), getQueue(), HOST_RATE, inflight, purgeCache(), queues, readCache() (+8 more)

### Community 14 - "Devosi"
Cohesion: 0.18
Nodes (10): 1. Cloner le projet, 2. Installer les dépendances, 3. Compiler, Collection de cartes, Devosi, En local (Docker requis), En production, Fonctionnalités (+2 more)

### Community 15 - "Countdown.vue"
Cohesion: 0.29
Nodes (7): ariaLabel, emit, now, pad(), props, remaining, units

### Community 16 - "TeamDetail.vue"
Cohesion: 0.17
Nodes (10): canBeFavorite, career, drivers, duel, isFav, pointsSeries, prefs, route (+2 more)

### Community 19 - "AccountDialog.vue"
Cohesion: 0.05
Nodes (58): @supabase/supabase-js, busy, close(), code, col, email, emit, error (+50 more)

### Community 20 - "CollectionView.vue"
Cohesion: 0.05
Nodes (34): hasCircuit, holo, monogram, photoFailed, props, root, stats, yearsLabel (+26 more)

### Community 21 - "build-catalog.mjs"
Cohesion: 0.07
Nodes (25): cards, catalog, CURRENT_YEAR, driverById, driverPodiums, driverSeasons, driverWins, esc() (+17 more)

### Community 22 - "GpIntro.vue"
Cohesion: 0.06
Nodes (26): barBottom, barTop, blackout, carCanvas, carEl, carLayer, flash, FOG (+18 more)

### Community 23 - "PacksView.vue"
Cohesion: 0.10
Nodes (17): packChance(), advance(), available, busy, col, countdown, current, drawn (+9 more)

### Community 24 - "HomeView.vue"
Cohesion: 0.13
Nodes (15): biggestMovers(), champion, fastestLap, favDrivers, favTeam, lastRace, leaderPoints, podiumOrder (+7 more)

### Community 25 - "carLivery.js"
Cohesion: 0.17
Nodes (13): cache, hexToRgb(), inBox(), loadModel(), MODEL_GROUND, MODEL_HEIGHT, MODEL_WIDTH, NOSE_BADGE (+5 more)

### Community 26 - "TeamsView.vue"
Cohesion: 0.18
Nodes (12): failed, props, src, BASE_2024, CAR_SLUGS, carImage(), FRONT_VIEW_SEASONS, hasCar (+4 more)

### Community 27 - "vue"
Cohesion: 0.29
Nodes (9): vue, stopRevalidate, store, hexToRgb(), luminance(), readableOn(), useTeamTheme(), onRevalidate() (+1 more)

### Community 28 - "SeasonView.vue"
Cohesion: 0.20
Nodes (10): formatShortDate(), shortRaceName(), winnerOf(), segmentTitle(), winner, activeFilter, filteredRaces, FILTERS (+2 more)

### Community 29 - "openf1.js"
Cohesion: 0.22
Nodes (17): useWeekendResults(), enrich(), load(), schedulePoll(), fetchLapPositions(), fetchOpenF1(), fetchPits(), fetchSessionDrivers() (+9 more)

### Community 30 - "DriverAvatar.vue"
Cohesion: 0.24
Nodes (8): failed, headshots, photo, props, store, headshots, useHeadshots(), fetchLatestHeadshots()

### Community 31 - "TyreStints.vue"
Cohesion: 0.29
Nodes (4): COMPOUND_FR, COMPOUND_VAR, props, usedCompounds

### Community 32 - "SessionResults.vue"
Cohesion: 0.33
Nodes (3): limitedRows, prefs, props

### Community 33 - "drawRoad"
Cohesion: 0.22
Nodes (9): drawFx(), drawRoad(), drawTrackside(), mix(), packed(), placeCar(), span(), spawn() (+1 more)

### Community 34 - "TeammateDuel.vue"
Cohesion: 0.67
Nodes (3): makeRow(), props, rows

### Community 35 - "stats.js"
Cohesion: 0.54
Nodes (7): applySeasonCounts(), avg(), completedRaces(), driverSeasonStats(), poleSitter(), round1(), teammateDuel()

### Community 38 - "done"
Cohesion: 0.40
Nodes (5): build(), done(), emit, finish(), onKey()

### Community 40 - "titleContention"
Cohesion: 0.50
Nodes (4): maxPoints(), titleContention(), contention, contention

### Community 41 - "pointsProgression"
Cohesion: 0.50
Nodes (4): pointsProgression(), progression, progression, progression

## Knowledge Gaps
- **292 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+287 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 351 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `package.json`, `NextRaceHero.vue`, `teams.js`, `DriverDetail.vue`, `index.js`, `RaceDetail.vue`, `StandingsView.vue`, `LineChart.vue`, `AppHeader.vue`, `Countdown.vue`, `TeamDetail.vue`, `AccountDialog.vue`, `CollectionView.vue`, `GpIntro.vue`, `PacksView.vue`, `HomeView.vue`, `TeamsView.vue`, `SeasonView.vue`, `openf1.js`, `DriverAvatar.vue`, `TyreStints.vue`, `SessionResults.vue`, `TeammateDuel.vue`?**
  _High betweenness centrality (0.338) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _292 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06050420168067227 - nodes in this community are weakly interconnected._
- **Why does `vue-router` connect `AppHeader.vue` to `package.json`, `DriverDetail.vue`, `index.js`, `RaceDetail.vue`, `StandingsView.vue`, `TeamDetail.vue`, `AccountDialog.vue`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `NextRaceHero.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `getTeamColor()` connect `jolpica.js` to `openf1.js`, `teams.js`, `build-catalog.mjs`, `GpIntro.vue`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `DriverDetail.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._