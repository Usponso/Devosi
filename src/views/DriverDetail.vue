<template>
  <div class="driver-detail" v-if="driver">
    <!-- Hero -->
    <div class="dd-hero" :style="{ '--tc': driver.color }">
      <div class="dd-hero-bg" :style="{ background: `radial-gradient(ellipse at 80% 50%, ${driver.color}15 0%, transparent 70%)` }"></div>
      <div class="container dd-hero-inner">
        <router-link to="/drivers" class="back-btn">← Pilotes</router-link>
        <div class="dd-header">
          <div class="dd-avatar" :style="{ background: `linear-gradient(135deg, ${driver.color}33, ${driver.color}11)`, border: `2px solid ${driver.color}55` }">
            <span class="dd-initials font-display" :style="{ color: driver.color }">{{ driver.shortName }}</span>
          </div>
          <div class="dd-title">
            <div class="dd-number font-display" :style="{ color: driver.color }">{{ driver.number }}</div>
            <h1 class="dd-name font-display">{{ driver.name }}</h1>
            <div class="dd-meta">
              <span class="dd-flag">
                <img v-if="driver.flag.includes('http')" :src="driver.flag" style="width: 1.33em; height: 1em; object-fit: cover; border-radius: 0.15em; vertical-align: middle;" />
                <span v-else>{{ driver.flag }}</span>
              </span>
              <span class="dd-nationality text-dim">{{ driver.nationality }}</span>
              <span class="sep-dot text-muted">·</span>
              <span class="dd-team" :style="{ color: driver.color }">{{ driver.team }}</span>
            </div>
          </div>
          <div class="dd-pts-block">
            <div class="pts-big font-display" :style="{ color: driver.color }">{{ driver.points }}</div>
            <div class="pts-big-label text-muted">Points {{ store.seasonYear }}</div>
            <div class="dd-rank font-mono text-dim">P{{ ranking }} au classement</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="container dd-body">
      <div class="dd-stats-grid">
        <div class="stat-box">
          <div class="stat-value font-mono">{{ careerStats ? careerStats.wins : '...' }}</div>
          <div class="stat-label">Victoires (Carrière)</div>
        </div>
        <div class="stat-box">
          <div class="stat-value font-mono">{{ careerStats ? careerStats.podiums : '...' }}</div>
          <div class="stat-label">Podiums (Carrière)</div>
        </div>
        <div class="stat-box">
          <div class="stat-value font-mono">{{ careerStats ? careerStats.poles : '...' }}</div>
          <div class="stat-label">Poles Position</div>
        </div>
        <div class="stat-box">
          <div class="stat-value font-mono">{{ careerStats ? careerStats.fastestLaps : '...' }}</div>
          <div class="stat-label">Meilleurs Tours</div>
        </div>
        <div class="stat-box">
          <div class="stat-value font-mono">{{ careerStats ? careerStats.races : '...' }}</div>
          <div class="stat-label">Courses Disputées</div>
        </div>
      </div>

      <div class="dd-section">
        <h2 class="dd-section-title font-display">À propos</h2>
        <p class="dd-bio text-dim">{{ driver.bio }}</p>
        <div class="dd-personal">
          <div class="personal-row">
            <span class="personal-label">Né le</span>
            <span class="personal-val">{{ driver.dob }}</span>
          </div>
          <div class="personal-row">
            <span class="personal-label">Numéro</span>
            <span class="personal-val font-mono">#{{ driver.number }}</span>
          </div>
          <div class="personal-row">
            <span class="personal-label">Nationalité</span>
            <span class="personal-val">
              <img v-if="driver.flag.includes('http')" :src="driver.flag" style="width: 1.33em; height: 1em; object-fit: cover; border-radius: 0.15em; vertical-align: middle;" />
              <span v-else>{{ driver.flag }}</span>
              {{ driver.nationality }}
            </span>
          </div>
        </div>
      </div>

      <!-- Bar chart for wins -->
      <div class="dd-section">
        <h2 class="dd-section-title font-display">Performance Saison</h2>
        <div class="perf-bars">
          <div class="perf-bar-row" v-for="(item, key) in perfItems" :key="key">
            <div class="perf-label text-dim">{{ item.label }}</div>
            <div class="perf-track">
              <div class="perf-fill" :style="{ width: item.pct + '%', background: driver.color }"></div>
            </div>
            <div class="perf-val font-mono">{{ item.val }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="container" style="padding: 80px 24px; text-align: center;">
    <div class="text-muted">Pilote introuvable</div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useF1Store } from '@/stores/f1Store'
