<template>
  <div class="race-detail" v-if="race">
    <!-- Hero -->
    <div class="rd-hero">
      <div class="container rd-hero-inner">
        <router-link to="/season" class="back-btn">← Saison</router-link>
        <div class="rd-header">
          <div class="rd-flag">
            <img v-if="race.flag.includes('http')" :src="race.flag" style="width: 1.33em; height: 1em; object-fit: cover; border-radius: 0.15em; vertical-align: middle; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" />
            <span v-else>{{ race.flag }}</span>
          </div>
          <div class="rd-title">
            <div class="rd-num font-mono text-muted">Grand Prix #{{ race.id }}</div>
            <h1 class="rd-name font-display">{{ race.name }}</h1>
            <div class="rd-meta text-dim">
              {{ race.circuit }} · {{ formatDate(race.date) }}
            </div>
          </div>
          <div class="rd-status">
            <span v-if="isNext" class="badge badge-red">
              <span class="blink">●</span> Prochain Grand Prix
            </span>
            <span v-else-if="race.completed" class="badge badge-gold">✓ Course terminée</span>
            <span v-else class="badge badge-gray">À venir</span>
          </div>
        </div>

        <!-- Race info -->
        <div class="rd-info-grid">
          <div class="rd-info-item">
            <div class="ri-label">Pays</div>
            <div class="ri-val">
              <img v-if="race.flag.includes('http')" :src="race.flag" style="width: 1.33em; height: 1em; object-fit: cover; border-radius: 0.15em; vertical-align: middle;" />
              <span v-else>{{ race.flag }}</span>
              {{ race.country }}
            </div>
          </div>
          <div class="rd-info-item">
            <div class="ri-label">Circuit</div>
            <div class="ri-val">{{ race.circuit }}</div>
          </div>
          <div class="rd-info-item">
            <div class="ri-label">Tours</div>
            <div class="ri-val font-mono">{{ race.laps > 0 ? race.laps : '—' }}</div>
          </div>
          <div class="rd-info-item">
            <div class="ri-label">Distance</div>
            <div class="ri-val font-mono">{{ race.distance || '—' }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="container rd-body">
      <!-- Séances du week-end -->
      <div v-if="hasSessions" class="sessions-section">
        <h2 class="section-title font-display">Programme du week-end</h2>
        <div class="sessions-grid">
          <div class="session-card" v-if="race.fp1">
            <div class="sc-name">Essais Libres 1</div>
            <div class="sc-time font-mono">{{ formatDateTime(race.fp1.date, race.fp1.time) }}</div>
          </div>
          <div class="session-card" v-if="race.fp2">
            <div class="sc-name">Essais Libres 2</div>
            <div class="sc-time font-mono">{{ formatDateTime(race.fp2.date, race.fp2.time) }}</div>
          </div>
          <div class="session-card" v-if="race.fp3">
            <div class="sc-name">Essais Libres 3</div>
            <div class="sc-time font-mono">{{ formatDateTime(race.fp3.date, race.fp3.time) }}</div>
          </div>
          <div class="session-card sprint-quali-card" v-if="race.sprintQualifying">
            <div class="sc-name">Qualif. Sprint</div>
            <div class="sc-time font-mono">{{ formatDateTime(race.sprintQualifying.date, race.sprintQualifying.time) }}</div>
          </div>
          <div class="session-card sprint-card" v-if="race.sprint">
            <div class="sc-name">Sprint</div>
            <div class="sc-time font-mono">{{ formatDateTime(race.sprint.date, race.sprint.time) }}</div>
          </div>
          <div class="session-card quali-card" v-if="race.qualifying">
            <div class="sc-name">Qualifications</div>
            <div class="sc-time font-mono">{{ formatDateTime(race.qualifying.date, race.qualifying.time) }}</div>
          </div>
          <div class="session-card race-card">
            <div class="sc-name">Course</div>
            <div class="sc-time font-mono">{{ formatDateTime(race.date, race.time) }}</div>
          </div>
        </div>
      </div>

      <!-- Results if completed -->
      <div v-if="race.completed && race.results.length">
        <h2 class="section-title font-display">Résultats de la course</h2>
        <div class="results-list">
          <div
            v-for="(result, idx) in race.results"
            :key="idx"
            class="result-row card"
            :class="{ 'result-top': idx < 3 }"
          >
            <div class="rr-pos font-display" :class="`pos-${idx + 1}`">P{{ idx + 1 }}</div>
            <div class="rr-driver">
              <router-link :to="`/drivers/${getDriverId(result)}`" class="rr-link">
                <span class="rr-code font-mono">{{ result.driver }}</span>
                <span class="rr-name">{{ getDriverFullName(result) }}</span>
              </router-link>
              <span class="rr-team text-dim" :style="{ color: getDriverColor(result) }">{{ getDriverTeam(result) }}</span>
            </div>
            <div class="rr-time font-mono text-dim">{{ result.time }}</div>
            <div class="rr-medal" v-if="idx === 0">🏆</div>
            <div class="rr-medal" v-else-if="idx === 1">🥈</div>
            <div class="rr-medal" v-else-if="idx === 2">🥉</div>
          </div>
        </div>


        <!-- Winner detail -->
        <div class="winner-spotlight" v-if="winner" :style="{ '--tc': winner.color }">
          <div class="ws-inner">
            <div class="ws-badge badge badge-gold">🏆 Vainqueur</div>
            <div class="ws-name font-display">{{ winner.name }}</div>
            <div class="ws-team" :style="{ color: winner.color }">{{ winner.team }}</div>
            <div class="ws-time font-mono text-dim">{{ race.results[0]?.time }}</div>
          </div>
          <div class="ws-num font-display" :style="{ color: winner.color }">{{ winner.number }}</div>
        </div>
      </div>

      <!-- Not yet run -->
      <div v-else-if="!race.completed" class="not-run">
        <div class="nr-icon">⏳</div>
        <div class="nr-title font-display">Course à venir</div>
        <p class="nr-sub text-dim">Les résultats seront disponibles après le {{ formatDate(race.date) }}</p>
      </div>
    </div>
  </div>

  <div v-else class="container" style="padding: 80px 24px; text-align: center;">
    <div class="text-muted">Course introuvable</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useF1Store } from '@/stores/f1Store'

