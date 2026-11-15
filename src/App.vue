<template>
  <AppHeader />

  <!-- Chargement initial : feux de départ -->
  <transition name="fade">
    <div v-if="store.loading && !store.drivers.length" class="global-loader" role="status">
      <div class="lights" aria-hidden="true">
        <span v-for="i in 5" :key="i" class="light" :style="{ animationDelay: `${i * 0.18}s` }"></span>
      </div>
      <div class="eyebrow">{{ $t('app.loading') }}</div>
    </div>
  </transition>

  <!-- Erreur API -->
  <div v-if="store.error && !store.loading && !store.drivers.length" class="global-error container">
    <div class="title-lg">{{ $t('app.errorTitle') }}</div>
    <p class="dim">{{ $t('app.errorText') }}</p>
    <button class="btn" @click="store.loadData()">{{ $t('common.retry') }}</button>
  </div>

  <main class="app-main">
    <LiveTicker />
    <CardsNav v-if="inCards" />
    <router-view v-slot="{ Component, route }">
      <transition name="page">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
  </main>

  <footer class="footer container muted">
    {{ $t('app.footerData') }} <a href="https://jolpi.ca" target="_blank" rel="noopener">Jolpica F1</a>,
    <a href="https://openf1.org" target="_blank" rel="noopener">OpenF1</a>,
    <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a>,
    {{ $t('app.footerTracks') }} <a href="https://github.com/bacinger/f1-circuits" target="_blank" rel="noopener">f1-circuits</a>.
    {{ $t('app.footerDisclaimer') }}
    <span class="lang-switch">
      <button v-for="l in LOCALES" :key="l" class="lang" :class="{ on: l === $i18n.locale }" :aria-pressed="l === $i18n.locale" @click="switchLocale(l)">{{ l.toUpperCase() }}</button>
    </span>
  </footer>

  <MobileTabBar />
  <TeamPicker />
  <CardViewer />
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import MobileTabBar from '@/components/MobileTabBar.vue'
import LiveTicker from '@/components/LiveTicker.vue'
import TeamPicker from '@/components/TeamPicker.vue'
import CardViewer from '@/components/cards/CardViewer.vue'
import CardsNav from '@/components/cards/CardsNav.vue'
import { CARDS_PATHS } from '@/components/navItems'
import { useF1Store } from '@/stores/f1Store'
import { useTeamTheme } from '@/composables/useTeamTheme'
import { onRevalidate } from '@/services/http'
import { LOCALES, setLocale, locale } from '@/i18n'

const store = useF1Store()
useTeamTheme()

/** Choix de la langue (rechargement : certaines données sont mises en forme au chargement) */
function switchLocale(lang) {
  if (lang === locale()) return
  setLocale(lang)
  window.location.reload()
}

// Section Cartes : barre d'onglets commune sous l'en-tête
const route = useRoute()
const inCards = computed(() => CARDS_PATHS.some((p) => route.path.startsWith(p)))

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

/* .footer.container : plus précis que .container (padding: 0 24px), sinon la marge du bas
   sous la barre d'onglets mobile est écrasée et le pied de page passe dessous */
.footer.container {
  padding-top: 24px;
  padding-bottom: calc(32px + var(--tabbar-h) + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  font-size: 12px;
}

.footer a {
  color: var(--text-dim);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Choix de la langue, accessible à tous (visiteurs compris) */
.lang-switch {
  display: inline-flex;
  gap: 2px;
  margin-left: 8px;
  padding: 2px;
  border: 1px solid var(--line);
  border-radius: 99px;
  vertical-align: middle;
}

.lang {
  padding: 2px 8px;
  border: 0;
  border-radius: 99px;
  font: inherit;
  font-weight: 700;
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
}

.lang.on {
  color: var(--text);
  background: var(--surface-2);
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
