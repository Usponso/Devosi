<template>
  <div class="page season">
    <header class="container page-head">
      <div class="eyebrow">Formule 1 · {{ store.races.length }} Grands Prix</div>
      <h1 class="title-lg">Calendrier {{ store.seasonYear }}</h1>
      <p class="dim">
        {{ store.completedRaces.length }} disputés · {{ store.upcomingRaces.length }} à venir ·
        {{ sprintCount }} week-ends sprint
      </p>
    </header>

    <!-- Frise : couleur de l'écurie gagnante -->
    <div class="container">
      <div class="timeline" role="list" aria-label="Vainqueurs par manche">
        <router-link
          v-for="(race, i) in store.races"
          :key="race.id"
          :to="`/season/${race.id}`"
          class="tl-item"
          role="listitem"
          :class="{ done: race.completed, next: race.id === store.nextRace?.id }"
          :style="{ '--tc': winnerOf(race)?.color, animationDelay: `${i * 30}ms` }"
          :title="`${shortRaceName(race.name)}${winnerOf(race) ? ' · ' + winnerOf(race).driverName : ''}`"
        >
          <span class="tl-bar"></span>
          <span class="tl-code mono">{{ winnerOf(race)?.driver ?? (race.id === store.nextRace?.id ? 'NEXT' : '') }}</span>
          <span class="tl-round mono muted">{{ race.round }}</span>
        </router-link>
      </div>

      <div class="season-tools">
        <div class="tabs">
          <button
            v-for="f in FILTERS"
            :key="f.val"
            class="tab"
            :class="{ active: activeFilter === f.val }"
            @click="activeFilter = f.val"
          >{{ f.label }}</button>
        </div>
      </div>

      <div class="race-grid">
        <router-link
          v-for="race in filteredRaces"
          :key="race.id"
          :to="`/season/${race.id}`"
          class="race-card card card-link"
          :class="{ done: race.completed, next: race.id === store.nextRace?.id }"
          v-reveal
        >
          <div class="rc-top">
            <span class="rc-round mono">{{ String(race.round).padStart(2, '0') }}</span>
            <span v-if="race.id === store.nextRace?.id" class="badge badge-accent badge-live">Prochain</span>
            <span v-else-if="race.sprint" class="badge"><Icon name="bolt" :size="11" /> Sprint</span>
          </div>
          <div class="rc-circuit">
            <CircuitMap :circuit-id="race.circuitId" small />
          </div>
          <div class="rc-name">
            <Flag :src="race.flag" :alt="race.country" :size="13" />
            <strong>{{ shortRaceName(race.name) }}</strong>
          </div>
          <div class="rc-meta muted">
            <span class="mono">{{ formatWeekendRange(race) }}</span>
            <span>·</span>
            <span class="rc-locality">{{ race.locality }}</span>
          </div>
          <div v-if="winnerOf(race)" class="rc-winner" :style="{ '--tc': winnerOf(race).color }">
            <Icon name="trophy" :size="14" />
            <span>{{ winnerOf(race).driverName }}</span>
          </div>
          <div v-else-if="race.completed" class="rc-winner muted">Résultats en attente</div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Icon from '@/components/Icon.vue'
import Flag from '@/components/Flag.vue'
import CircuitMap from '@/components/CircuitMap.vue'
import { useF1Store } from '@/stores/f1Store'
import { winnerOf } from '@/utils/stats'
import { formatWeekendRange, shortRaceName } from '@/utils/race'

const store = useF1Store()

const FILTERS = [
  { val: 'all', label: 'Toutes' },
  { val: 'upcoming', label: 'À venir' },
  { val: 'completed', label: 'Disputées' },
]

const activeFilter = ref('all')

const filteredRaces = computed(() => {
  if (activeFilter.value === 'completed') return store.completedRaces
  if (activeFilter.value === 'upcoming') return store.upcomingRaces
  return store.races
})

const sprintCount = computed(() => store.races.filter((r) => r.sprint).length)
</script>

<style scoped>
.page-head {
  padding-top: 40px;
  padding-bottom: 24px;
}

.page-head .title-lg { margin: 6px 0 8px; }

/* Frise */
.timeline {
  display: flex;
  gap: 4px;
  padding: 12px 0 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.tl-item {
  flex: 1;
  min-width: 34px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  animation: rise 0.5s var(--ease) both;
}

.tl-bar {
  width: 100%;
  height: 34px;
  border-radius: 6px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  transition: transform var(--t);
}

.tl-item.done .tl-bar {
  background: linear-gradient(180deg, var(--tc, var(--text-muted)), color-mix(in srgb, var(--tc, var(--text-muted)) 40%, transparent));
  border-color: transparent;
}

.tl-item.next .tl-bar {
  border: 2px dashed var(--accent);
  background: var(--accent-soft);
}

.tl-item:hover .tl-bar { transform: translateY(-3px); }

.tl-code {
  font-size: 10px;
  font-weight: 700;
  height: 12px;
}

.tl-round { font-size: 10px; }

.season-tools {
  display: flex;
  justify-content: flex-end;
  margin: 24px 0 16px;
}

/* Cartes */
.race-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: 12px;
}

.race-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  overflow: hidden;
}

.race-card.done { opacity: 0.85; }
.race-card.next { border-color: var(--accent-line); background: linear-gradient(160deg, var(--accent-soft), var(--surface) 60%); }

.rc-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rc-round {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  color: var(--text-muted);
}

.next .rc-round { color: var(--accent); }

.rc-circuit {
  height: 90px;
  margin: 4px 0;
}

.race-card:hover :deep(.track-line) { stroke: var(--accent); }

.rc-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.rc-meta {
  display: flex;
  gap: 6px;
  font-size: 12px;
  min-width: 0;
}

.rc-locality {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rc-winner {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  font-size: 13px;
  font-weight: 600;
}

.rc-winner .icon { color: var(--tc, var(--gold)); }
</style>
