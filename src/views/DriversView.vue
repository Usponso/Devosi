<template>
  <div class="drivers-page">
    <div class="page-hero container">
      <div class="page-hero-label badge badge-gray">Saison {{ store.seasonYear }}</div>
      <h1 class="page-hero-title font-display">Classement Pilotes</h1>
      <p class="page-hero-sub text-dim">{{ store.drivers.length }} pilotes · {{ store.completedRaces.length }} courses disputées</p>
    </div>

    <div class="container">
      <!-- Top 3 podium visual -->
      <div class="podium-visual">
        <div
          v-for="(driver, i) in [store.driverStandings[1], store.driverStandings[0], store.driverStandings[2]]"
          :key="driver.id"
          class="podium-card"
          :class="['second', 'first', 'third'][i]"
          :style="{ '--tc': driver.color }"
        >
          <div class="pv-num">{{ driver.number }}</div>
          <div class="pv-pos font-display">{{ ['P2', 'P1', 'P3'][i] }}</div>
          <div class="pv-flag">
            <img v-if="driver.flag.includes('http')" :src="driver.flag" style="width: 1.33em; height: 1em; object-fit: cover; border-radius: 0.15em; vertical-align: middle;" />
            <span v-else>{{ driver.flag }}</span>
          </div>
          <div class="pv-name font-display">{{ driver.shortName }}</div>
          <div class="pv-fullname text-dim">{{ driver.name }}</div>
          <div class="pv-pts font-display" :style="{ color: driver.color }">{{ driver.points }}<span style="font-size:14px;margin-left:4px;color:var(--white-muted)">PTS</span></div>
          <div class="pv-bar" :style="{ background: driver.color }"></div>
        </div>
      </div>

      <!-- Full list -->
      <div class="drivers-list">
        <router-link
          v-for="(driver, idx) in store.driverStandings"
          :key="driver.id"
          :to="`/drivers/${driver.id}`"
          class="driver-row card card-clickable"
          :style="{ '--tc': driver.color }"
        >
          <div class="dr-pos" :class="idx < 3 ? `pos-${idx+1}` : ''">
            {{ idx + 1 }}
          </div>
          <div class="dr-avatar">
            <div class="dr-avatar-inner" :style="{ background: `linear-gradient(135deg, ${driver.color}33, ${driver.color}11)`, border: `1px solid ${driver.color}44` }">
              <span class="dr-initials font-display" :style="{ color: driver.color }">{{ driver.shortName }}</span>
            </div>
          </div>
          <div class="dr-info">
            <div class="dr-name">{{ driver.name }}</div>
            <div class="dr-meta">
              <span class="dr-flag">
                <img v-if="driver.flag.includes('http')" :src="driver.flag" style="width: 1.33em; height: 1em; object-fit: cover; border-radius: 0.15em; vertical-align: middle;" />
                <span v-else>{{ driver.flag }}</span>
              </span>
              <span class="dr-team" :style="{ color: driver.color }">{{ driver.team }}</span>
            </div>
          </div>
          <div class="dr-stat">
            <span class="ds-val">{{ driver.wins }}</span>
            <span class="ds-label">Vic.</span>
          </div>
          <div class="dr-stat">
            <span class="ds-val">{{ driver.podiums }}</span>
            <span class="ds-label">Pod.</span>
          </div>
          <div class="dr-stat">
            <span class="ds-val">{{ driver.poles }}</span>
            <span class="ds-label">Poles</span>
          </div>
          <div class="dr-pts">
            <span class="dp-val font-display">{{ driver.points }}</span>
            <span class="dp-label">PTS</span>
          </div>
          <div class="dr-gap text-muted" v-if="idx > 0">
            -{{ store.driverStandings[0].points - driver.points }} pts
          </div>
          <div class="dr-gap text-red font-mono" v-else style="font-size:11px">LEADER</div>
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
/* Podium visual */
.podium-visual {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 32px;
}

.podium-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px 16px;
  text-align: center;
  overflow: hidden;
  transition: transform var(--transition), box-shadow var(--transition);
  border-top: 3px solid var(--tc);
}

.podium-card.first {
  background: linear-gradient(135deg, rgba(212,175,55,0.06) 0%, var(--surface) 60%);
  border-color: rgba(212,175,55,0.3);
  border-top-color: var(--gold);
}

.pv-num {
  position: absolute;
  right: 12px;
  top: 12px;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 48px;
  line-height: 1;
  opacity: 0.08;
  color: var(--tc);
}

.pv-pos {
  font-size: 13px;
  letter-spacing: 0.1em;
  color: var(--white-muted);
  margin-bottom: 8px;
}

.first .pv-pos { color: var(--gold); }
.second .pv-pos { color: var(--silver); }
.third .pv-pos { color: var(--bronze); }

.pv-flag { font-size: 28px; margin-bottom: 8px; }
.pv-name { font-size: 32px; color: var(--white); margin-bottom: 2px; }
.pv-fullname { font-size: 12px; margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pv-pts { font-size: 28px; }

.pv-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
}

/* Drivers list */
.drivers-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 48px;
}

.driver-row {
  display: grid;
  grid-template-columns: 48px 64px 1fr auto auto auto auto auto;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  text-decoration: none;
  color: var(--white);
  border-left: 3px solid var(--tc);
}

.dr-pos {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 24px;
  text-align: center;
  color: var(--white-dim);
}

.dr-avatar-inner {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dr-initials { font-size: 15px; letter-spacing: 0.05em; }

.dr-name {
  font-size: 15px;
  font-weight: 600;
}

.dr-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
}

.dr-flag { font-size: 14px; }
.dr-team { font-size: 12px; font-weight: 500; }

.dr-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 40px;
}

.ds-val {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 22px;
  line-height: 1;
}

.ds-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--white-muted);
}

.dr-pts {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 56px;
}

.dp-val {
  font-size: 30px;
  line-height: 1;
}

.dp-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--white-muted);
}

.dr-gap {
  font-size: 12px;
  min-width: 56px;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
}

@media (max-width: 768px) {
  .podium-visual { grid-template-columns: 1fr 1fr 1fr; }
  .driver-row { grid-template-columns: 36px 52px 1fr auto auto; }
  .dr-stat:not(:first-of-type) { display: none; }
  .dr-gap { display: none; }
}
</style>
