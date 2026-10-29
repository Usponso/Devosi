<template>
  <div class="replay">
    <!-- Séances du week-end -->
    <div class="sessions" role="tablist" aria-label="Séance">
      <button
        v-for="s in sessions"
        :key="s.key"
        role="tab"
        class="chip"
        :class="{ on: selected?.key === s.key }"
        :aria-selected="selected?.key === s.key"
        :disabled="s.status === 'upcoming'"
        @click="select(s)"
      >
        <span v-if="s.status === 'live'" class="live-dot" aria-hidden="true"></span>{{ s.short }}
      </button>
      <span v-if="trackState" class="track-state" :class="trackState.toLowerCase()">
        <Icon name="flag" :size="13" /> {{ TRACK_LABEL[trackState] }}
      </span>
    </div>

    <p v-if="!sessions.length && !listLoading" class="muted empty">Aucune séance disponible pour ce Grand Prix.</p>
    <div v-else-if="listLoading || loading" class="skeleton replay-skeleton"></div>

    <!-- Séance en cours : chrono, le replay arrive après -->
    <div v-else-if="selected?.status === 'live'" class="live card-in">
      <span class="live-badge"><span class="live-dot"></span> Séance en cours</span>
      <div class="live-clock mono">{{ liveElapsed }}</div>
      <p class="muted">{{ selected.label }} · le replay sera disponible vers {{ readyAt }}, environ 30 minutes après la fin.</p>
    </div>

    <p v-else-if="error" class="muted empty">{{ error }}</p>

    <template v-else-if="model">
      <div class="layout" :class="{ timed: model.kind === 'timed' }">
        <!-- Classement -->
        <div class="tower">
          <div class="tower-head">
            <span class="title-sm">{{ progressLabel }}</span>
            <span class="muted small">{{ model.kind === 'race' ? 'Écart' : 'Meilleur tour' }}</span>
          </div>
          <TransitionGroup tag="ol" name="tower" class="rows">
            <li v-for="r in rows" :key="r.n" class="row" :class="{ out: r.out, me: favoriteNumbers.has(r.n) }">
              <span class="pos mono">{{ r.out ? '—' : r.pos }}</span>
              <span class="bar" :style="{ background: driver(r.n).color }"></span>
              <span class="code">{{ driver(r.n).code }}</span>
              <span v-if="r.delta > 0" class="delta up">▲{{ r.delta }}</span>
              <span v-else-if="r.delta < 0" class="delta down">▼{{ -r.delta }}</span>
              <span v-if="r.pit" class="tag pit">PIT</span>
              <span class="gap mono">{{ r.label }}</span>
            </li>
          </TransitionGroup>
        </div>

        <!-- Tracé et événements -->
        <div class="side">
          <div v-if="model.kind === 'race' && shape" class="map">
            <svg :viewBox="shape.viewBox" role="img" aria-label="Position des voitures sur le tracé">
              <path ref="trackPath" class="track" :d="shape.d" />
              <circle v-for="dot in dots" :key="dot.n" :cx="dot.x" :cy="dot.y" :r="dot.lead ? 20 : 15" :fill="dot.color" class="car" :class="{ lead: dot.lead }" />
            </svg>
            <span class="map-note muted">Positions estimées d'après les écarts</span>
          </div>
          <div class="feed">
            <div class="title-sm">Événements</div>
            <p v-if="!feed.length" class="muted small">Rien à signaler pour l'instant.</p>
            <TransitionGroup v-else tag="ul" name="feed" class="feed-list">
              <li v-for="e in feed" :key="e.id" :class="`ev-${e.kind}`">
                <span class="ev-when mono">{{ e.when }}</span>
                <span>
                  <b v-if="e.n">{{ driver(e.n).code }}</b> {{ e.text }} <b v-if="e.other">{{ driver(e.other).code }}</b>
                </span>
              </li>
            </TransitionGroup>
          </div>
        </div>
      </div>

      <!-- Lecture -->
      <div class="controls">
        <button class="btn play" :aria-label="playing ? 'Pause' : 'Lecture'" @click="toggle">
          <Icon :name="playing ? 'pause' : 'play'" :size="16" />
        </button>
        <input
          v-model.number="t"
          class="scrub"
          type="range"
          min="0"
          :max="end"
          :step="model.kind === 'race' ? 0.01 : 1"
          aria-label="Position dans la séance"
          @input="playing = false"
        />
        <div class="speeds" role="group" aria-label="Vitesse">
          <button v-for="s in SPEEDS" :key="s" class="chip small" :class="{ on: speed === s }" @click="speed = s">×{{ s }}</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import circuits from '@/data/circuits.json'
