<template>
  <div class="team-detail" v-if="team">
    <div class="td-hero" :style="{ '--tc': team.color }">
      <div class="td-hero-bg" :style="{ background: `radial-gradient(ellipse at 80% 50%, ${team.color}12 0%, transparent 70%)` }"></div>
      <div class="container td-hero-inner">
        <router-link to="/teams" class="back-btn">← Écuries</router-link>
        <div class="td-header">
          <div class="td-color-block" :style="{ background: `linear-gradient(135deg, ${team.color}44, ${team.color}11)`, border: `2px solid ${team.color}55` }">
            <span class="font-display" :style="{ color: team.color, fontSize: '32px' }">{{ team.shortName.substring(0,2).toUpperCase() }}</span>
          </div>
          <div class="td-title">
            <div class="td-pos-info">
              <span class="badge badge-gray">P{{ ranking }}e Constructeurs</span>
            </div>
            <h1 class="td-name font-display">{{ team.name }}</h1>
            <div class="td-meta text-dim">{{ team.base }} · Fondée en {{ team.founded }}</div>
          </div>
          <div class="td-pts-block">
            <div class="pts-big font-display" :style="{ color: team.color }">{{ team.points }}</div>
            <div class="pts-big-label text-muted">Points {{ store.seasonYear }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="container td-body">
      <!-- Stats -->
      <div class="td-stats-grid">
        <div class="stat-box">
          <div class="stat-value font-mono">{{ careerStats ? careerStats.wins : '...' }}</div>
          <div class="stat-label">Victoires (Historique)</div>
        </div>
        <div class="stat-box">
          <div class="stat-value font-mono">{{ careerStats ? careerStats.podiums : '...' }}</div>
          <div class="stat-label">Podiums (Historique)</div>
        </div>
        <div class="stat-box">
          <div class="stat-value font-mono">{{ careerStats ? careerStats.poles : '...' }}</div>
          <div class="stat-label">Poles Position</div>
        </div>
        <div class="stat-box" v-if="team.championships !== undefined">
          <div class="stat-value font-mono">{{ team.championships }}</div>
          <div class="stat-label">Titres Constructeurs</div>
        </div>
      </div>

      <!-- Team info -->
      <div class="td-section">
        <h2 class="td-section-title font-display">Présentation</h2>
        <p class="td-bio text-dim">{{ team.bio }}</p>
        <div class="td-info-grid">
          <div class="personal-row">
            <span class="personal-label">Directeur</span>
            <span class="personal-val">{{ team.principal }}</span>
          </div>
          <div class="personal-row">
            <span class="personal-label">Moteur</span>
            <span class="personal-val">{{ team.engine }}</span>
          </div>
          <div class="personal-row">
            <span class="personal-label">Châssis</span>
            <span class="personal-val font-mono">{{ team.chassis }}</span>
          </div>
          <div class="personal-row">
            <span class="personal-label">Fondée</span>
            <span class="personal-val">{{ team.founded }}</span>
          </div>
        </div>
      </div>

      <!-- Drivers -->
      <div class="td-section">
        <h2 class="td-section-title font-display">Pilotes {{ store.seasonYear }}</h2>
        <div class="td-drivers-grid">
          <router-link
            v-for="driver in teamDrivers"
            :key="driver.id"
            :to="`/drivers/${driver.id}`"
            class="td-driver-card card card-clickable"
            :style="{ '--tc': team.color }"
          >
            <div class="tdd-accent" :style="{ background: team.color }"></div>
            <div class="tdd-avatar" :style="{ background: `linear-gradient(135deg, ${team.color}33, ${team.color}11)` }">
              <span class="font-display" :style="{ color: team.color, fontSize: '18px' }">{{ driver.shortName }}</span>
            </div>
            <div class="tdd-info">
              <div class="tdd-flag">
                <img v-if="driver.flag.includes('http')" :src="driver.flag" style="width: 1.33em; height: 1em; object-fit: cover; border-radius: 0.15em; vertical-align: middle;" />
                <span v-else>{{ driver.flag }}</span>
                <span class="tdd-name">{{ driver.name }}</span>
              </div>
              <div class="tdd-num font-mono text-muted">#{{ driver.number }}</div>
            </div>
            <div class="tdd-pts">
              <span class="font-display tdd-pts-val">{{ driver.points }}</span>
              <span class="tdd-pts-label text-muted">PTS</span>
            </div>
          </router-link>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="container" style="padding: 80px 24px; text-align: center;">
    <div class="text-muted">Écurie introuvable</div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useF1Store } from '@/stores/f1Store'
import { fetchTeamCareerStats } from '@/services/f1Api'

const route = useRoute()
const store = useF1Store()

// L'ID est désormais une string (ex: "ferrari", "red_bull")
const team = computed(() => store.getTeamById(route.params.id))
const ranking = computed(() => store.teamStandings.findIndex(t => t.id === team.value?.id) + 1)
const teamDrivers = computed(() => store.getDriversByTeam(route.params.id))

const careerStats = ref(null)

watch(() => route.params.id, async (id) => {
  if (!id) return
  careerStats.value = null
  
  // Certaines équipes ont changé de nom (comme rb / alphatauri),
  // mais on donne d'abord une chance à l'ID formel. L'API Ergast l'accepte la plupart du temps pour faire la somme.
  careerStats.value = await fetchTeamCareerStats(id)
}, { immediate: true })
</script>

<style scoped>
.td-hero {
  position: relative;
  padding: 24px 0 40px;
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}

.td-hero-bg { position: absolute; inset: 0; pointer-events: none; }
.td-hero-inner { position: relative; z-index: 1; }

.back-btn {
  display: inline-flex;
  gap: 6px;
  color: var(--white-muted);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 24px;
  transition: color var(--transition);
}

.back-btn:hover { color: var(--white); }

.td-header {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
}

.td-color-block {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.td-title { flex: 1; min-width: 200px; }
.td-pos-info { margin-bottom: 10px; }
.td-name { font-size: clamp(32px, 4vw, 56px); margin-bottom: 8px; }
.td-meta { font-size: 14px; }

.td-pts-block { text-align: right; margin-left: auto; }
.pts-big { font-size: 64px; line-height: 1; }
.pts-big-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-top: 4px;
}

/* Body */
.td-body { padding: 40px 0; }

.td-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 40px;
}

.td-section { margin-bottom: 40px; }
.td-section-title { font-size: 28px; margin-bottom: 16px; }
.td-bio { font-size: 15px; line-height: 1.7; margin-bottom: 20px; }

.td-info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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

/* Drivers grid */
.td-drivers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.td-driver-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  text-decoration: none;
  color: var(--white);
  overflow: hidden;
}

.tdd-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
}

.tdd-avatar {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tdd-info { flex: 1; }
.tdd-flag { font-size: 14px; display: flex; align-items: center; gap: 6px; }
.tdd-name { font-weight: 600; font-size: 15px; }
.tdd-num { font-size: 12px; margin-top: 4px; }

.tdd-pts {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.tdd-pts-val {
  font-size: 32px;
  line-height: 1;
}

.tdd-pts-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
</style>
