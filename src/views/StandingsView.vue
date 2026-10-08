<template>
  <div class="page standings">
    <header class="container page-head">
      <div class="eyebrow">Saison {{ store.seasonYear }} · après {{ store.completedRaces.length }} GP</div>
      <h1 class="title-lg">Classements</h1>
      <div class="tabs page-tabs" role="tablist">
        <button
          v-for="t in TABS"
          :key="t.id"
          class="tab"
          :class="{ active: tab === t.id }"
          role="tab"
          :aria-selected="tab === t.id"
          @click="setTab(t.id)"
        >{{ t.label }}</button>
      </div>
    </header>

    <div class="container standings-layout">
      <!-- Tableau -->
      <section class="card table-card">
        <div class="table-head" :class="tab">
          <span>Pos</span>
          <span>{{ tab === 'drivers' ? 'Pilote' : 'Écurie' }}</span>
          <span class="col-form">{{ tab === 'drivers' ? 'Forme' : 'Pilotes' }}</span>
          <span class="col-num">Vic.</span>
          <span class="col-num">Pod.</span>
          <span class="col-gap">Écart</span>
          <span class="col-pts">Pts</span>
        </div>

        <transition-group tag="ol" name="list" class="table-body">
          <li v-for="(row, i) in rows" :key="row.id" :style="{ '--i': i }">
            <router-link
              :to="row.to"
              class="table-row team-edge"
              :class="[tab, { 'is-fav': row.fav }]"
              :style="{ '--tc': row.color }"
            >
              <span class="col-pos mono" :class="`pos-${row.position}`">{{ row.position }}</span>
              <span class="col-name">
                <Flag v-if="row.flag" :src="row.flag" :size="12" />
                <span class="name-text">
                  <strong>{{ row.title }}</strong>
                  <span class="muted name-sub">{{ row.sub }}</span>
                </span>
              </span>
              <span class="col-form">
                <FormStrip v-if="tab === 'drivers'" :items="row.form" />
                <span v-else class="muted team-drivers">{{ row.driversLabel }}</span>
              </span>
              <span class="col-num mono">{{ row.wins }}</span>
              <span class="col-num mono">{{ row.podiums }}</span>
              <span class="col-gap mono muted">{{ row.gap }}</span>
              <span class="col-pts mono">{{ row.points }}</span>
            </router-link>
          </li>
        </transition-group>
      </section>

      <!-- Évolution -->
      <section class="card chart-card">
        <div class="card-head">
          <h2 class="title-md">Évolution des points</h2>
          <div class="tabs chart-filter">
            <button
              v-for="f in FILTERS"
              :key="f.id"
              class="tab"
              :class="{ active: filter === f.id }"
              :disabled="f.id === 'fav' && !prefs.favoriteTeamId"
              @click="filter = f.id"
            >{{ f.label }}</button>
          </div>
        </div>
        <LineChart
          v-if="progression.rounds.length > 1"
          :key="`${tab}-${filter}`"
          :series="chartSeries"
          :x-labels="chartLabels"
          :tooltip-title="(i) => progression.rounds[i]?.name"
          :height="chartHeight"
          aria-label="Évolution des points manche par manche"
        />
        <p v-else class="empty">Le graphe apparaît après deux Grands Prix.</p>

        <div v-if="contention && tab === 'drivers'" class="contention">
          <Icon name="trophy" :size="16" class="accent" />
          <span v-if="contention.decided"><strong>{{ contention.contenders[0].name }}</strong> est champion du monde {{ store.seasonYear }}.</span>
          <span v-else>
            <strong>{{ contention.contenders.length }}</strong> pilotes peuvent encore être titrés ·
            <span class="mono">{{ contention.maxRemaining }}</span> pts en jeu
          </span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import Flag from '@/components/Flag.vue'
import FormStrip from '@/components/charts/FormStrip.vue'
import LineChart from '@/components/charts/LineChart.vue'
import { useF1Store } from '@/stores/f1Store'
import { usePrefsStore } from '@/stores/prefsStore'
import { pointsProgression, recentForm, titleContention } from '@/utils/stats'

const TABS = [
  { id: 'drivers', label: 'Pilotes' },
  { id: 'teams', label: 'Constructeurs' },
]

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'top', label: 'Top 5' },
  { id: 'fav', label: 'Mon écurie' },
]

const store = useF1Store()
const prefs = usePrefsStore()
const route = useRoute()
const router = useRouter()

const tab = ref(route.query.tab === 'teams' ? 'teams' : 'drivers')
const filter = ref('all')

watch(() => route.query.tab, (t) => (tab.value = t === 'teams' ? 'teams' : 'drivers'))

