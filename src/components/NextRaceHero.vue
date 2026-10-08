<template>
  <section class="hero">
    <div class="hero-glow" aria-hidden="true"></div>
    <div class="hero-lines" aria-hidden="true">
      <span v-for="i in 6" :key="i" :style="{ top: `${12 + i * 13}%`, animationDelay: `${i * 0.7}s` }"></span>
    </div>

    <div class="container hero-grid">
      <div class="hero-main">
        <div class="hero-tags">
          <span class="badge badge-accent" :class="{ 'badge-live': isLive }">
            {{ isLive ? 'Week-end en cours' : 'Prochain Grand Prix' }}
          </span>
          <span class="badge mono">Manche {{ race.round }}/{{ totalRounds }}</span>
          <span v-if="race.sprint" class="badge"><Icon name="bolt" :size="12" /> Sprint</span>
        </div>

        <h1 class="title-xl hero-title">
          <span v-for="(word, i) in titleWords" :key="i" class="word" :style="{ animationDelay: `${i * 90}ms` }">{{ word }}</span>
        </h1>

        <div class="hero-place dim">
          <Flag :src="race.flag" :alt="race.country" :size="16" />
          <span>{{ race.circuit }}</span>
          <span class="muted">·</span>
          <span class="mono">{{ formatWeekendRange(race) }}</span>
        </div>

        <div v-if="session" class="hero-countdown">
          <div class="eyebrow">{{ sessionLive ? "Fin estimée dans" : "Départ dans" }} · <span class="accent">{{ session.label }}</span></div>
          <Countdown :target="sessionLive ? session.end : session.start" @elapsed="tick" />
        </div>

        <router-link :to="`/season/${race.id}`" class="btn hero-cta">
          Programme et infos <Icon name="arrow-right" :size="16" />
        </router-link>
      </div>

      <div class="hero-side">
        <div class="hero-circuit">
          <CircuitMap :circuit-id="race.circuitId" :label="race.circuit" animated />
        </div>

        <div class="card hero-panel">
          <div class="card-head">
            <span class="eyebrow">Programme du week-end</span>
            <span class="muted panel-hint">heure locale</span>
          </div>
          <WeekendSchedule :race="race" :weather="weather" />
        </div>

        <!-- Pendant le week-end : classement de la dernière séance -->
        <div v-if="lastSession" class="card hero-panel last-session">
          <div class="card-head">
            <span class="eyebrow">
              <span v-if="lastSession.status === 'live'" class="accent">● </span>{{ lastSession.label }}
            </span>
            <router-link :to="`/season/${race.id}`" class="link-arrow">Classement complet →</router-link>
          </div>
          <SessionResults :rows="lastSession.rows" :status="lastSession.status" :limit="5" />
        </div>

        <div v-if="winners.length" class="hero-winners">
          <span class="eyebrow">Derniers vainqueurs ici</span>
          <div class="winners-list">
            <router-link
              v-for="w in winners"
              :key="w.season"
              :to="`/drivers/${w.driverId}`"
              class="winner-chip"
              :style="{ '--tc': w.color }"
              :title="`${w.driver} · ${w.constructor}`"
            >
              <span class="mono muted">{{ w.season }}</span>
              <span class="winner-code">{{ w.code ?? w.driver.split(' ').pop() }}</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import Flag from './Flag.vue'
import Countdown from './Countdown.vue'
import CircuitMap from './CircuitMap.vue'
import WeekendSchedule from './WeekendSchedule.vue'
import SessionResults from './SessionResults.vue'
import { useWeekendResults } from '@/composables/useWeekendResults'
import { nextSession, weekendSessions, formatWeekendRange } from '@/utils/race'
import { fetchCircuitWinners } from '@/services/jolpica'
import { fetchSessionWeather } from '@/services/weather'

const props = defineProps({
  race: { type: Object, required: true },
  totalRounds: { type: Number, required: true },
})

const now = ref(new Date())
const tick = () => (now.value = new Date())

const session = computed(() => nextSession(props.race, now.value))
const sessionLive = computed(() => Boolean(session.value) && session.value.start <= now.value)
const isLive = computed(() => {
  const sessions = weekendSessions(props.race)
  return sessions.length > 0 && sessions[0].start <= now.value
})

const titleWords = computed(() => props.race.name.replace(/Grand Prix/i, 'GP').split(' '))

const weather = ref(null)
const winners = ref([])

// Résultats des séances déjà disputées ce week-end (EL, qualifs, sprint)
const { sessions: weekend } = useWeekendResults(computed(() => props.race))
const lastSession = computed(() => weekend.value.filter((s) => s.status !== 'upcoming').at(-1) ?? null)

watch(
  () => props.race.id,
  async () => {
    weather.value = null
    winners.value = []
    const [w, past] = await Promise.allSettled([
      fetchSessionWeather(props.race, weekendSessions(props.race)),
      fetchCircuitWinners(props.race.circuitId, 5),
    ])
    weather.value = w.status === 'fulfilled' ? w.value : null
    winners.value = past.status === 'fulfilled' ? past.value.filter((x) => x.season < props.race.season) : []
  },
  { immediate: true },
)
</script>

<style scoped>
.hero {
  position: relative;
  padding: 48px 0 56px;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
}

.hero-glow {
  position: absolute;
  inset: -20% -10% auto auto;
  width: 70%;
  height: 120%;
  background: radial-gradient(closest-side, rgb(var(--accent-rgb) / 0.22), transparent);
  pointer-events: none;
  transition: background 0.6s;
}

.hero-lines span {
  position: absolute;
  left: 0;
  width: 40%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0.25;
  animation: streak 5s linear infinite;
}

@keyframes streak {
  from { transform: translateX(-100%); }
  to { transform: translateX(260%); }
}

.hero-grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 40px;
  align-items: center;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.hero-title {
  display: flex;
  flex-wrap: wrap;
  column-gap: 0.25em;
  margin-bottom: 16px;
}

.word {
  display: inline-block;
  animation: word-in 0.8s var(--ease) both;
}

@keyframes word-in {
  from { opacity: 0; transform: translateY(40%) skewY(6deg); clip-path: inset(0 0 100% 0); }
  to { opacity: 1; transform: none; clip-path: inset(0 0 0 0); }
}

.hero-place {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  margin-bottom: 28px;
}

.hero-countdown {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 28px;
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-circuit {
  height: 230px;
  padding: 8px;
}

.hero-panel { padding: 16px 18px; }
.last-session { padding-bottom: 6px; }
.last-session :deep(.sr-head),
.last-session :deep(.sr-row) { padding: 0; }
.last-session :deep(.sr-head) { display: none; }
.last-session :deep(.sr-row) { min-height: 40px; }
.panel-hint { font-size: 11px; }

.winners-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.winner-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 99px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-left: 3px solid var(--tc);
  transition: border-color var(--t);
}

.winner-chip:hover { border-color: var(--line-strong); border-left-color: var(--tc); }
.winner-code { font-weight: 700; }

@media (max-width: 960px) {
  .hero { padding: 28px 0 40px; }
  .hero-grid { grid-template-columns: 1fr; gap: 24px; }
  .hero-circuit { height: 180px; }
}
</style>
