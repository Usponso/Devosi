<template>
  <div class="page teams">
    <header class="container page-head">
      <div class="eyebrow">Saison {{ store.seasonYear }} · {{ store.teams.length }} écuries</div>
      <h1 class="title-lg">Écuries</h1>
    </header>

    <div class="container team-list">
      <router-link
        v-for="(team, i) in store.teamStandings"
        :key="team.id"
        :to="`/teams/${team.id}`"
        class="team-card card card-link"
        :class="{ fav: team.id === prefs.favoriteTeamId, 'no-car': !hasCar(team.id) }"
        :style="{ '--tc': team.color, animationDelay: `${Math.min(i, 10) * 50}ms` }"
      >
        <span class="tc-stripe" aria-hidden="true"></span>
        <div class="tc-pos mono">{{ String(team.position).padStart(2, '0') }}</div>

        <div class="tc-main">
          <div class="tc-name">
            {{ team.name }}
            <span v-if="team.id === prefs.favoriteTeamId" class="badge badge-accent"><Icon name="star" :size="11" /> Mon écurie</span>
          </div>
          <div class="tc-drivers">
            <span v-for="d in store.getDriversByTeam(team.id)" :key="d.id" class="tc-driver">
              <DriverAvatar :driver="d" :size="28" />
              <span>{{ d.familyName }}</span>
              <span class="mono muted">{{ d.points }}</span>
            </span>
          </div>
        </div>

        <div v-if="hasCar(team.id)" class="tc-car" aria-hidden="true">
          <span class="tc-car-trail"></span>
          <CarImage :team-id="team.id" :season="store.seasonYear" :width="800" class="tc-car-img" />
        </div>

        <div class="tc-stats">
          <div><span class="mono">{{ team.wins }}</span><small>vic.</small></div>
          <div><span class="mono">{{ team.podiums }}</span><small>pod.</small></div>
          <div class="tc-points"><span class="mono" v-countup="team.points"></span><small>pts</small></div>
        </div>

        <div class="tc-meter meter">
          <span :style="{ width: `${(team.points / leaderPoints) * 100}%`, background: team.color }"></span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import DriverAvatar from '@/components/DriverAvatar.vue'
import CarImage from '@/components/CarImage.vue'
import { carImage } from '@/data/cars'
import { useF1Store } from '@/stores/f1Store'
import { usePrefsStore } from '@/stores/prefsStore'

const store = useF1Store()
const prefs = usePrefsStore()
const leaderPoints = computed(() => store.teamStandings[0]?.points || 1)
const hasCar = (teamId) => Boolean(carImage(teamId, store.seasonYear))
</script>

<style scoped>
.page-head {
  padding-top: 40px;
  padding-bottom: 24px;
}

.page-head .title-lg { margin-top: 6px; }

.team-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.team-card {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) minmax(0, 340px) auto;
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: 20px;
  row-gap: 14px;
  padding: 20px 24px 18px 28px;
  overflow: hidden;
  animation: rise 0.5s var(--ease) both;
  background: linear-gradient(100deg, color-mix(in srgb, var(--tc) 12%, var(--surface)), var(--surface) 45%);
}

.team-card.fav { border-color: var(--accent-line); }
.team-card:hover { border-color: color-mix(in srgb, var(--tc) 55%, transparent); }

.tc-stripe {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: var(--tc);
  box-shadow: 0 0 24px var(--tc);
}

.tc-pos {
  font-size: 34px;
  font-weight: 700;
  color: var(--tc);
}

.tc-name {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 22px;
  font-weight: 900;
  text-transform: uppercase;
}

.tc-drivers {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
}

.tc-driver {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

.tc-stats {
  display: flex;
  gap: 24px;
}

.tc-stats div {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.tc-stats .mono { font-size: 20px; font-weight: 700; }
.tc-points .mono { font-size: 32px; color: var(--tc); }
.tc-stats small { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }

.tc-meter { grid-column: 2 / -1; }

/* Monoplace : glisse vers l'avant au survol, traînée aux couleurs de l'écurie */
.tc-car {
  position: relative;
  align-self: center;
  height: 76px;
}

.tc-car-img {
  position: absolute;
  right: 0;
  top: 50%;
  width: 100%;
  height: auto;
  transform: translateY(-50%) translateX(-4%);
  filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.55));
  transition: transform 0.6s var(--ease);
  animation: car-in 0.9s var(--ease) both;
  animation-delay: inherit;
}

.tc-car-trail {
  position: absolute;
  left: -30%;
  right: 55%;
  top: 50%;
  height: 38%;
  transform: translateY(-30%) scaleX(0);
  transform-origin: right;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--tc) 55%, transparent));
  filter: blur(8px);
  opacity: 0;
  transition: transform 0.6s var(--ease), opacity 0.4s;
}

.team-card.no-car { grid-template-columns: 56px minmax(0, 1fr) auto; }
.team-card:hover .tc-car-img { transform: translateY(-50%) translateX(4%); }
.team-card:hover .tc-car-trail { transform: translateY(-30%) scaleX(1); opacity: 1; }

@keyframes car-in-mobile {
  from { transform: translateX(-30%); opacity: 0; filter: blur(6px); }
}

@keyframes car-in {
  from { transform: translateY(-50%) translateX(-60%); opacity: 0; filter: blur(6px); }
}

@media (max-width: 1000px) {
  .team-card { grid-template-columns: 56px minmax(0, 1fr) auto; }
  .tc-car { grid-column: 2 / -1; grid-row: 2; height: 70px; max-width: 320px; }
  .tc-meter { grid-row: 3; }
}

@media (max-width: 640px) {
  .team-card,
  .team-card.no-car {
    grid-template-columns: 40px minmax(0, 1fr);
    padding: 16px 16px 16px 20px;
  }
  .tc-pos { font-size: 24px; }
  .tc-name { font-size: 18px; }
  .tc-stats { grid-column: 1 / -1; justify-content: flex-start; gap: 28px; }
  .tc-meter { grid-row: auto; grid-column: 1 / -1; }
  .tc-pos { align-self: start; line-height: 1.1; }
  .tc-drivers { gap: 6px 12px; }
  .tc-driver { font-size: 13px; gap: 6px; min-width: 0; }

  /* Mobile : la monoplace a sa propre ligne, centrée, dans le flux (plus de position absolue) */
  .tc-car {
    grid-column: 1 / -1;
    grid-row: auto;
    height: auto;
    max-width: none;
    display: flex;
    justify-content: center;
    margin: 2px 0 -2px;
  }
  .tc-car-img {
    position: relative;
    top: auto;
    right: auto;
    width: 100%;
    max-width: 360px;
    transform: none;
    animation-name: car-in-mobile;
  }
  .team-card:hover .tc-car-img { transform: none; }
  .tc-car-trail { display: none; }
  .tc-stats div { align-items: flex-start; }
  .tc-points .mono { font-size: 24px; }
}
</style>
