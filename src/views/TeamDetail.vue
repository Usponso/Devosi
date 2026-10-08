<template>
  <div v-if="team" class="page team-detail" :style="{ '--tc': team.color }">
    <header class="td-hero">
      <div class="td-glow" aria-hidden="true"></div>
      <div class="container td-hero-inner">
        <router-link to="/teams" class="back muted">← Écuries</router-link>
        <div class="td-header">
          <div class="td-title">
            <div class="eyebrow">P{{ team.position }} constructeurs · {{ store.seasonYear }}</div>
            <h1 class="title-xl td-name">{{ team.name }}</h1>
            <div v-if="team.base" class="dim td-meta">
              <Flag :src="team.flag" :size="14" /> {{ team.base }}
            </div>
          </div>
          <div class="td-points">
            <div class="mono td-pts" v-countup="team.points"></div>
            <div class="eyebrow">Points</div>
          </div>
        </div>
        <button
          v-if="canBeFavorite"
          class="btn fav-btn"
          :class="{ 'btn-ghost': isFav }"
          :style="isFav ? {} : { background: team.color, color: onTeamColor }"
          @click="toggleFav"
        >
          <Icon :name="isFav ? 'check' : 'star'" :size="16" />
          {{ isFav ? 'Mon écurie' : 'Définir comme mon écurie' }}
        </button>

        <!-- La monoplace entre en scène -->
        <div v-if="hasCar" class="td-stage" aria-hidden="true">
          <div class="td-speed">
            <span v-for="i in 7" :key="i" :style="{ top: `${18 + i * 9}%`, animationDelay: `${i * 0.06}s` }"></span>
          </div>
          <div class="td-floor"></div>
          <div class="td-car-wrap">
            <CarImage :team-id="team.id" :season="store.seasonYear" :width="1600" eager class="td-car" />
            <CarImage :team-id="team.id" :season="store.seasonYear" :width="1600" eager class="td-car td-reflection" />
          </div>
          <div class="td-season mono">{{ store.seasonYear }}</div>
        </div>
      </div>
    </header>

    <div class="container td-body">
      <!-- Pilotes -->
      <section class="td-drivers">
        <router-link
          v-for="d in drivers"
          :key="d.id"
          :to="`/drivers/${d.id}`"
          class="card card-link td-driver"
        >
          <DriverAvatar :driver="d" :size="72" />
          <div class="tdd-info">
            <div class="muted tdd-first">{{ d.givenName }}</div>
            <div class="tdd-last">{{ d.familyName }}</div>
            <FormStrip :items="recentForm(d.id, store.races, 5)" />
          </div>
          <div class="tdd-pts">
            <span class="mono">{{ d.points }}</span>
            <small class="muted">P{{ d.position }}</small>
          </div>
        </router-link>
      </section>

      <div class="td-grid">
        <section class="card">
          <div class="card-head">
            <h2 class="title-md">Évolution des points</h2>
            <span class="muted small">vs leader</span>
          </div>
          <LineChart
            v-if="progression.rounds.length > 1"
            :series="pointsSeries"
            :x-labels="progression.rounds.map((r) => `M${r.round}`)"
            :height="260"
            :tooltip-title="(i) => progression.rounds[i]?.name"
            aria-label="Points de l'écurie manche par manche"
          />
          <p v-else class="empty">Pas encore assez de courses.</p>
        </section>

        <section v-if="drivers.length >= 2" class="card">
          <div class="card-head">
            <h2 class="title-md">Duel interne</h2>
          </div>
          <TeammateDuel :a="drivers[0]" :b="drivers[1]" :duel="duel" :color="team.color" />
        </section>
      </div>

      <section class="tiles-section">
        <h2 class="title-md section-title">Historique</h2>
        <div class="tiles">
          <StatTile label="Grands Prix" :value="career?.races" />
          <StatTile label="Victoires" :value="career?.wins" />
          <StatTile label="Podiums" :value="career?.podiums" />
          <StatTile label="Poles" :value="career?.poles" />
          <StatTile v-if="team.championships != null" label="Titres constructeurs" :value="team.championships" />
        </div>
      </section>

      <section v-if="team.principal" class="card td-info">
        <p class="dim">{{ team.bio }}</p>
        <dl class="info-grid">
          <div><dt class="eyebrow">Directeur</dt><dd>{{ team.principal }}</dd></div>
          <div><dt class="eyebrow">Moteur</dt><dd>{{ team.engine }}</dd></div>
          <div><dt class="eyebrow">Base</dt><dd>{{ team.base }}</dd></div>
          <div><dt class="eyebrow">Création</dt><dd class="mono">{{ team.founded }}</dd></div>
        </dl>
      </section>
    </div>
  </div>

  <div v-else-if="!store.loading" class="container empty">Écurie introuvable pour cette saison.</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '@/components/Icon.vue'
import Flag from '@/components/Flag.vue'
import DriverAvatar from '@/components/DriverAvatar.vue'
import StatTile from '@/components/StatTile.vue'
import CarImage from '@/components/CarImage.vue'
import { carImage } from '@/data/cars'
import TeammateDuel from '@/components/TeammateDuel.vue'
import LineChart from '@/components/charts/LineChart.vue'
import FormStrip from '@/components/charts/FormStrip.vue'
import { useF1Store } from '@/stores/f1Store'
import { usePrefsStore } from '@/stores/prefsStore'
import { readableOn } from '@/composables/useTeamTheme'
import { PICKABLE_TEAMS } from '@/data/teams'
import { fetchTeamCareerStats } from '@/services/jolpica'
import { pointsProgression, recentForm, teammateDuel } from '@/utils/stats'