import { useF1Store } from '@/stores/f1Store'
import { usePrefsStore } from '@/stores/prefsStore'
import { fetchReplayData, findWeekendSessions } from '@/services/openf1'
import { weekendSessions } from '@/utils/race'
import { buildRaceReplay, buildTimedReplay, formatLapTime, timedStandings } from '@/utils/replay'

const props = defineProps({ race: { type: Object, required: true } })

const SPEEDS = [1, 4, 16]
const TRACK_LABEL = { SC: 'Safety car', VSC: 'Virtual safety car', RED: 'Drapeau rouge' }
// Vitesse ×1 : 1 tour toutes les 4 s (course), 30 s de séance par seconde (qualifs, essais)
const RACE_RATE = 0.25
const TIMED_RATE = 30
// OpenF1 publie les données d'une séance environ 30 min après sa fin
const PUBLISH_DELAY = 30 * 60000

const store = useF1Store()
const prefs = usePrefsStore()

// ---------------------------------------------------------------------------
// Séances
// ---------------------------------------------------------------------------
const sessions = ref([])
const listLoading = ref(true)
const selected = ref(null)
const now = ref(Date.now())

async function loadSessions() {
  listLoading.value = true
  try {
    const labels = Object.fromEntries(weekendSessions(props.race).map((s) => [s.key, s]))
    const found = await findWeekendSessions(props.race)
    sessions.value = found
      .map((s) => {
        const status = now.value < s.start.getTime() ? 'upcoming' : now.value < s.end.getTime() + PUBLISH_DELAY ? 'live' : 'done'
        return { ...s, status, short: labels[s.key]?.short ?? s.key, label: labels[s.key]?.label ?? s.key }
      })
      .sort((a, b) => a.start - b.start)
    // Par défaut : la course, sinon la dernière séance courue
    const started = sessions.value.filter((s) => s.status !== 'upcoming')
    select(started.find((s) => s.key === 'race') ?? started.at(-1) ?? null)
  } catch {
    sessions.value = []
  } finally {
    listLoading.value = false
  }
}

// ---------------------------------------------------------------------------
// Données et modèle de replay
// ---------------------------------------------------------------------------
const loading = ref(false)
const error = ref('')
const model = shallowRef(null)
const drivers = shallowRef(new Map())

async function select(session) {
  selected.value = session
  playing.value = false
  model.value = null
  error.value = ''
  if (!session || session.status !== 'done') return
  loading.value = true
  try {
    const data = await fetchReplayData(session.sessionKey)
    if (selected.value !== session) return
    drivers.value = data.drivers
    if (!data.laps.length) throw new Error('empty')
    if (session.key === 'race' || session.key === 'sprint') {
      const results = session.key === 'race' ? props.race.results : props.race.sprintResults
      model.value = { kind: 'race', ...buildRaceReplay(data, results ?? []) }
    } else {
      model.value = { kind: 'timed', ...buildTimedReplay(data, session.start, session.end) }
    }
    t.value = 0
  } catch {
    if (selected.value === session) error.value = 'Données de replay indisponibles pour cette séance.'
  } finally {
    if (selected.value === session) loading.value = false
  }
}

/** Pilote : code et couleur (OpenF1, sinon classement de la saison) */
function driver(n) {
  const o = drivers.value.get(n)
  const s = store.drivers.find((d) => d.number === n)
  return { code: o?.code ?? s?.shortName ?? `#${n}`, color: o?.color ?? s?.color ?? '#8a8f98' }
}

/** Pilotes de mon écurie favorite, surlignés */
const favoriteNumbers = computed(() => {
  const team = prefs.favoriteTeamId
  return new Set(store.drivers.filter((d) => team && d.teamId === team).map((d) => d.number))
})

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------
const t = ref(0)
const playing = ref(false)
const speed = ref(4)
const end = computed(() => (model.value?.kind === 'race' ? model.value.totalLaps : Math.ceil(model.value?.duration ?? 0)))

