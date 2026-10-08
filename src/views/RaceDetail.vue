<template>
  <div v-if="race" class="page race-detail">
    <!-- En-tête -->
    <header class="rd-hero">
      <div class="rd-glow" aria-hidden="true"></div>
      <div class="container rd-hero-grid">
        <div>
          <router-link to="/season" class="back muted">← Calendrier</router-link>
          <div class="rd-tags">
            <span class="badge mono">Manche {{ race.round }}/{{ store.races.length }}</span>
            <span v-if="race.sprint" class="badge"><Icon name="bolt" :size="11" /> Sprint</span>
            <span v-if="isNext" class="badge badge-accent badge-live">Prochain GP</span>
            <span v-else-if="race.completed" class="badge">Terminé</span>
          </div>
          <h1 class="title-lg rd-title">{{ race.name }}</h1>
          <div class="rd-place dim">
            <Flag :src="race.flag" :alt="race.country" :size="15" />
            {{ race.circuit }} · {{ race.locality }}, {{ race.country }}
          </div>
          <div class="rd-facts">
            <div><span class="eyebrow">Date</span><span class="mono">{{ formatDate(race.date) }}</span></div>
            <div v-if="race.laps"><span class="eyebrow">Tours</span><span class="mono">{{ race.laps }}</span></div>
            <div v-if="circuitLength"><span class="eyebrow">Tour</span><span class="mono">{{ (circuitLength / 1000).toFixed(3) }} km</span></div>
            <div v-if="winner"><span class="eyebrow">Vainqueur</span><span :style="{ color: winner.color }">{{ winner.driverName }}</span></div>
          </div>
        </div>
        <div class="rd-circuit">
          <CircuitMap :circuit-id="race.circuitId" :label="race.circuit" animated />
        </div>
      </div>
    </header>

    <div class="container rd-body">
      <!-- Course à venir : programme -->
      <template v-if="!race.completed">
        <div class="upcoming-grid">
          <section class="card">
            <div class="card-head">
              <h2 class="title-md">Programme du week-end</h2>
              <span class="muted small">heure locale</span>
            </div>
            <WeekendSchedule :race="race" :weather="weather" />
          </section>
          <section v-if="pastWinners.length" class="card">
            <div class="card-head"><h2 class="title-md">Vainqueurs précédents</h2></div>
            <ol class="past-winners">
              <li v-for="w in pastWinners" :key="w.season" :style="{ '--tc': w.color }">
                <span class="mono muted">{{ w.season }}</span>
                <router-link :to="`/drivers/${w.driverId}`">{{ w.driver }}</router-link>
                <span class="muted small">{{ w.constructor }}</span>
              </li>
            </ol>
          </section>
        </div>

        <!-- Résultats des séances déjà disputées (EL, qualifs, sprint) -->
        <section v-if="startedSessions.length" class="card table-card weekend-results">
          <div class="card-head wr-head">
            <h2 class="title-md">Résultats du week-end</h2>
            <div class="tabs">
              <button
                v-for="s in startedSessions"
                :key="s.key"
                class="tab"
                :class="{ active: activeSession?.key === s.key }"
                @click="weekendTab = s.key"
              >
                {{ s.short }}
                <span v-if="s.status === 'live'" class="live-dot" aria-label="en cours"></span>
              </button>
            </div>
          </div>
          <SessionResults v-if="activeSession" :rows="activeSession.rows" :status="activeSession.status" />
        </section>
      </template>

      <!-- Course disputée : onglets -->
      <template v-else>
        <div class="tabs rd-tabs" role="tablist">
          <button
            v-for="t in tabs"
            :key="t.id"
            class="tab"
            :class="{ active: tab === t.id }"
            role="tab"
            :aria-selected="tab === t.id"
            @click="tab = t.id"
          >{{ t.label }}</button>
        </div>

        <!-- Résultats course / sprint -->
        <section v-if="tab === 'race' || tab === 'sprint'" class="card table-card">
          <div class="res-head">
            <span>Pos</span><span>Pilote</span><span class="c-grid">Grille</span><span class="c-laps">Tours</span><span>Temps / statut</span><span class="c-pts">Pts</span>
          </div>
          <ol class="res-list">
            <li
              v-for="(r, i) in tab === 'race' ? race.results : race.sprintResults"
              :key="r.driverId"
              class="res-row team-edge"
              :class="{ 'is-fav': r.constructorId === prefs.favoriteTeamId, out: !r.classified }"
              :style="{ '--tc': r.color, animationDelay: `${i * 25}ms` }"
            >
              <span class="mono c-pos" :class="`pos-${r.pos}`">{{ r.classified ? r.pos : r.positionText }}</span>
              <router-link :to="`/drivers/${r.driverId}`" class="c-driver">
                <strong>{{ r.driverName }}</strong>
                <span class="muted small">{{ r.constructor }}</span>
              </router-link>
              <span class="c-grid mono">
                <span class="muted">{{ r.grid || 'PL' }}</span>
                <span v-if="r.classified && r.grid" class="gain" :class="gainClass(r)">{{ gainLabel(r) }}</span>
              </span>
              <span class="c-laps mono muted">{{ r.laps }}</span>
              <span class="c-time mono">
                {{ r.classified ? r.time : r.status }}
                <span v-if="r.fastestLap?.rank === 1" class="fl-badge" title="Meilleur tour"><Icon name="timer" :size="12" /> <span class="fl-time">{{ r.fastestLap.time }}</span></span>
              </span>
              <span class="c-pts mono">{{ r.points || '' }}</span>
            </li>
          </ol>
        </section>

        <!-- Qualifications -->
        <section v-else-if="tab === 'quali'" class="card table-card">
          <div class="q-head">
            <span>Pos</span><span>Pilote</span><span>Q1</span><span>Q2</span><span>Q3</span><span class="c-gap">Écart</span>
          </div>
          <ol class="res-list">
            <li
              v-for="(q, i) in race.qualifyingResults"
              :key="q.driverId"
              class="q-row team-edge"
              :class="{ 'is-fav': q.constructorId === prefs.favoriteTeamId }"
              :style="{ '--tc': q.color, animationDelay: `${i * 25}ms` }"
            >
              <span class="mono c-pos" :class="`pos-${q.pos}`">{{ q.pos }}</span>
              <router-link :to="`/drivers/${q.driverId}`" class="c-driver">
                <strong>{{ q.driverName }}</strong>
                <span class="muted small">{{ q.constructor }}</span>
              </router-link>
              <span class="mono q-time" :class="{ best: q.q1 === bestTimes.q1 }">{{ q.q1 || '—' }}</span>
              <span class="mono q-time" :class="{ best: q.q2 === bestTimes.q2 }">{{ q.q2 || '' }}</span>
              <span class="mono q-time" :class="{ best: q.q3 === bestTimes.q3 }">{{ q.q3 || '' }}</span>
              <span class="mono muted c-gap">{{ qualiGap(q) }}</span>
            </li>
          </ol>
        </section>

        <!-- Stratégie pneus -->
        <section v-else-if="tab === 'strategy'" class="card">
          <div class="card-head">
            <h2 class="title-md">Stratégie pneus</h2>
            <span class="muted small">Données OpenF1</span>
          </div>
          <div v-if="openf1.loading" class="skeleton chart-skeleton"></div>
          <p v-else-if="openf1.error" class="empty">{{ openf1.error }}</p>
          <TyreStints v-else-if="strategyRows.length" :rows="strategyRows" :total-laps="race.laps || maxLap" />
        </section>

        <!-- Essais libres -->
        <section v-else-if="practiceTab" class="card table-card">
          <SessionResults :rows="practiceTab.rows" :status="practiceTab.status" />
        </section>

        <!-- Positions tour par tour -->
        <section v-else-if="tab === 'positions'" class="card">
          <div class="card-head">
            <h2 class="title-md">Positions tour par tour</h2>
            <span class="muted small">Survole une courbe pour l'isoler</span>
          </div>
          <div v-if="openf1.loading" class="skeleton chart-skeleton"></div>
          <p v-else-if="openf1.error" class="empty">{{ openf1.error }}</p>
          <LineChart
            v-else-if="positionSeries.length"
            :series="positionSeries"
            :x-labels="positionLabels"
            :height="460"
            :y-min="1"
            :y-max="positionSeries.length"
            invert
            :format-y="(v) => `P${v}`"
            :tooltip-title="(i) => (i === 0 ? 'Départ' : `Tour ${i}`)"
            aria-label="Positions des pilotes à chaque tour"
          />
        </section>
      </template>
    </div>

    <!-- Intro : la monoplace gagnante fonce vers l'écran -->
    <Teleport to="body">
      <GpIntro
        v-if="showIntro"
        :winner="winner"
        :round="race.round"
        :race-name="race.name"
        @done="showIntro = false"
      />
    </Teleport>
  </div>

  <div v-else-if="!store.loading" class="container empty">Grand Prix introuvable.</div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '@/components/Icon.vue'