const route = useRoute()
const store = useF1Store()
const prefs = usePrefsStore()

const team = computed(() => store.getTeamById(route.params.id))
const drivers = computed(() => store.getDriversByTeam(route.params.id))
const duel = computed(() => (drivers.value.length >= 2 ? teammateDuel(drivers.value[0].id, drivers.value[1].id, store.races) : null))

const isFav = computed(() => prefs.favoriteTeamId === team.value?.id)
const hasCar = computed(() => Boolean(team.value && carImage(team.value.id, store.seasonYear)))
const onTeamColor = computed(() => readableOn(team.value.color))
// Seules les écuries de la grille actuelle peuvent devenir favorites
const canBeFavorite = computed(() => PICKABLE_TEAMS.some((t) => t.id === team.value?.id))

function toggleFav() {
  prefs.setFavoriteTeam(isFav.value ? null : team.value.id)
}

const progression = computed(() => pointsProgression(store.races, 'team'))
const pointsSeries = computed(() => {
  const leader = store.teamStandings[0]
  const ids = leader && leader.id !== team.value.id ? [team.value, leader] : [team.value, store.teamStandings[1]].filter(Boolean)
  return ids.map((t, i) => ({
    id: t.id,
    label: t.name.split(' ')[0],
    color: i === 0 ? t.color : '#9aa0aa',
    values: progression.value.series.get(t.id) ?? [],
    highlight: i === 0,
    dashed: i > 0,
  }))
})

const career = ref(null)
watch(
  () => route.params.id,
  async (id) => {
    career.value = null
    try {
      career.value = await fetchTeamCareerStats(id)
    } catch {
      career.value = null
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.small { font-size: 12px; }

.td-hero {
  position: relative;
  padding: 32px 0 36px;
  border-bottom: 1px solid var(--line);
  overflow: hidden;
}

.td-glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 85% 30%, color-mix(in srgb, var(--tc) 30%, transparent), transparent 55%),
    linear-gradient(90deg, transparent 60%, color-mix(in srgb, var(--tc) 6%, transparent));
  pointer-events: none;
}

.td-hero-inner { position: relative; }

.back {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 20px;
}
.back:hover { color: var(--text); }

.td-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  flex-wrap: wrap;
}

.td-name {
  margin: 8px 0 10px;
  background: linear-gradient(90deg, var(--text) 50%, var(--tc));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.td-meta { display: flex; align-items: center; gap: 8px; }

.td-points { text-align: right; }
.td-pts { font-size: 64px; font-weight: 700; line-height: 1; color: var(--tc); }

.fav-btn { margin-top: 20px; }

/* Scène de la monoplace */
.td-stage {
  position: relative;
  height: clamp(150px, 24vw, 300px);
  margin-top: 12px;
}

.td-car-wrap {
  position: absolute;
  left: 50%;
  bottom: 18%;
  width: min(1050px, 100%);
  transform: translateX(-50%);
  animation: td-car-in 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
}

.td-car {
  width: 100%;
  height: auto;
  filter: drop-shadow(0 18px 24px rgba(0, 0, 0, 0.6));
}

.td-reflection {
  position: absolute;
  left: 0;
  top: 100%;
  transform: scaleY(-1) translateY(6%);
  opacity: 0.22;
  filter: blur(1.5px);
  -webkit-mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent 45%);
  mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent 45%);
}

@keyframes td-car-in {
  0% { transform: translateX(-160%) skewX(-8deg); filter: blur(10px); opacity: 0; }
  55% { filter: blur(0); opacity: 1; }
  80% { transform: translateX(-47%) skewX(2deg); }
  100% { transform: translateX(-50%); }
}

.td-floor {
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: 10%;
  height: 26%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--tc) 45%, transparent), transparent);
  filter: blur(14px);
  animation: rise 1s var(--ease) 0.7s both;
}

.td-speed span {
  position: absolute;
  left: 0;
  width: 55%;
  height: 2px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--tc) 80%, #fff));
  opacity: 0;
  animation: td-speed 1.1s ease-out both;
}

@keyframes td-speed {
  0% { transform: translateX(-100%); opacity: 0; }
  30% { opacity: 0.8; }
  100% { transform: translateX(60%); opacity: 0; }
}

.td-season {
  position: absolute;
  right: 0;
  top: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--text-muted);
  animation: rise 0.6s var(--ease) 1s both;
}

.td-body { padding-top: 32px; }

.td-drivers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 12px;
}

.td-driver {
  display: flex;
  align-items: center;
  gap: 16px;
  border-left: 3px solid var(--tc);
  border-radius: 0 var(--radius) var(--radius) 0;
}

.tdd-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.tdd-first { font-size: 13px; }
.tdd-last { font-size: 22px; font-weight: 900; text-transform: uppercase; line-height: 1; margin-bottom: 4px; }

.tdd-pts {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.tdd-pts .mono { font-size: 28px; font-weight: 700; }

.td-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.tiles-section { margin-top: 32px; }
.section-title { margin-bottom: 14px; }

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
  gap: 10px;
}

.td-info { margin-top: 32px; }

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.info-grid dd { font-weight: 700; margin-top: 2px; }

@media (max-width: 900px) {
  .td-grid { grid-template-columns: 1fr; }
  .td-points { text-align: left; }
  .td-pts { font-size: 48px; }
}
</style>
