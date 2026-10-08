<template>
  <div class="page home">
    <NextRaceHero v-if="store.nextRace" :race="store.nextRace" :total-rounds="store.races.length" />

    <!-- Saison terminée : le champion -->
    <section v-else-if="champion" class="season-over">
      <div class="container">
        <div class="eyebrow">Saison {{ store.seasonYear }} terminée</div>
        <h1 class="title-xl champion-name">
          <span class="muted">Champion</span><br />{{ champion.name }}
        </h1>
        <div class="dim champion-meta">
          <Flag :src="champion.flag" :size="16" /> {{ champion.team }} ·
          <span class="mono">{{ champion.points }} pts · {{ champion.wins }} victoires</span>
        </div>
      </div>
    </section>

    <div class="container">
      <!-- Progression de la saison -->
      <section class="season-progress" v-reveal>
        <div class="sp-head">
          <span class="eyebrow">Saison {{ store.seasonYear }}</span>
          <span class="mono muted">{{ store.completedRaces.length }}/{{ store.races.length }} GP</span>
        </div>
        <div class="sp-track">
          <router-link
            v-for="race in store.races"
            :key="race.id"
            :to="`/season/${race.id}`"
            class="sp-seg"
            :class="{ done: race.completed, next: race.id === store.nextRace?.id }"
            :style="{ '--tc': winnerOf(race)?.color }"
            :title="segmentTitle(race)"
          ></router-link>
        </div>
      </section>

      <div class="home-grid">
        <!-- Classement pilotes -->
        <section class="card" v-reveal>
          <div class="card-head">
            <h2 class="title-md">Pilotes</h2>
            <router-link to="/standings" class="link-arrow">Classement complet →</router-link>
          </div>
          <ol class="mini-standings">
            <li v-for="d in topDrivers" :key="d.id">
              <router-link
                :to="`/drivers/${d.id}`"
                class="ms-row team-edge"
                :class="{ 'is-fav': d.teamId === prefs.favoriteTeamId }"
                :style="{ '--tc': d.color }"
              >
                <span class="ms-pos mono" :class="`pos-${d.position}`">{{ d.position }}</span>
                <span class="ms-who">
                  <span class="ms-name"><span class="ms-first">{{ d.givenName }}</span> {{ d.familyName }}</span>
                  <span class="meter"><span :style="{ width: `${(d.points / leaderPoints) * 100}%`, background: d.color }"></span></span>
                </span>
                <span class="ms-gap mono muted">{{ d.position === 1 ? 'Leader' : `−${leaderPoints - d.points}` }}</span>
                <span class="ms-pts mono" v-countup="d.points"></span>
              </router-link>
            </li>
          </ol>
        </section>

        <!-- Lutte pour le titre -->
        <section class="card title-fight" v-reveal="80">
          <div class="card-head">
            <h2 class="title-md">Lutte pour le titre</h2>
            <router-link to="/standings" class="link-arrow">Évolution →</router-link>
          </div>
          <template v-if="contention">
            <p v-if="contention.decided" class="tf-verdict">
              <Icon name="trophy" :size="18" class="accent" />
              <strong>{{ contention.contenders[0].name }}</strong>&nbsp;est champion du monde.
            </p>
            <p v-else class="tf-verdict dim">
              Encore <strong class="mono">{{ contention.maxRemaining }} pts</strong> en jeu sur
              {{ contention.racesLeft }} GP<template v-if="contention.sprintsLeft"> et {{ contention.sprintsLeft }} sprints</template>.
            </p>
            <LineChart
              v-if="progression.rounds.length > 1"
              :series="titleSeries"
              :x-labels="progressionLabels"
              :height="190"
              aria-label="Évolution des points des prétendants au titre"
            />
            <div class="tf-contenders">
              <span class="eyebrow">Encore en course</span>
              <div class="tf-chips">
                <router-link
                  v-for="c in contention.contenders.slice(0, 8)"
                  :key="c.id"
                  :to="`/drivers/${c.id}`"
                  class="tf-chip"
                  :style="{ '--tc': c.color }"
                >{{ c.shortName }}</router-link>
                <span v-if="contention.contenders.length > 8" class="muted tf-more">+{{ contention.contenders.length - 8 }}</span>
              </div>
            </div>
          </template>
        </section>

        <!-- Dernier Grand Prix -->
        <section v-if="lastRace" class="card last-race" v-reveal="160">
          <div class="card-head">
            <h2 class="title-md">Dernier GP</h2>
            <router-link :to="`/season/${lastRace.id}`" class="link-arrow">Résultats →</router-link>
          </div>
          <div class="lr-name">
            <Flag :src="lastRace.flag" :size="14" />
            <span>{{ lastRace.name }}</span>
          </div>
          <div v-if="lastRace.results.length" class="podium">
            <router-link
              v-for="p in podiumOrder"
              :key="p.driverId"
              :to="`/drivers/${p.driverId}`"
              class="podium-step"
              :class="`step-${p.pos}`"
              :style="{ '--tc': p.color }"
            >
              <span class="ps-code">{{ p.driver }}</span>
              <span class="ps-team muted">{{ p.constructor }}</span>
              <span class="ps-block mono">{{ p.pos }}</span>
            </router-link>
          </div>
          <div v-else class="skeleton podium-skeleton"></div>
          <div class="lr-facts">
            <div v-if="topMover" class="lr-fact">
              <Icon name="chart" :size="16" class="accent" />
              <span>Remontée : <strong>{{ topMover.driver }}</strong> P{{ topMover.grid }} → P{{ topMover.pos }}</span>
              <span class="gain-up mono">+{{ topMover.gained }}</span>
            </div>
            <div v-if="fastestLap" class="lr-fact">
              <Icon name="timer" :size="16" class="accent" />
              <span>Meilleur tour : <strong>{{ fastestLap.driver }}</strong></span>
              <span class="mono muted">{{ fastestLap.fastestLap.time }}</span>
            </div>
          </div>
        </section>

        <!-- Mon écurie -->
        <section class="card my-team" v-reveal="80">
          <template v-if="favTeam">
            <div class="card-head">
              <h2 class="title-md">Mon écurie</h2>
              <router-link :to="`/teams/${favTeam.id}`" class="link-arrow">Fiche →</router-link>
            </div>
            <router-link :to="`/teams/${favTeam.id}`" class="mt-car" :style="{ '--tc': favTeam.color }" aria-hidden="true" tabindex="-1">
              <CarImage :team-id="favTeam.id" :season="store.seasonYear" :width="900" />
            </router-link>
            <div class="mt-summary">
              <div>
                <div class="mt-name">{{ favTeam.name }}</div>
                <div class="muted mt-sub">P{{ favTeam.position }} constructeurs · {{ favTeam.wins }} victoire{{ favTeam.wins > 1 ? 's' : '' }}</div>
              </div>
              <div class="mt-pts mono"><span v-countup="favTeam.points"></span><small>pts</small></div>
            </div>
            <div v-for="d in favDrivers" :key="d.id" class="mt-driver">
              <router-link :to="`/drivers/${d.id}`" class="mt-driver-name">
                <span class="mono muted">P{{ d.position }}</span> {{ d.name }}
              </router-link>
              <FormStrip :items="recentForm(d.id, store.races, 5)" />
            </div>
            <TeammateDuel
              v-if="favDrivers.length === 2"
              class="mt-duel"
              :a="favDrivers[0]"
              :b="favDrivers[1]"
              :duel="teammateDuel(favDrivers[0].id, favDrivers[1].id, store.races)"
            />
          </template>
          <div v-else class="mt-empty">
            <Icon name="shield" :size="32" class="accent" />
            <h2 class="title-md">Choisis ton écurie</h2>
            <p class="muted">Ses couleurs habillent l'app, et ses pilotes, leur duel et leur forme s'affichent ici.</p>
            <button class="btn" @click="prefs.pickerOpen = true">Choisir</button>
          </div>
        </section>

        <!-- Constructeurs -->
        <section class="card" v-reveal="160">
          <div class="card-head">
            <h2 class="title-md">Constructeurs</h2>
            <router-link to="/standings?tab=teams" class="link-arrow">Détails →</router-link>
          </div>
          <ol class="teams-bars">
            <li v-for="t in store.teamStandings" :key="t.id">
              <router-link :to="`/teams/${t.id}`" class="tb-row" :class="{ 'is-fav': t.id === prefs.favoriteTeamId }">
                <span class="tb-pos mono muted">{{ t.position }}</span>
                <span class="tb-name">{{ t.name }}</span>
                <span class="tb-bar"><span :style="{ width: `${(t.points / teamLeaderPoints) * 100}%`, background: t.color }"></span></span>
                <span class="tb-pts mono">{{ t.points }}</span>
              </router-link>
            </li>
          </ol>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import Flag from '@/components/Flag.vue'
