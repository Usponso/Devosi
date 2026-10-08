# Graph Report - Devosi  (2026-10-08)

## Corpus Check
- 55 files · ~26,163 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .css 1)

## Summary
- 381 nodes · 712 edges · 19 communities (14 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8e0b7fd3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- NextRaceHero.vue
- TeamDetail.vue
- DriverDetail.vue
- index.js
- RaceDetail.vue
- HomeView.vue
- jolpica.js
- LineChart.vue
- AppHeader.vue
- http.js
- Devosi
- Countdown.vue
- TyreStints.vue
- CLAUDE.md
- .claude/CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `vue` - 23 edges
2. `useF1Store` - 14 edges
3. `usePrefsStore` - 12 edges
4. `getJSON()` - 10 edges
5. `weekendSessions()` - 9 edges
6. `vue-router` - 8 edges
7. `seasonTTL()` - 8 edges
8. `fetchErgast()` - 8 edges
9. `fetchOpenF1()` - 8 edges
10. `pointsProgression()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `duel` --calls--> `teammateDuel()`  [EXTRACTED]
  src/views/TeamDetail.vue → src/utils/stats.js
- `isLive` --calls--> `weekendSessions()`  [EXTRACTED]
  src/components/NextRaceHero.vue → src/utils/race.js
- `rows` --calls--> `weekendSessions()`  [EXTRACTED]
  src/components/WeekendSchedule.vue → src/utils/race.js
- `onTeamColor` --calls--> `readableOn()`  [EXTRACTED]
  src/views/TeamDetail.vue → src/composables/useTeamTheme.js
- `fetchErgast()` --calls--> `getJSON()`  [EXTRACTED]
  src/services/jolpica.js → src/services/http.js

## Import Cycles
- None detected.

## Communities (19 total, 5 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.07
Nodes (23): dependencies, pinia, vue, vue-router, devDependencies, vite, @vitejs/plugin-vue, name (+15 more)

### Community 1 - "NextRaceHero.vue"
Cohesion: 0.08
Nodes (31): isLive, now, props, session, sessionLive, titleWords, weather, winners (+23 more)

### Community 2 - "TeamDetail.vue"
Cohesion: 0.06
Nodes (40): vue, stopRevalidate, store, failed, headshots, photo, props, store (+32 more)

### Community 3 - "DriverDetail.vue"
Cohesion: 0.15
Nodes (20): applySeasonCounts(), avg(), completedRaces(), driverSeasonStats(), finishSeries(), poleSitter(), round1(), teammateDuel() (+12 more)

### Community 4 - "index.js"
Cohesion: 0.15
Nodes (9): pinia, animate(), countup, easeOutCubic(), prefersReducedMotion(), reveal, app, router (+1 more)

### Community 5 - "RaceDetail.vue"
Cohesion: 0.07
Nodes (35): loadCircuits(), props, shape, uid, headshots, useHeadshots(), fetchLapPositions(), fetchLatestHeadshots() (+27 more)

### Community 6 - "HomeView.vue"
Cohesion: 0.05
Nodes (40): makeRow(), props, rows, biggestMovers(), maxPoints(), pointsProgression(), recentForm(), titleContention() (+32 more)

### Community 7 - "jolpica.js"
Cohesion: 0.14
Nodes (32): COUNTRY_CODES, flagUrl(), getCountryFlag(), getNationalityFlag(), getNationalityLabel(), NATIONALITY_CODES, NATIONALITY_FR, getTeamColor() (+24 more)

### Community 11 - "LineChart.vue"
Cohesion: 0.12
Nodes (22): allValues, domain, endLabelPositions, hasHighlight, hoverId, hoverIndex, isDimmed(), isStrong() (+14 more)

### Community 12 - "AppHeader.vue"
Cohesion: 0.10
Nodes (15): vue-router, chipLabel, currentYear, prefs, route, router, scrolled, seasonYears (+7 more)

### Community 13 - "http.js"
Cohesion: 0.18
Nodes (17): fetchWithRetry(), getJSON(), getQueue(), HOST_RATE, inflight, onRevalidate(), purgeCache(), queues (+9 more)

### Community 14 - "Devosi"
Cohesion: 0.25
Nodes (7): 1. Cloner le projet, 2. Installer les dépendances, 3. Compiler, Devosi, Fonctionnalités, Lancer le projet, Sources de données

### Community 15 - "Countdown.vue"
Cohesion: 0.29
Nodes (7): ariaLabel, emit, now, pad(), props, remaining, units

### Community 16 - "TyreStints.vue"
Cohesion: 0.29
Nodes (4): COMPOUND_FR, COMPOUND_VAR, props, usedCompounds

## Knowledge Gaps
- **162 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+157 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 192 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `TeamDetail.vue` to `package.json`, `NextRaceHero.vue`, `DriverDetail.vue`, `index.js`, `RaceDetail.vue`, `HomeView.vue`, `LineChart.vue`, `AppHeader.vue`, `Countdown.vue`, `TyreStints.vue`?**
  _High betweenness centrality (0.235) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _162 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07389162561576355 - nodes in this community are weakly interconnected._
- **Why does `vue-router` connect `AppHeader.vue` to `package.json`, `TeamDetail.vue`, `DriverDetail.vue`, `index.js`, `RaceDetail.vue`, `HomeView.vue`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `NextRaceHero.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.07965860597439545 - nodes in this community are weakly interconnected._
- **Should `TeamDetail.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `DriverDetail.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._