const route = useRoute()
const store = useF1Store()

const race = computed(() => store.races.find(r => r.id === parseInt(route.params.id)))
const isNext = computed(() => store.nextRace?.id === race.value?.id)

const hasSessions = computed(() => !!(race.value?.fp1 || race.value?.qualifying || race.value?.sprintQualifying))

// Recherche par code 3 lettres (shortName) ou par driverId
const getDriver = (code) => store.drivers.find(d => d.shortName === code || d.shortName === code?.toUpperCase())

// Utilise driverId si disponible (résultats API), sinon lookup par code
const getDriverId = (result) => result.driverId ?? getDriver(result.driver)?.id
const getDriverFullName = (result) => result.driverName ?? getDriver(result.driver)?.name ?? result.driver
const getDriverTeam = (result) => result.constructor ?? getDriver(result.driver)?.team ?? ''
const getDriverColor = (result) => {
  if (result.constructorId) {
    const team = store.teams.find(t => t.id === result.constructorId)
    return team?.color ?? 'var(--white)'
  }
  return getDriver(result.driver)?.color ?? 'var(--white)'
}

const winner = computed(() => {
  if (!race.value?.completed || !race.value.results.length) return null
  const firstResult = race.value.results[0]
  return getDriver(firstResult.driver) ?? {
    name: firstResult.driverName ?? firstResult.driver,
    team: firstResult.constructor ?? '',
    color: 'var(--gold)',
    number: '',
  }
})