import Flag from '@/components/Flag.vue'
import CircuitMap from '@/components/CircuitMap.vue'
import WeekendSchedule from '@/components/WeekendSchedule.vue'
import TyreStints from '@/components/charts/TyreStints.vue'
import LineChart from '@/components/charts/LineChart.vue'
import SessionResults from '@/components/SessionResults.vue'
import GpIntro from '@/components/GpIntro.vue'
import circuitsMeta from '@/data/circuits.json'
import { useWeekendResults } from '@/composables/useWeekendResults'
import { useF1Store } from '@/stores/f1Store'
import { usePrefsStore } from '@/stores/prefsStore'
import { fetchCircuitWinners } from '@/services/jolpica'
import { fetchSessionWeather } from '@/services/weather'
import {
  OPENF1_FIRST_SEASON,
  findSession,
  fetchSessionDrivers,
  fetchStints,
  fetchLapPositions,
} from '@/services/openf1'
import { formatDate, weekendSessions } from '@/utils/race'
import { winnerOf } from '@/utils/stats'

const route = useRoute()
const store = useF1Store()
const prefs = usePrefsStore()

const race = computed(() => store.getRaceById(route.params.id))
const isNext = computed(() => store.nextRace?.id === race.value?.id)
const winner = computed(() => (race.value ? winnerOf(race.value) : null))
const circuitLength = computed(() => circuitsMeta[race.value?.circuitId]?.length ?? null)

