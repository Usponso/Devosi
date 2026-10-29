<template>
  <router-link v-if="race && closesAt" v-reveal to="/pronostics" class="prediction-widget">
    <span class="pr-icon" aria-hidden="true"><Icon name="flag" :size="22" /></span>
    <span class="pr-text">
      <span class="eyebrow">Pronostics · {{ gpNameFr(race.name) }}</span>
      <strong class="pr-title">{{ open ? 'Qui sera sur le podium ?' : 'Pronostics fermés, place à la course' }}</strong>
      <span class="muted pr-sub">
        <template v-if="open">Podium et pole avant les qualifs · fermeture dans {{ closesIn }}</template>
        <template v-else>Résultats et points dans l'heure qui suit l'arrivée</template>
      </span>
    </span>
    <span class="btn pr-cta" :class="{ 'btn-ghost': !open }">{{ open ? 'Pronostiquer' : 'Voir' }}</span>
  </router-link>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { useF1Store } from '@/stores/f1Store'
import { toDate } from '@/utils/race'
import { gpNameFr } from '../../../scripts/catalog/gp-names.mjs'

/** Accueil : invitation à pronostiquer le prochain Grand Prix (saison en cours uniquement) */
const store = useF1Store()
const race = computed(() => (store.isCurrentSeason ? store.nextRace : null))
const closesAt = computed(() => {
  const q = race.value?.qualifying
  return q ? toDate(q.date, q.time) : null
})

const now = ref(Date.now())
let timer = null
const open = computed(() => closesAt.value > now.value)
const closesIn = computed(() => {
  const min = Math.max(0, Math.ceil((closesAt.value - now.value) / 60000))
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  return d ? `${d} j ${h} h` : `${h} h ${String(min % 60).padStart(2, '0')}`
})

onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 30000)))
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.prediction-widget {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 16px 20px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background:
    radial-gradient(120% 160% at 0% 50%, rgb(225 6 0 / 0.14), transparent 60%),
    var(--surface);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.25s var(--ease);
}

.prediction-widget:hover { border-color: rgb(225 6 0 / 0.5); }

.pr-icon {
  flex: none;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #ff8a8a;
  background: rgb(225 6 0 / 0.14);
}

.pr-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pr-title { font-size: 18px; font-weight: 900; line-height: 1.2; }
.pr-sub { font-size: 13px; }
.pr-cta { flex: none; }

@media (max-width: 560px) {
  .prediction-widget { gap: 14px; padding: 14px 16px; }
  .pr-icon { width: 42px; height: 42px; }
  .pr-cta { display: none; }
}
</style>
