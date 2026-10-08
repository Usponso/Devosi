<template>
  <div class="page drivers">
    <header class="container page-head">
      <div class="eyebrow">Saison {{ store.seasonYear }} · {{ store.drivers.length }} pilotes</div>
      <h1 class="title-lg">Pilotes</h1>
    </header>

    <div class="container driver-grid">
      <router-link
        v-for="(d, i) in store.driverStandings"
        :key="d.id"
        :to="`/drivers/${d.id}`"
        class="driver-card card card-link"
        :class="{ fav: d.teamId === prefs.favoriteTeamId }"
        :style="{ '--tc': d.color, animationDelay: `${Math.min(i, 12) * 40}ms` }"
      >
        <span class="dc-number" aria-hidden="true">{{ d.number || '' }}</span>
        <div class="dc-top">
          <DriverAvatar :driver="d" :size="64" />
          <div class="dc-pos mono" :class="`pos-${d.position}`">P{{ d.position }}</div>
        </div>
        <div class="dc-name">
          <span class="dc-first">{{ d.givenName }}</span>
          <span class="dc-last">{{ d.familyName }}</span>
        </div>
        <div class="dc-team">
          <Flag :src="d.flag" :size="11" />
          <span>{{ d.team }}</span>
        </div>
        <div class="dc-stats">
          <div><span class="mono">{{ d.points }}</span><small>pts</small></div>
          <div><span class="mono">{{ d.wins }}</span><small>vic.</small></div>
          <div><span class="mono">{{ d.podiums }}</span><small>pod.</small></div>
          <div><span class="mono">{{ d.poles }}</span><small>poles</small></div>
        </div>
        <FormStrip :items="recentForm(d.id, store.races, 5)" class="dc-form" />
      </router-link>
    </div>
  </div>
</template>

<script setup>
import Flag from '@/components/Flag.vue'
import DriverAvatar from '@/components/DriverAvatar.vue'
import FormStrip from '@/components/charts/FormStrip.vue'
import { useF1Store } from '@/stores/f1Store'
import { usePrefsStore } from '@/stores/prefsStore'
import { recentForm } from '@/utils/stats'

const store = useF1Store()
const prefs = usePrefsStore()
</script>

<style scoped>
.page-head {
  padding-top: 40px;
  padding-bottom: 24px;
}

.page-head .title-lg { margin-top: 6px; }

.driver-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
  gap: 12px;
}

.driver-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  animation: rise 0.5s var(--ease) both;
  background: linear-gradient(160deg, color-mix(in srgb, var(--tc) 14%, var(--surface)), var(--surface) 55%);
}

.driver-card.fav { border-color: var(--accent-line); }
.driver-card:hover { border-color: color-mix(in srgb, var(--tc) 60%, transparent); }

.dc-number {
  position: absolute;
  right: 10px;
  top: -10px;
  font-size: 96px;
  font-weight: 900;
  line-height: 1;
  color: var(--tc);
  opacity: 0.12;
  pointer-events: none;
  transition: opacity var(--t), transform var(--t);
}

.driver-card:hover .dc-number { opacity: 0.25; transform: translateY(4px); }

.dc-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.dc-pos { font-size: 18px; font-weight: 700; }

.dc-name {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
}

.dc-first { color: var(--text-dim); font-size: 14px; }
.dc-last { font-size: 24px; font-weight: 900; text-transform: uppercase; }

.dc-team {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--tc);
}

.dc-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.dc-stats div {
  display: flex;
  flex-direction: column;
}

.dc-stats .mono { font-size: 18px; font-weight: 700; }
.dc-stats small { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
</style>
