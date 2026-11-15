<template>
  <div v-if="driver" class="page driver-detail" :style="{ '--tc': driver.color }">
    <header class="dd-hero">
      <div class="dd-glow" aria-hidden="true"></div>
      <span class="dd-number" aria-hidden="true">{{ driver.number || '' }}</span>
      <div class="container dd-hero-inner">
        <router-link to="/drivers" class="back muted">{{ $t('detail.backDrivers') }}</router-link>
        <div class="dd-header">
          <DriverAvatar :driver="driver" :size="148" class="dd-avatar" />
          <div class="dd-title">
            <div class="dd-team">
              <router-link :to="`/teams/${driver.teamId}`">{{ driver.team }}</router-link>
              <span class="muted">·</span>
              <span class="mono muted">#{{ driver.number }}</span>
            </div>
            <h1 class="title-xl dd-name">
              <span class="dd-first">{{ driver.givenName }}</span>
              {{ driver.familyName }}
            </h1>
            <div class="dd-meta dim">
              <Flag :src="driver.flag" :size="14" /> {{ driver.nationality }}
              <template v-if="driver.dob"> · {{ $t('detail.age', { n: age(driver.dob) }) }}</template>
            </div>
          </div>
          <div class="dd-points">
            <div class="mono dd-pts" v-countup="driver.points"></div>
            <div class="eyebrow">{{ $t('detail.points', { year: store.seasonYear, pos: driver.position }) }}</div>
          </div>
        </div>
      </div>
    </header>

    <div class="container dd-body">
      <!-- Saison -->
      <section class="section-tight">
        <h2 class="title-md section-title">{{ $t('home.season', { year: store.seasonYear }) }}</h2>
        <div class="tiles">
          <StatTile :label="$t('detail.wins')" :value="season.wins" />
          <StatTile :label="$t('detail.podiums')" :value="season.podiums" />
          <StatTile :label="$t('detail.poles')" :value="season.poles" />
          <StatTile :label="$t('detail.fastestLaps')" :value="season.fastestLaps" />
          <StatTile :label="$t('duel.avgFinish')" :value="season.avgFinish" :decimals="1" :sub="season.bestFinish ? $t('detail.best', { pos: season.bestFinish }) : ''" />
          <StatTile :label="$t('detail.gained')" :value="season.gained" :sub="$t('detail.dnf', season.dnf)" />
        </div>
      </section>

      <div class="dd-grid">
        <section class="card">
          <div class="card-head">
            <h2 class="title-md">{{ $t('detail.byRound') }}</h2>
            <span v-if="teammate" class="muted small legend">
              <i class="lg-solid"></i>{{ driver.shortName }} <i class="lg-dash"></i>{{ teammate.shortName }}
            </span>
          </div>
          <LineChart
            v-if="resultsSeries[0].values.length > 1"
            :series="resultsSeries"
            :x-labels="roundLabels"
            :height="260"
            :y-min="1"
            :y-max="maxPosition"
            invert
            :end-labels="false"
            :format-y="(v) => `P${v}`"
            :tooltip-title="(i) => completed[i]?.name"
            :aria-label="$t('detail.byRoundLabel')"
          />
          <p v-else class="empty">{{ $t('detail.notEnough') }}</p>
        </section>

        <section v-if="teammate" class="card">
          <div class="card-head">
            <h2 class="title-md">{{ $t('detail.teammateDuel') }}</h2>
            <span class="muted small">{{ $t('detail.together', { n: duel.rounds }) }}</span>
          </div>
          <TeammateDuel :a="driver" :b="teammate" :duel="duel" :color="driver.color" />
        </section>
      </div>

      <!-- Carrière -->
      <section class="section-tight">
        <h2 class="title-md section-title">{{ $t('detail.career') }}</h2>
        <div class="tiles">
          <StatTile :label="$t('detail.seasons')" :value="career?.seasons" />
          <StatTile :label="$t('detail.gps')" :value="career?.races" />
          <StatTile :label="$t('detail.wins')" :value="career?.wins" :sub="winRate" />
          <StatTile :label="$t('detail.podiums')" :value="career?.podiums" />
          <StatTile :label="$t('detail.poles')" :value="career?.poles" />
          <StatTile :label="$t('detail.fastestLaps')" :value="career?.fastestLaps" />
        </div>
      </section>

      <section v-if="driver.bio" class="card bio">
        <p class="dim">{{ driver.bio }}</p>
        <a v-if="driver.url" :href="driver.url" target="_blank" rel="noopener" class="link-arrow">{{ $t('detail.wikipedia') }}</a>
      </section>
    </div>
  </div>

  <div v-else-if="!store.loading" class="container empty">{{ $t('detail.driverNotFound') }}</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Flag from '@/components/Flag.vue'