import NextRaceHero from '@/components/NextRaceHero.vue'
import TeammateDuel from '@/components/TeammateDuel.vue'
import LineChart from '@/components/charts/LineChart.vue'
import FormStrip from '@/components/charts/FormStrip.vue'
import CarImage from '@/components/CarImage.vue'
import { useF1Store } from '@/stores/f1Store'
import { usePrefsStore } from '@/stores/prefsStore'
import {
  pointsProgression,
  titleContention,
  biggestMovers,
  recentForm,
  teammateDuel,
  winnerOf,
} from '@/utils/stats'
import { formatShortDate, shortRaceName } from '@/utils/race'

const store = useF1Store()
const prefs = usePrefsStore()

const topDrivers = computed(() => store.driverStandings.slice(0, 5))
const leaderPoints = computed(() => store.driverStandings[0]?.points || 1)
const teamLeaderPoints = computed(() => store.teamStandings[0]?.points || 1)

const champion = computed(() => (!store.nextRace && store.races.length ? store.driverStandings[0] : null))

const lastRace = computed(() => store.lastRace)

const podiumOrder = computed(() => {
  const top = lastRace.value?.results.filter((r) => r.pos <= 3) ?? []
  return [2, 1, 3].map((p) => top.find((r) => r.pos === p)).filter(Boolean)
})

