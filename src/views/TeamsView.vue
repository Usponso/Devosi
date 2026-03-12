<template>
  <div class="teams-page">
    <div class="page-hero container">
      <div class="page-hero-label badge badge-gray">Saison {{ store.seasonYear }}</div>
      <h1 class="page-hero-title font-display">Classement Constructeurs</h1>
      <p class="page-hero-sub text-dim">{{ store.teams.length }} écuries · {{ store.completedRaces.length }} courses disputées</p>
    </div>

    <div class="container">
      <div class="teams-grid">
        <router-link
          v-for="(team, idx) in store.teamStandings"
          :key="team.id"
          :to="`/teams/${team.id}`"
          class="team-card card card-clickable"
          :style="{ '--tc': team.color }"
        >
          <div class="tc-rank-bar" :style="{ background: team.color }"></div>

          <div class="tc-top">
            <div class="tc-pos">
              <span class="font-display tc-pos-num" :class="idx < 3 ? `pos-${idx+1}` : ''">{{ idx + 1 }}</span>
            </div>
            <div class="tc-info">
              <div class="tc-name">{{ team.name }}</div>
              <div class="tc-detail text-dim">{{ team.base }}</div>
            </div>
            <div class="tc-pts-block">
              <div class="tc-pts font-display" :style="{ color: team.color }">{{ team.points }}</div>
              <div class="tc-pts-label">PTS</div>
            </div>
          </div>

          <div class="tc-stats">
            <div class="tc-stat">
              <span class="tcs-val">{{ team.wins }}</span>
              <span class="tcs-label">Victoires</span>
            </div>
            <div class="tc-stat">
              <span class="tcs-val">{{ team.podiums }}</span>
              <span class="tcs-label">Podiums</span>
            </div>
            <div class="tc-stat">
              <span class="tcs-val">{{ team.poles }}</span>
              <span class="tcs-label">Poles</span>
            </div>
          </div>

          <!-- Drivers -->
          <div class="tc-drivers">
            <div
              v-for="driver in store.getDriversByTeam(team.id)"
              :key="driver.id"
              class="tcd-chip"
              :style="{ borderColor: team.color + '44' }"
            >
              <img v-if="driver.flag.includes('http')" :src="driver.flag" style="width: 1.33em; height: 1em; object-fit: cover; border-radius: 0.15em; vertical-align: middle;" />
              <span v-else>{{ driver.flag }}</span>
              {{ driver.shortName }}
            </div>
          </div>

          <div class="tc-bar-wrap">
            <div class="tc-bar" :style="{ width: (team.points / store.teamStandings[0].points * 100) + '%', background: team.color }"></div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useF1Store } from '@/stores/f1Store'
const store = useF1Store()
</script>

<style scoped>
.teams-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 48px;
}

.team-card {
  position: relative;
  padding: 24px;
  text-decoration: none;
  color: var(--white);
  overflow: hidden;
}

.tc-rank-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.tc-top {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.tc-pos-num {
  font-size: 48px;
  line-height: 1;
  color: var(--white-dim);
}

.tc-info { flex: 1; }
.tc-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.tc-detail { font-size: 13px; }

.tc-pts-block { text-align: right; }
.tc-pts { font-size: 48px; line-height: 1; }
.tc-pts-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--white-muted);
}

.tc-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.tc-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tcs-val {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 24px;
  line-height: 1;
}

.tcs-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--white-muted);
}

.tc-drivers {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.tcd-chip {
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  font-family: 'JetBrains Mono', monospace;
}

.tc-bar-wrap {
  height: 3px;
  background: rgba(255,255,255,0.06);
  border-radius: 2px;
  overflow: hidden;
}

.tc-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 1s ease;
}
</style>