// ---------------------------------------------------------------------------
// Onglets
// ---------------------------------------------------------------------------

const hasOpenF1 = computed(() => race.value?.season >= OPENF1_FIRST_SEASON)

// Séances OpenF1 : EL seulement pour une course terminée (le reste vient de Jolpica),
// toutes les séances déjà courues pendant le week-end
const { sessions: weekend } = useWeekendResults(race, (r) =>
  r.completed ? ['fp1', 'fp2', 'fp3'] : ['fp1', 'fp2', 'fp3', 'sprintQualifying', 'sprint', 'qualifying'],
)

const startedSessions = computed(() => weekend.value.filter((s) => s.status !== 'upcoming'))
const weekendTab = ref(null)
const activeSession = computed(
  () => startedSessions.value.find((s) => s.key === weekendTab.value) ?? startedSessions.value.at(-1) ?? null,
)

const practiceSessions = computed(() => weekend.value.filter((s) => s.key.startsWith('fp') && s.rows.length))
const practiceTab = computed(() => practiceSessions.value.find((s) => s.key === tab.value) ?? null)

const tabs = computed(() => {
  const list = [{ id: 'race', label: 'Course' }]
  if (race.value?.qualifyingResults.length) list.push({ id: 'quali', label: 'Qualifs' })
  if (race.value?.sprintResults.length) list.push({ id: 'sprint', label: 'Sprint' })
  practiceSessions.value.forEach((s) => list.push({ id: s.key, label: s.short }))
  if (hasOpenF1.value) {
    list.push({ id: 'strategy', label: 'Stratégie' })
    list.push({ id: 'positions', label: 'Positions' })
  }
  return list
})

const tab = ref('race')
watch(() => route.params.id, () => (tab.value = 'race'))

// ---------------------------------------------------------------------------
// Intro animée (GP terminé) : la F1 du vainqueur, aux couleurs de son écurie
// ---------------------------------------------------------------------------

const showIntro = ref(false)
const mountedAt = Date.now()
let introDecided = false

watch(
  winner,
  (w) => {
    if (introDecided || !w) return
    introDecided = true
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Si les résultats arrivent tard (premier chargement), on ne coupe pas la lecture de la page
    const tooLate = Date.now() - mountedAt > 4000
    if (!reducedMotion && !tooLate) showIntro.value = true
  },
  { immediate: true },
)

// ---------------------------------------------------------------------------
// Résultats / qualifs
// ---------------------------------------------------------------------------

const gainLabel = (r) => {
  const g = r.grid - r.pos
  return g > 0 ? `▲${g}` : g < 0 ? `▼${-g}` : '='
}
const gainClass = (r) => (r.grid - r.pos > 0 ? 'gain-up' : r.grid - r.pos < 0 ? 'gain-down' : 'muted')

function toSeconds(t) {
  if (!t) return null
  const [m, s] = t.includes(':') ? t.split(':') : ['0', t]
  return parseInt(m) * 60 + parseFloat(s)
}