const topMover = computed(() => {
  const best = lastRace.value?.results.length ? biggestMovers(lastRace.value, 1)[0] : null
  return best && best.gained > 0 ? best : null
})

const fastestLap = computed(() => lastRace.value?.results.find((r) => r.fastestLap?.rank === 1) ?? null)

// Lutte pour le titre
const contention = computed(() =>
  store.driverStandings.length ? titleContention(store.driverStandings, store.races, store.seasonYear) : null,
)

const progression = computed(() => pointsProgression(store.races, 'driver'))
const progressionLabels = computed(() => progression.value.rounds.map((r) => `M${r.round}`))

const titleSeries = computed(() => {
  const ids = new Set(contention.value.contenders.slice(0, 5).map((c) => c.id))
  // Toujours au moins le top 3 pour que le graphe ait du sens
  store.driverStandings.slice(0, 3).forEach((d) => ids.add(d.id))
  return store.driverStandings
    .filter((d) => ids.has(d.id))
    .map((d, i) => ({
      id: d.id,
      label: d.shortName,
      color: d.color,
      values: progression.value.series.get(d.id) ?? [],
      highlight: i === 0 || d.teamId === prefs.favoriteTeamId,
    }))
})

// Mon écurie
const favTeam = computed(() => store.getTeamById(prefs.favoriteTeamId))
const favDrivers = computed(() => (favTeam.value ? store.getDriversByTeam(favTeam.value.id).slice(0, 2) : []))

function segmentTitle(race) {
  const w = winnerOf(race)
  return `${race.round}. ${shortRaceName(race.name)} · ${formatShortDate(race.date)}${w ? ` · ${w.driver}` : ''}`
}
</script>

<style scoped>
/* Saison terminée */
.season-over {
  padding: 64px 0 48px;
  border-bottom: 1px solid var(--line);
  background: radial-gradient(ellipse at 80% 40%, rgb(var(--accent-rgb) / 0.2), transparent 60%);
}

.champion-name { margin: 12px 0 16px; }
.champion-name .muted { font-size: 0.45em; }
.champion-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* Progression saison */
.season-progress { margin: 32px 0 24px; }

.sp-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 12px;
}

.sp-track {
  display: flex;
  gap: 4px;
}

.sp-seg {
  flex: 1;
  height: 8px;
  border-radius: 3px;
  background: var(--surface-3);
  transition: transform var(--t), background var(--t);
}

.sp-seg.done { background: var(--tc, var(--text-muted)); }
.sp-seg.next {
  background: var(--accent);
  animation: pulse 1.6s ease-in-out infinite;
}
.sp-seg:hover { transform: scaleY(1.8); }

/* Grille de cartes */
.home-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
}

