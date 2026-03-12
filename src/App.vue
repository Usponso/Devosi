<template>
  <div id="app">
    <NavBar />

    <!-- Loading overlay global -->
    <transition name="fade">
      <div v-if="store.loading && !store.drivers.length" class="global-loader">
        <div class="loader-inner">
          <div class="loader-logo font-display">F1</div>
          <div class="loader-bars">
            <div class="loader-bar" v-for="i in 5" :key="i" :style="{ animationDelay: `${i * 0.12}s` }"></div>
          </div>
          <div class="loader-text">Chargement des données...</div>
        </div>
      </div>
    </transition>

    <!-- Erreur API -->
    <transition name="fade">
      <div v-if="store.error && !store.loading && !store.drivers.length" class="global-error">
        <div class="error-inner">
          <div class="error-icon">⚠️</div>
          <div class="error-title font-display">Connexion impossible</div>
          <p class="error-sub">Impossible de joindre l'API F1. Vérifiez votre connexion internet.</p>
          <button class="error-retry" @click="store.loadData()">Réessayer</button>
        </div>
      </div>
    </transition>

    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { useF1Store } from '@/stores/f1Store'

const store = useF1Store()
onMounted(() => store.loadData())
</script>

<style>
.main-content {
  min-height: calc(100vh - var(--nav-height));
  padding-top: var(--nav-height);
  padding: 1em;
}

/* Global loader */
.global-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--bg, #0a0a0a);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loader-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.loader-logo {
  font-size: 64px;
  color: var(--red, #E8002D);
  letter-spacing: -2px;
}

.loader-bars {
  display: flex;
  gap: 6px;
  align-items: flex-end;
  height: 32px;
}

.loader-bar {
  width: 6px;
  background: var(--red, #E8002D);
  border-radius: 3px;
  animation: loaderBar 0.9s ease-in-out infinite alternate;
}

@keyframes loaderBar {
  from { height: 8px; opacity: 0.3; }
  to { height: 32px; opacity: 1; }
}

.loader-text {
  font-size: 13px;
  color: var(--white-muted, rgba(255,255,255,0.4));
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
}

/* Error screen */
.global-error {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--bg, #0a0a0a);
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-inner {
  text-align: center;
  padding: 40px;
  max-width: 400px;
}

.error-icon { font-size: 48px; margin-bottom: 16px; }
.error-title { font-size: 36px; margin-bottom: 8px; color: var(--white, #fff); }
.error-sub { font-size: 14px; color: var(--white-muted, rgba(255,255,255,0.4)); margin-bottom: 24px; line-height: 1.6; }

.error-retry {
  background: var(--red, #E8002D);
  color: white;
  border: none;
  padding: 12px 28px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.error-retry:hover { opacity: 0.85; }

/* Page transitions */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