import DriverAvatar from '@/components/DriverAvatar.vue'
import StatTile from '@/components/StatTile.vue'
import TeammateDuel from '@/components/TeammateDuel.vue'
import LineChart from '@/components/charts/LineChart.vue'
import { useF1Store } from '@/stores/f1Store'
import { fetchDriverCareerStats } from '@/services/jolpica'
import { driverSeasonStats, finishSeries, teammateDuel } from '@/utils/stats'
import { age } from '@/utils/race'

const route = useRoute()
const store = useF1Store()
const { t } = useI18n()

const driver = computed(() => store.getDriverById(route.params.id))
const teammate = computed(() =>
  driver.value ? store.getDriversByTeam(driver.value.teamId).find((d) => d.id !== driver.value.id) : null,
)

const season = computed(() => driverSeasonStats(route.params.id, store.races))
const duel = computed(() => (teammate.value ? teammateDuel(driver.value.id, teammate.value.id, store.races) : null))

const completed = computed(() => store.completedRaces)
const roundLabels = computed(() => completed.value.map((r) => t('common.roundShort', { n: r.round })))
const maxPosition = computed(() => Math.max(20, ...completed.value.map((r) => r.results.length)))

const resultsSeries = computed(() => {
  const series = [
    { id: driver.value.id, label: driver.value.shortName, color: driver.value.color, values: finishSeries(driver.value.id, store.races), highlight: true },
  ]
  if (teammate.value) {
    series.push({
      id: teammate.value.id,
      label: teammate.value.shortName,
      color: '#9aa0aa',
      values: finishSeries(teammate.value.id, store.races),
      dashed: true,
    })
  }
  return series
})

const career = ref(null)
watch(
  () => route.params.id,
  async (id) => {
    career.value = null
    try {
      career.value = await fetchDriverCareerStats(id)
    } catch {
      career.value = null
    }
  },
  { immediate: true },
)

const winRate = computed(() =>
  career.value?.races ? t('detail.winRate', { n: Math.round((career.value.wins / career.value.races) * 100) }) : '',
)
</script>

<style scoped>
.small { font-size: 12px; }

.dd-hero {
  position: relative;
  padding: 32px 0 40px;
  border-bottom: 1px solid var(--line);
  overflow: hidden;
}

.dd-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 15% 60%, color-mix(in srgb, var(--tc) 28%, transparent), transparent 55%);
  pointer-events: none;
}

.dd-number {
  position: absolute;
  right: 2%;
  top: 50%;
  transform: translateY(-50%);
  font-size: clamp(160px, 26vw, 360px);
  font-weight: 900;
  line-height: 1;
  color: var(--tc);
  opacity: 0.08;
  pointer-events: none;
  animation: rise 1s var(--ease) both;
}

.dd-hero-inner { position: relative; }

.back {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 20px;
}
.back:hover { color: var(--text); }

.dd-header {
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
}

.dd-avatar { animation: rise 0.6s var(--ease) both; }

.dd-title { flex: 1; min-width: 240px; }

.dd-team {
  display: flex;
  gap: 8px;
  font-weight: 700;
  color: var(--tc);
}

.dd-name { margin: 6px 0 10px; }
.dd-first { display: block; font-size: 0.4em; font-weight: 600; color: var(--text-dim); letter-spacing: 0; }
.dd-meta { display: flex; align-items: center; gap: 8px; }

.dd-points { text-align: right; }
.dd-pts { font-size: 64px; font-weight: 700; line-height: 1; color: var(--tc); }

.dd-body { padding-top: 8px; }

.section-tight { margin-top: 32px; }
.section-title { margin-bottom: 14px; }

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr));
  gap: 10px;
}

.dd-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
  margin-top: 32px;
}

.legend { display: flex; align-items: center; gap: 6px; }
.legend i { display: inline-block; width: 16px; height: 0; border-top: 3px solid var(--tc); margin-left: 6px; }
.legend .lg-dash { border-top: 2px dashed #9aa0aa; }

.bio {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 900px) {
  .dd-grid { grid-template-columns: 1fr; }
  .dd-points { text-align: left; }
  .dd-pts { font-size: 48px; }
}

@media (max-width: 640px) {
  .dd-header { gap: 16px; }
  .dd-avatar { --size: 96px !important; }
}
</style>