const bestTimes = computed(() => {
  const best = {}
  for (const key of ['q1', 'q2', 'q3']) {
    const times = (race.value?.qualifyingResults ?? []).map((q) => q[key]).filter(Boolean)
    best[key] = times.sort((a, b) => toSeconds(a) - toSeconds(b))[0] ?? null
  }
  return best
})

/** Écart à la pole sur la dernière séance disputée par le pilote */
function qualiGap(q) {
  if (q.pos === 1) return 'Pole'
  const key = q.q3 ? 'q3' : q.q2 ? 'q2' : 'q1'
  const mine = toSeconds(q[key])
  const ref = toSeconds(bestTimes.value[key])
  return mine && ref ? `+${(mine - ref).toFixed(3)}` : ''
}

// ---------------------------------------------------------------------------
// Course à venir : météo + vainqueurs passés
// ---------------------------------------------------------------------------

const weather = ref(null)
const pastWinners = ref([])

watch(
  () => race.value?.id,
  async () => {
    weather.value = null
    pastWinners.value = []
    if (!race.value || race.value.completed) return
    const r = race.value
    const [w, past] = await Promise.allSettled([
      fetchSessionWeather(r, weekendSessions(r)),
      fetchCircuitWinners(r.circuitId, 8),
    ])
    weather.value = w.status === 'fulfilled' ? w.value : null
    pastWinners.value = past.status === 'fulfilled' ? past.value.filter((x) => x.season < r.season) : []
  },
  { immediate: true },
)

// ---------------------------------------------------------------------------
// OpenF1 : stratégie et positions (chargées à l'ouverture de l'onglet)
// ---------------------------------------------------------------------------

const openf1 = reactive({ loading: false, error: null, raceId: null, drivers: null, stints: [], positions: null })

async function loadOpenF1() {
  const r = race.value
  if (!r || openf1.raceId === r.id) return
  openf1.raceId = r.id
  openf1.loading = true
  openf1.error = null
  openf1.stints = []
  openf1.positions = null
  try {
    const session = await findSession(r, 'Race')
    if (!session) throw new Error('Séance introuvable dans OpenF1.')
    const winnerNumber = r.results.find((x) => x.pos === 1)?.number
    const [drivers, stints, positions] = await Promise.all([
      fetchSessionDrivers(session.session_key),
      fetchStints(session.session_key),
      winnerNumber ? fetchLapPositions(session.session_key, winnerNumber) : null,
    ])
    openf1.drivers = drivers
    openf1.stints = stints
    openf1.positions = positions
    if (!stints.length) openf1.error = 'Pas de données pneus pour cette course.'
  } catch (err) {
    openf1.error = err.message?.startsWith('Séance') ? err.message : 'Données OpenF1 indisponibles pour le moment.'
    openf1.raceId = null
  } finally {
    openf1.loading = false
  }
}

watch(tab, (t) => {
  if (t === 'strategy' || t === 'positions') loadOpenF1()
})

/** Résultat Jolpica correspondant à un numéro OpenF1 (via le code pilote) */
function resultForNumber(number) {
  const code = openf1.drivers?.get(number)?.code
  return race.value.results.find((r) => r.driver === code) ?? race.value.results.find((r) => r.number === number)
}

const maxLap = computed(() => Math.max(1, ...openf1.stints.map((s) => s.lapEnd ?? 0)))

const strategyRows = computed(() => {
  const byDriver = new Map()
  for (const s of openf1.stints) {
    if (!byDriver.has(s.driverNumber)) byDriver.set(s.driverNumber, [])
    byDriver.get(s.driverNumber).push({ ...s, lapEnd: s.lapEnd ?? maxLap.value })
  }
  return [...byDriver.entries()]
    .map(([number, stints]) => {
      const res = resultForNumber(number)
      return {
        number,
        code: res?.driver ?? openf1.drivers?.get(number)?.code ?? String(number),
        color: res?.color ?? openf1.drivers?.get(number)?.color ?? 'var(--text)',
        pos: res?.classified ? res.pos : null,
        order: res?.pos ?? 99,
        highlight: res?.constructorId === prefs.favoriteTeamId,
        stints: stints.sort((a, b) => a.stint - b.stint),
      }
    })
    .sort((a, b) => a.order - b.order)
})

const positionLabels = computed(() =>
  openf1.positions ? Array.from({ length: openf1.positions.laps + 1 }, (_, i) => (i === 0 ? 'Dép.' : `T${i}`)) : [],
)

