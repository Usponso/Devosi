<template>
  <div class="season-page">
    <div class="page-hero container">
      <div class="page-hero-label badge badge-gray">Formule 1</div>
      <h1 class="page-hero-title font-display">Saison {{ store.seasonYear }}</h1>
      <p class="page-hero-sub text-dim">{{ store.races.length }} Grands Prix · {{ store.completedRaces.length }} disputés · {{ store.upcomingRaces.length }} à venir</p>
    </div>

    <div class="container">
      <!-- Filter -->
      <div class="filters">
        <button
          v-for="f in filters"
          :key="f.val"
          class="filter-btn"
          :class="{ active: activeFilter === f.val }"
          @click="activeFilter = f.val"
        >{{ f.label }}</button>
      </div>

      <div class="races-list">
        <router-link
          v-for="race in filteredRaces"
          :key="race.id"
          :to="`/season/${race.id}`"
          class="race-item card card-clickable"
          :class="{ completed: race.completed, next: isNext(race) }"
        >
          <div class="ri-num font-mono text-muted">{{ String(race.id).padStart(2, '0') }}</div>
          <div class="ri-flag">
            <img v-if="race.flag.includes('http')" :src="race.flag" style="width: 1.33em; height: 1em; object-fit: cover; border-radius: 0.15em; vertical-align: middle; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" />
            <span v-else>{{ race.flag }}</span>
          </div>
          <div class="ri-info">
            <div class="ri-name">{{ race.name }}</div>
            <div class="ri-circuit text-dim">{{ race.circuit }}</div>
          </div>
          <div class="ri-date">
            <div class="ri-date-val font-mono">{{ formatShortDate(race.date) }}</div>
          </div>
          <div class="ri-status">
            <span v-if="isNext(race)" class="badge badge-red">
              <span class="blink">●</span> Prochain
            </span>
            <span v-else-if="race.completed" class="badge badge-gray">Terminé</span>
            <span v-else class="badge badge-gray" style="opacity:0.5">À venir</span>
          </div>
          <div class="ri-winner text-dim" v-if="race.completed && race.results.length">
            🏆 {{ getDriverName(race.results[0].driver) }}
          </div>
          <div class="ri-winner text-muted" v-else-if="!race.completed && !isNext(race)">
            —
          </div>
          <div class="ri-arrow text-muted">→</div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useF1Store } from '@/stores/f1Store'

const store = useF1Store()

const filters = [
  { val: 'all', label: 'Toutes' },
  { val: 'completed', label: 'Disputées' },
  { val: 'upcoming', label: 'À venir' }
]

const activeFilter = ref('all')

const filteredRaces = computed(() => {
  if (activeFilter.value === 'completed') return store.completedRaces
  if (activeFilter.value === 'upcoming') return store.upcomingRaces
  return store.races
})

const isNext = (race) => store.nextRace?.id === race.id

const getDriverName = (code) => {
  const d = store.drivers.find(d => d.shortName === code)
  return d ? d.name : code
}

const formatShortDate = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
</script>

<style scoped>
.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--white-dim);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.filter-btn:hover {
  border-color: var(--border-hover);
  color: var(--white);
}

.filter-btn.active {
  background: var(--red);
  border-color: var(--red);
  color: white;
}

.races-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 48px;
}

.race-item {
  display: grid;
  grid-template-columns: 36px 32px 1fr 100px 100px 1fr 24px;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  text-decoration: none;
  color: var(--white);
}

.race-item.next {
  border-color: var(--red);
  background: linear-gradient(90deg, rgba(232,0,45,0.05) 0%, transparent 100%);
}

.race-item.completed {
  opacity: 0.75;
}

.race-item.completed:hover {
  opacity: 1;
}

.ri-num { font-size: 13px; }
.ri-flag { font-size: 22px; }
.ri-info { min-width: 0; }

.ri-name {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ri-circuit {
  font-size: 12px;
  margin-top: 2px;
}

.ri-date-val {
  font-size: 13px;
}

.ri-winner {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ri-arrow { font-size: 14px; }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.blink { animation: blink 1s ease-in-out infinite; }

@media (max-width: 768px) {
  .race-item {
    grid-template-columns: 28px 28px 1fr auto 20px;
  }
  .ri-date, .ri-winner { display: none; }
}
</style>