function setTab(id) {
  tab.value = id
  router.replace({ query: id === 'teams' ? { tab: 'teams' } : {} })
}

const rows = computed(() => {
  if (tab.value === 'drivers') {
    const leader = store.driverStandings[0]?.points ?? 0
    return store.driverStandings.map((d) => ({
      id: d.id,
      to: `/drivers/${d.id}`,
      position: d.position,
      title: d.name,
      sub: d.team,
      flag: d.flag,
      color: d.color,
      fav: d.teamId === prefs.favoriteTeamId,
      form: recentForm(d.id, store.races, 5),
      wins: d.wins,
      podiums: d.podiums,
      gap: d.position === 1 ? '—' : `−${leader - d.points}`,
      points: d.points,
    }))
  }
  const leader = store.teamStandings[0]?.points ?? 0
  return store.teamStandings.map((t) => ({
    id: t.id,
    to: `/teams/${t.id}`,
    position: t.position,
    title: t.name,
    sub: t.nationality,
    flag: t.flag,
    color: t.color,
    fav: t.id === prefs.favoriteTeamId,
    driversLabel: store.getDriversByTeam(t.id).map((d) => d.shortName).join(' · '),
    wins: t.wins,
    podiums: t.podiums,
    gap: t.position === 1 ? '—' : `−${leader - t.points}`,
    points: t.points,
  }))
})

const progression = computed(() => pointsProgression(store.races, tab.value === 'drivers' ? 'driver' : 'team'))
const chartLabels = computed(() => progression.value.rounds.map((r) => `M${r.round}`))

const chartSeries = computed(() => {
  const entities =
    tab.value === 'drivers'
      ? store.driverStandings.map((d) => ({ id: d.id, label: d.shortName, color: d.color, teamId: d.teamId }))
      : store.teamStandings.map((t) => ({ id: t.id, label: t.name.split(' ')[0], color: t.color, teamId: t.id }))

  let selected = entities
  if (filter.value === 'top') selected = entities.slice(0, 5)
  if (filter.value === 'fav') selected = entities.filter((e) => e.teamId === prefs.favoriteTeamId)

  return selected.map((e) => ({
    id: e.id,
    label: e.label,
    color: e.color,
    values: progression.value.series.get(e.id) ?? [],
    highlight: filter.value !== 'fav' && e.teamId === prefs.favoriteTeamId,
  }))
})

const contention = computed(() =>
  store.driverStandings.length ? titleContention(store.driverStandings, store.races, store.seasonYear) : null,
)

const isMobile = ref(window.innerWidth < 720)
const onResize = () => (isMobile.value = window.innerWidth < 720)
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const chartHeight = computed(() => (isMobile.value ? 260 : 360))
</script>

<style scoped>
.page-head {
  padding-top: 40px;
  padding-bottom: 24px;
}

.page-head .title-lg { margin: 6px 0 20px; }

.standings-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.table-card { padding: 8px 0; }

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 156px 36px 36px 52px 52px;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
}

.table-head {
  height: 36px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-left: 3px solid transparent;
}

.table-body { list-style: none; }

.table-row {
  min-height: 54px;
  border-top: 1px solid var(--line);
  transition: background var(--t);
}

.table-row:hover { background: var(--surface-2); }

.col-pos { font-weight: 700; font-size: 16px; text-align: center; }
.col-num, .col-gap, .col-pts { text-align: right; }
.col-pts { font-weight: 700; font-size: 16px; }
.col-gap { font-size: 12px; }

.col-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.name-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}

.name-text strong,
.name-sub {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.name-sub { font-size: 12px; }
.team-drivers { font-size: 12px; font-family: var(--mono); }

.list-enter-active {
  transition: opacity 0.4s var(--ease), transform 0.4s var(--ease);
  transition-delay: calc(var(--i) * 25ms);
}
.list-enter-from { opacity: 0; transform: translateX(-12px); }
.list-leave-active { display: none; }

.chart-card {
  position: sticky;
  top: calc(var(--header-h) + 16px);
}

.chart-filter .tab:disabled { opacity: 0.35; cursor: not-allowed; }

.contention {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  font-size: 14px;
}

@media (max-width: 1100px) {
  .standings-layout { grid-template-columns: 1fr; }
  .chart-card { position: static; order: -1; }
}

@media (max-width: 640px) {
  .table-head,
  .table-row { grid-template-columns: 28px minmax(0, 1fr) 44px 48px; padding: 0 12px; gap: 8px; }
  .col-form,
  .col-num { display: none; }
  .card-head { flex-wrap: wrap; }
}
</style>
