<template>
  <AppHeader />

  <!-- Chargement initial : feux de départ -->
  <transition name="fade">
    <div v-if="store.loading && !store.drivers.length" class="global-loader" role="status">
      <div class="lights" aria-hidden="true">
        <span v-for="i in 5" :key="i" class="light" :style="{ animationDelay: `${i * 0.18}s` }"></span>
      </div>
      <div class="eyebrow">Chargement de la saison…</div>
    </div>
  </transition>

  <!-- Erreur API -->
  <div v-if="store.error && !store.loading && !store.drivers.length" class="global-error container">
    <div class="title-lg">Drapeau rouge</div>
    <p class="dim">Impossible de joindre l'API F1. Vérifie ta connexion puis réessaie.</p>
    <button class="btn" @click="store.loadData()">Réessayer</button>
  </div>

  <main class="app-main">
    <router-view v-slot="{ Component, route }">
      <transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
  </main>

  <footer class="footer container muted">
    Données : <a href="https://jolpi.ca" target="_blank" rel="noopener">Jolpica F1</a>,
    <a href="https://openf1.org" target="_blank" rel="noopener">OpenF1</a>,
    <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a>,
    tracés <a href="https://github.com/bacinger/f1-circuits" target="_blank" rel="noopener">f1-circuits</a>.
    Devosi n'est pas affilié à la Formule 1.
  </footer>

  <MobileTabBar />
  <TeamPicker />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import MobileTabBar from '@/components/MobileTabBar.vue'
import TeamPicker from '@/components/TeamPicker.vue'
import { useF1Store } from '@/stores/f1Store'
import { useTeamTheme } from '@/composables/useTeamTheme'
import { onRevalidate } from '@/services/http'

const store = useF1Store()
useTeamTheme()

// Si une donnée servie depuis un cache périmé a changé, on recharge silencieusement
let refreshTimer = null
const stopRevalidate = onRevalidate(() => {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => store.loadData(), 400)
})

onMounted(() => store.loadData())
onUnmounted(() => {
  stopRevalidate()
  clearTimeout(refreshTimer)
})
</script>

<style>
.app-main {
  min-height: 100vh;
  padding-top: var(--header-h);
}

.footer {
  padding-top: 24px;
  padding-bottom: calc(32px + var(--tabbar-h));
  border-top: 1px solid var(--line);
  font-size: 12px;
}

.footer a {
  color: var(--text-dim);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.global-loader {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: var(--bg);
}

.lights {
  display: flex;
  gap: 14px;
  padding: 14px 18px;
  background: #050506;
  border-radius: 12px;
  border: 1px solid var(--line);
}

.light {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #2a0b0b;
  animation: light-on 2s infinite;
}

@keyframes light-on {
  0%, 15% { background: #2a0b0b; box-shadow: none; }
  25%, 85% { background: #ff1e1e; box-shadow: 0 0 18px #ff1e1e; }
  100% { background: #2a0b0b; box-shadow: none; }
}

.global-error {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding-top: var(--header-h);
}
</style>