const positionSeries = computed(() => {
  if (!openf1.positions) return []
  return [...openf1.positions.series.entries()]
    .map(([number, values]) => {
      const res = resultForNumber(number)
      // Après un abandon, la courbe s'arrête au dernier tour bouclé
      const lastLap = res && !res.classified ? res.laps : openf1.positions.laps
      return {
        id: String(number),
        label: res?.driver ?? openf1.drivers?.get(number)?.code ?? String(number),
        color: res?.color ?? openf1.drivers?.get(number)?.color ?? '#888',
        values: values.slice(0, lastLap + 1).concat(new Array(Math.max(0, openf1.positions.laps - lastLap)).fill(null)),
        highlight: res?.constructorId === prefs.favoriteTeamId || res?.pos <= 3,
        order: res?.pos ?? 99,
      }
    })
    .sort((a, b) => a.order - b.order)
})
</script>

<style scoped>
.small { font-size: 12px; }

.rd-hero {
  position: relative;
  padding: 32px 0 40px;
  border-bottom: 1px solid var(--line);
  overflow: hidden;
}

.rd-glow {
  position: absolute;
  right: -10%;
  top: -30%;
  width: 60%;
  height: 160%;
  background: radial-gradient(closest-side, rgb(var(--accent-rgb) / 0.18), transparent);
  pointer-events: none;
}

.rd-hero-grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 32px;
  align-items: center;
}

.back {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
}
.back:hover { color: var(--text); }

.rd-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.rd-title { margin-bottom: 10px; }
.rd-place { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.rd-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
  margin-top: 24px;
}

.rd-facts > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-weight: 700;
}

.rd-circuit { height: 240px; }

.rd-body { padding-top: 32px; }

.rd-tabs { margin-bottom: 16px; }

.upcoming-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: 16px;
}

.weekend-results { margin-top: 16px; }

.wr-head {
  flex-wrap: wrap;
  padding: 12px 16px 4px;
}

.live-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-left: 4px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 1.4s ease-in-out infinite;
}

.past-winners { list-style: none; }

.past-winners li {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 9px 0 9px 12px;
  border-bottom: 1px solid var(--line);
  border-left: 3px solid var(--tc);
  font-weight: 600;
}

.past-winners li:last-child { border-bottom: none; }

/* Tableaux */
.table-card { padding: 8px 0; overflow: hidden; }

.res-head,
.res-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 76px 52px minmax(0, 200px) 40px;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
}

.q-head,
.q-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 90px 90px 90px 76px;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
}

.res-head,
.q-head {
  height: 36px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-left: 3px solid transparent;
}

.res-list { list-style: none; }

.res-row,
.q-row {
  min-height: 52px;
  border-top: 1px solid var(--line);
  animation: rise 0.4s var(--ease) both;
}

.res-row.out { opacity: 0.55; }

.c-pos { font-weight: 700; font-size: 16px; text-align: center; }
.c-pts, .c-gap { text-align: right; }
.c-pts { font-weight: 700; }

.c-driver {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}

.c-driver strong,
.c-driver span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.c-driver:hover strong { color: var(--accent); }

.c-grid { display: flex; gap: 8px; font-size: 13px; }
.gain { font-size: 11px; font-weight: 700; }

.c-time {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.fl-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 99px;
  font-size: 10px;
  background: rgba(176, 94, 255, 0.18);
  color: #c79bff;
}

.q-time { font-size: 13px; color: var(--text-dim); }
.q-time.best { color: #c79bff; font-weight: 700; }

.chart-skeleton { height: 360px; }

@media (max-width: 900px) {
  .rd-hero-grid { grid-template-columns: 1fr; }
  .rd-circuit { height: 180px; }
}

@media (max-width: 640px) {
  .res-head,
  .res-row { grid-template-columns: 30px minmax(0, 1fr) minmax(0, 96px) 24px; padding: 0 10px; gap: 8px; }
  .fl-time { display: none; }
  .c-grid, .c-laps { display: none; }
  .c-time { font-size: 11px; justify-content: flex-end; }
  .q-head,
  .q-row { grid-template-columns: 30px minmax(0, 1fr) 80px 64px; padding: 0 10px; gap: 8px; }
  .q-head > :nth-child(3),
  .q-head > :nth-child(4),
  .q-row > :nth-child(3),
  .q-row > :nth-child(4) { display: none; }
}
</style>