let raf = null
let last = 0
function frame(ts) {
  const dt = last ? (ts - last) / 1000 : 0
  last = ts
  const rate = model.value?.kind === 'race' ? RACE_RATE : TIMED_RATE
  t.value = Math.min(end.value, t.value + dt * rate * speed.value)
  if (t.value >= end.value) playing.value = false
  if (playing.value) raf = requestAnimationFrame(frame)
}

watch(playing, (on) => {
  cancelAnimationFrame(raf)
  last = 0
  if (on) raf = requestAnimationFrame(frame)
})

function toggle() {
  if (!playing.value && t.value >= end.value) t.value = 0
  playing.value = !playing.value
}

// ---------------------------------------------------------------------------
// Classement affiché
// ---------------------------------------------------------------------------
const lap = computed(() => Math.floor(t.value))
const second = computed(() => Math.floor(t.value))

const rows = computed(() => {
  const m = model.value
  if (!m) return []
  if (m.kind === 'race') {
    const frameRows = m.frames[Math.min(lap.value, m.totalLaps)]
    const prev = new Map((m.frames[lap.value - 1] ?? []).map((r) => [r.n, r.pos]))
    return frameRows.map((r) => ({
      ...r,
      delta: prev.has(r.n) && !r.out ? prev.get(r.n) - r.pos : 0,
      label: r.out ? 'Abandon' : lap.value === 0 ? 'Grille' : r.pos === 1 ? 'Leader' : r.lapsDown ? `+${r.lapsDown} T` : r.gap != null ? `+${r.gap.toFixed(1)}` : '',
    }))
  }
  const numbers = [...drivers.value.keys()]
  return timedStandings(m, second.value, numbers).map((r, i) => ({
    n: r.n,
    pos: i + 1,
    delta: 0,
    pit: false,
    out: false,
    label: r.time == null ? 'Pas de temps' : i === 0 ? formatLapTime(r.time) : `+${r.gap.toFixed(3)}`,
  }))
})

const progressLabel = computed(() => {
  const m = model.value
  if (!m) return ''
  if (m.kind === 'race') return lap.value === 0 ? 'Grille de départ' : `Tour ${lap.value} / ${m.totalLaps}`
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  return `${fmt(second.value)} / ${fmt(m.duration)}`
})

const trackState = computed(() => (model.value?.kind === 'race' ? model.value.track[lap.value] ?? null : null))

/** 6 derniers événements jusqu'au moment affiché, du plus récent au plus ancien */
const feed = computed(() => {
  const m = model.value
  if (!m) return []
  const list = m.kind === 'race' ? m.events.filter((e) => e.lap <= lap.value) : m.events.filter((e) => e.t <= second.value)
  return list
    .slice(-6)
    .reverse()
    .map((e, i) => ({
      ...e,
      id: `${e.lap ?? e.t}-${e.kind}-${e.n ?? ''}-${e.other ?? ''}-${i}`,
      when: m.kind === 'race' ? `T${e.lap}` : `${Math.floor(e.t / 60)}'`,
    }))
})

// ---------------------------------------------------------------------------
// Tracé : voitures placées d'après leur écart au leader
// ---------------------------------------------------------------------------
const shape = computed(() => circuits[props.race.circuitId] ?? null)
const trackPath = ref(null)

const dots = computed(() => {
  const m = model.value
  const path = trackPath.value
  if (m?.kind !== 'race' || !path) return []
  const length = path.getTotalLength()
  const L = Math.min(lap.value, m.totalLaps)
  const lapTime = m.lapTimes[Math.min(L + 1, m.totalLaps)] || 95
  const phase = L >= m.totalLaps ? 0 : t.value - L
  return m.frames[L]
    .filter((r) => !r.out)
    .map((r) => {
      const behind = L === 0 ? (r.pos - 1) * 0.006 : (r.gap ?? 0) / lapTime
      const p = (((phase - behind) % 1) + 1) % 1
      const pt = path.getPointAtLength(p * length)
      return { n: r.n, x: pt.x, y: pt.y, color: driver(r.n).color, lead: r.pos === 1 }
    })
    .reverse()
})

// ---------------------------------------------------------------------------
// Séance en cours
// ---------------------------------------------------------------------------
const liveElapsed = computed(() => {
  if (!selected.value) return ''
  const s = Math.max(0, Math.floor((now.value - selected.value.start.getTime()) / 1000))
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
})
const readyAt = computed(() =>
  selected.value ? new Date(selected.value.end.getTime() + PUBLISH_DELAY).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
)