import { fetchDriverCareerStats } from '@/services/f1Api'

const route = useRoute()
const store = useF1Store()

// L'ID est désormais une string (ex: "hamilton", "max_verstappen")
const driver = computed(() => store.getDriverById(route.params.id))
const ranking = computed(() => store.driverStandings.findIndex(d => d.id === driver.value?.id) + 1)

const careerStats = ref(null)

watch(() => route.params.id, async (id) => {
  if (!id) return
  careerStats.value = null
  careerStats.value = await fetchDriverCareerStats(id)
}, { immediate: true })

const perfItems = computed(() => {
  if (!driver.value) return []
  const leaders = store.driverStandings
  const maxPts = leaders[0]?.points || 1
  const maxWins = Math.max(...leaders.map(d => d.wins), 1)
  
  // Dans le store, .wins représente les victoires DE LA SAISON.
  // Ce classement correspond à la forme du pilote sur la saison actuelle.
  return [
    { label: 'Points', val: driver.value.points, pct: (driver.value.points / maxPts) * 100 },
    { label: 'Victoires', val: driver.value.wins, pct: (driver.value.wins / maxWins) * 100 },
  ]
})
</script>

<style scoped>
.dd-hero {
  position: relative;
  padding: 24px 0 40px;
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}

.dd-hero-bg { position: absolute; inset: 0; pointer-events: none; }

.dd-hero-inner { position: relative; z-index: 1; }

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

.dd-header {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.dd-avatar {
  width: 100px;
  height: 100px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dd-initials { font-size: 24px; letter-spacing: 0.05em; }

.dd-title { flex: 1; min-width: 200px; }

.dd-number {
  font-size: 80px;
  line-height: 1;
  opacity: 0.2;
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
}

.dd-name { font-size: clamp(36px, 4vw, 56px); margin-bottom: 8px; }

.dd-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.dd-flag { font-size: 20px; }
.dd-nationality { font-size: 15px; }
.sep-dot { opacity: 0.4; }
.dd-team { font-size: 15px; font-weight: 600; }

.dd-pts-block {
  text-align: right;
  margin-left: auto;
}

.pts-big { font-size: 64px; line-height: 1; }
.pts-big-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-top: 4px;
}

.dd-rank { font-size: 12px; margin-top: 4px; }

/* Body */
.dd-body { padding: 40px 0; }

.dd-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 40px;
}

.dd-section { margin-bottom: 40px; }

.dd-section-title { font-size: 28px; margin-bottom: 16px; }

.dd-bio {
  font-size: 15px;
  line-height: 1.7;
  margin-bottom: 20px;
}

.dd-personal {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.personal-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 16px;
}

.personal-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--white-muted);
}

.personal-val { font-size: 14px; font-weight: 500; }

/* Perf bars */
.perf-bars { display: flex; flex-direction: column; gap: 16px; }

.perf-bar-row {
  display: grid;
  grid-template-columns: 100px 1fr 48px;
  align-items: center;
  gap: 16px;
}

.perf-label { font-size: 13px; }

.perf-track {
  height: 6px;
  background: rgba(255,255,255,0.08);
  border-radius: 3px;
  overflow: hidden;
}

.perf-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 1s ease;
}

.perf-val {
  font-size: 14px;
  text-align: right;
}
</style>