const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const formatDateTime = (dateStr, timeStr) => {
  if (!dateStr) return 'Horaire non défini'
  if (!timeStr) return formatDate(dateStr)
  // timeStr est généralement au format "14:00:00Z"
  const d = new Date(`${dateStr}T${timeStr}`)
  // capitaliser la première lettre du jour
  const str = d.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return str.charAt(0).toUpperCase() + str.slice(1)
}
</script>


<style scoped>
.rd-hero {
  padding: 24px 0 40px;
  border-bottom: 1px solid var(--border);
  background: radial-gradient(ellipse at 30% 50%, rgba(232,0,45,0.05) 0%, transparent 70%);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--white-muted);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 24px;
  transition: color var(--transition);
}

.back-btn:hover { color: var(--white); }

.rd-header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.rd-flag { font-size: 56px; line-height: 1; }
.rd-title { flex: 1; }
.rd-num { font-size: 12px; margin-bottom: 6px; }
.rd-name { font-size: clamp(32px, 4vw, 52px); margin-bottom: 8px; }
.rd-meta { font-size: 14px; }
.rd-status { margin-left: auto; }

.rd-info-grid {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}



.ri-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--white-muted);
  margin-bottom: 4px;
}

.ri-val {
  font-size: 14px;
  font-weight: 500;
}

/* Body */
.rd-body { padding: 40px 0; }

/* Sessions */
.sessions-section {
  margin-bottom: 48px;
}

.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.session-card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform var(--transition), border-color var(--transition);
}

.session-card:hover {
  transform: translateY(-3px);
  border-color: rgba(255,255,255,0.2);
}

.sc-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--white);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sc-time {
  font-size: 14px;
  color: var(--white-muted);
}

.quali-card {
  border-color: rgba(232,0,45,0.3);
}
.quali-card .sc-name {
  color: var(--red);
}

.sprint-quali-card {
  border-color: rgba(255,128,0,0.3);
}
.sprint-quali-card .sc-name {
  color: #FF8000;
}

.sprint-card {
  border-color: rgba(212,175,55,0.3);
}
.sprint-card .sc-name {
  color: var(--gold);
}

.race-card {
  background: linear-gradient(135deg, rgba(232,0,45,0.1), transparent);
  border-color: rgba(232,0,45,0.5);
}
.race-card .sc-name {
  color: var(--red);
  font-size: 15px;
}
.race-card .sc-time {
  color: var(--white);
  font-weight: 600;
}

.section-title {
  font-size: 32px;
  margin-bottom: 20px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 32px;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
}

.result-top {
  background: var(--surface2);
}

.rr-pos {
  font-size: 24px;
  min-width: 48px;
}

.rr-driver {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rr-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--white);
}

.rr-link:hover .rr-name { color: var(--red); }

.rr-code {
  font-size: 13px;
  font-weight: 700;
  background: rgba(255,255,255,0.06);
  padding: 2px 8px;
  border-radius: 4px;
}

.rr-name { font-size: 15px; font-weight: 600; }
.rr-team { font-size: 12px; }
.rr-time { font-size: 13px; min-width: 120px; text-align: right; }
.rr-medal { font-size: 20px; }

/* Winner spotlight */
.winner-spotlight {
  background: linear-gradient(135deg, rgba(212,175,55,0.08), var(--surface));
  border: 1px solid rgba(212,175,55,0.2);
  border-radius: 16px;
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.ws-badge { margin-bottom: 12px; display: inline-flex; }
.ws-name { font-size: 36px; margin-bottom: 4px; }
.ws-team { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
.ws-time { font-size: 14px; }
.ws-num {
  font-size: 120px;
  line-height: 1;
  opacity: 0.1;
  position: absolute;
  right: 24px;
}

/* Not run */
.not-run {
  text-align: center;
  padding: 80px 24px;
}

.nr-icon { font-size: 48px; margin-bottom: 16px; }
.nr-title { font-size: 36px; margin-bottom: 8px; }
.nr-sub { font-size: 15px; }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.blink { animation: blink 1s ease-in-out infinite; }
</style>