const clock = setInterval(() => {
  now.value = Date.now()
  // Séance tout juste publiée : on recharge la liste
  if (selected.value?.status === 'live' && now.value > selected.value.end.getTime() + PUBLISH_DELAY) loadSessions()
}, 1000)

watch(() => props.race?.id, () => props.race && loadSessions(), { immediate: true })

onUnmounted(() => {
  clearInterval(clock)
  cancelAnimationFrame(raf)
})
</script>

<style scoped>
.replay { display: flex; flex-direction: column; gap: 16px; }

.sessions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 99px;
  border: 1px solid var(--line);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dim);
  background: var(--surface-2);
  cursor: pointer;
}

.chip.on { color: var(--on-accent); background: var(--accent); border-color: var(--accent); }
.chip:disabled { opacity: 0.4; cursor: default; }
.chip.small { padding: 4px 10px; font-size: 12px; }

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff3b3b;
  box-shadow: 0 0 0 3px rgb(255 59 59 / 0.25);
}

.track-state {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  color: #ffd65a;
  background: rgb(232 193 90 / 0.14);
}

.track-state.red { color: #ff8a8a; background: rgb(225 6 0 / 0.18); }

.empty { padding: 24px 0; }
.replay-skeleton { height: 420px; border-radius: 12px; }

.live {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 16px;
  text-align: center;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #ff8a8a;
}

.live-clock { font-size: 48px; font-weight: 700; line-height: 1; }

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.title-sm { font-weight: 800; font-size: 15px; }
.small { font-size: 12px; }

.tower-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }

.rows { margin: 0; padding: 0; list-style: none; position: relative; }

.row {
  display: grid;
  grid-template-columns: 26px 4px 44px auto auto 1fr;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 14px;
}

.row:nth-child(odd) { background: rgb(255 255 255 / 0.025); }
.row.me { background: var(--accent-soft); }
.row.out { opacity: 0.45; }

.pos { color: var(--text-muted); font-weight: 700; text-align: right; }
.bar { width: 4px; height: 18px; border-radius: 2px; }
.code { font-weight: 800; letter-spacing: 0.02em; }
.delta { font-size: 11px; font-weight: 700; }
.delta.up { color: var(--success); }
.delta.down { color: #ff6b6b; }

.tag {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
}

.tag.pit { color: #111; background: #ffd65a; }

.gap { grid-column: 6; justify-self: end; color: var(--text-dim); font-size: 13px; }

/* Changements de place animés (transform : composité, sans recalcul de mise en page) */
.tower-move { transition: transform 0.45s var(--ease); }

.side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.map {
  position: relative;
  padding: 16px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.map svg { display: block; width: 100%; height: 240px; overflow: visible; }
.track { fill: none; stroke: var(--surface-3); stroke-width: 22; stroke-linejoin: round; stroke-linecap: round; }
.car { stroke: #0b0c0f; stroke-width: 4; }
.car.lead { stroke: #fff; stroke-width: 5; }
.map-note { position: absolute; left: 14px; bottom: 8px; font-size: 11px; }

.feed-list { margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }

.feed-list li {
  display: flex;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-dim);
  background: var(--surface-2);
}

.feed-list b { color: var(--text); }
.ev-when { min-width: 30px; color: var(--text-muted); font-size: 12px; }
.ev-flag { border-left: 3px solid #ffd65a; }
.ev-lead { border-left: 3px solid var(--accent); }
.ev-out { border-left: 3px solid #ff6b6b; }

.feed-enter-active { transition: opacity 0.3s, transform 0.3s var(--ease); }
.feed-enter-from { opacity: 0; transform: translateY(-6px); }

.controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.play { width: 40px; height: 40px; padding: 0; justify-content: center; }
.scrub { flex: 1; min-width: 160px; accent-color: var(--accent); }
.speeds { display: flex; gap: 6px; }

@media (max-width: 760px) {
  .layout { grid-template-columns: 1fr; }
  .side { order: -1; }
  .map svg { height: 180px; }
}

@media (prefers-reduced-motion: reduce) {
  .tower-move, .feed-enter-active { transition: none; }
}
</style>