.home-grid > :nth-child(1) { grid-column: span 5; }
.home-grid > :nth-child(2) { grid-column: span 7; }
.home-grid > :nth-child(3) { grid-column: span 4; }
.home-grid > :nth-child(4) { grid-column: span 4; }
.home-grid > :nth-child(5) { grid-column: span 4; }

@media (max-width: 1100px) {
  .home-grid > :nth-child(n) { grid-column: span 6; }
  .home-grid > :nth-child(2) { grid-column: span 12; order: -1; }
}

@media (max-width: 720px) {
  .home-grid > :nth-child(n) { grid-column: span 12; }
}

/* Mini classement pilotes */
.mini-standings { list-style: none; display: flex; flex-direction: column; gap: 4px; }

.ms-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto 44px;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 0;
  transition: background var(--t);
}

.ms-row:hover { background: var(--surface-2); }
.ms-pos { font-weight: 700; font-size: 15px; }
.ms-who { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ms-name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ms-first { font-weight: 400; color: var(--text-dim); }
.ms-gap { font-size: 12px; }
.ms-pts { font-weight: 700; text-align: right; font-size: 16px; }

/* Titre */
.tf-verdict {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 14px;
}

.tf-contenders { margin-top: 12px; }
.tf-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }

.tf-chip {
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  background: color-mix(in srgb, var(--tc) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--tc) 50%, transparent);
}

.tf-more { font-size: 12px; align-self: center; }

/* Dernier GP */
.lr-name { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text-dim); }

.podium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: end;
  gap: 8px;
  margin: 18px 0 14px;
}

.podium-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2px;
}

.ps-code { font-size: 20px; font-weight: 900; }
.ps-team { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

.ps-block {
  width: 100%;
  margin-top: 6px;
  display: grid;
  place-items: center;
  font-size: 22px;
  font-weight: 700;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--tc) 35%, var(--surface-2)), var(--surface-2));
  border-top: 3px solid var(--tc);
  transform-origin: bottom;
  animation: rise-up 0.8s var(--ease) both;
}

.step-1 .ps-block { height: 92px; animation-delay: 0.15s; }
.step-2 .ps-block { height: 68px; animation-delay: 0.3s; }
.step-3 .ps-block { height: 52px; animation-delay: 0.45s; }

@keyframes rise-up {
  from { transform: scaleY(0); }
}

.podium-skeleton { height: 140px; margin: 18px 0; }

.lr-facts { display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
.lr-fact { display: flex; align-items: center; gap: 8px; }
.lr-fact > span:last-child { margin-left: auto; }

/* Mon écurie */
.mt-car {
  position: relative;
  display: block;
  margin: -4px -8px 10px;
}

.mt-car:empty { display: none; }

.mt-car::before {
  content: '';
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: 0;
  height: 40%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--tc) 50%, transparent), transparent);
  filter: blur(10px);
}

.mt-car :deep(.car-img) {
  position: relative;
  width: 100%;
  height: auto;
  filter: drop-shadow(0 10px 12px rgba(0, 0, 0, 0.6));
  animation: mt-car-in 1s cubic-bezier(0.16, 1, 0.3, 1) both;
}


@keyframes mt-car-in {
  from { transform: translateX(-40%); opacity: 0; filter: blur(6px); }
}

.mt-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.mt-name { font-size: 20px; font-weight: 900; text-transform: uppercase; }
.mt-sub { font-size: 12px; }
.mt-pts { font-size: 30px; font-weight: 700; color: var(--accent); }
.mt-pts small { font-size: 12px; color: var(--text-muted); margin-left: 4px; }

.mt-driver {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid var(--line);
  font-size: 14px;
  font-weight: 600;
}

.mt-driver-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mt-duel { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line); }

.mt-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 10px;
  padding: 12px 0;
}

/* Constructeurs */
.teams-bars { list-style: none; display: flex; flex-direction: column; gap: 2px; }

.tb-row {
  display: grid;
  grid-template-columns: 20px 92px 1fr 40px;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 13px;
  transition: background var(--t);
}

.tb-row:hover { background: var(--surface-2); }
.tb-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tb-bar { height: 8px; border-radius: 4px; background: var(--surface-2); overflow: hidden; }
.tb-bar > span { display: block; height: 100%; border-radius: 4px; transform-origin: left; animation: grow 1s var(--ease) both; }
.tb-pts { text-align: right; font-weight: 700; }
</style>
