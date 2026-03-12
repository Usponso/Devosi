<template>
  <nav class="navbar">
    <div class="nav-inner container">
      <router-link to="/" class="logo hover-glitch">
        <span class="logo-d">D</span><span class="logo-rest">evosi</span>
        <span class="logo-tag">F1</span>
      </router-link>

      <div class="nav-links">
        <router-link to="/" class="nav-link" exact-active-class="active">
          <span class="nav-icon">⬡</span> Accueil
        </router-link>
        <router-link to="/drivers" class="nav-link" active-class="active">
          <span class="nav-icon">◈</span> Pilotes
        </router-link>
        <router-link to="/season" class="nav-link" active-class="active">
          <span class="nav-icon">◉</span> Saison
        </router-link>
        <router-link to="/teams" class="nav-link" active-class="active">
          <span class="nav-icon">◆</span> Écuries
        </router-link>
        <!-- <router-link to="/news" class="nav-link" active-class="active">
          <span class="nav-icon">◎</span> News
        </router-link> -->
      </div>

      <!-- Season selector -->
      <div class="nav-season">
        <span class="season-label">Saison</span>
        <div class="season-select-wrap" :class="{ loading: store.loading }">
          <select
            class="season-select"
            :value="selectedValue"
            @change="onSeasonChange"
            :disabled="store.loading"
            id="season-selector"
            aria-label="Sélectionner la saison"
          >
            <option value="current">{{ currentYear }} ★</option>
            <option
              v-for="year in seasonYears"
              :key="year"
              :value="year"
            >{{ year }}</option>
          </select>
          <span class="season-chevron" aria-hidden="true">
            <span v-if="store.loading" class="season-spinner"></span>
            <span v-else>▾</span>
          </span>
        </div>
      </div>

      <button class="burger" @click="mobileOpen = !mobileOpen" :class="{ open: mobileOpen }" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>

    <!-- Mobile menu -->
    <transition name="mobile-menu">
      <div class="mobile-nav" v-if="mobileOpen">
        <router-link to="/" class="mobile-link" @click="mobileOpen = false">Accueil</router-link>
        <router-link to="/drivers" class="mobile-link" @click="mobileOpen = false">Pilotes</router-link>
        <router-link to="/season" class="mobile-link" @click="mobileOpen = false">Saison</router-link>
        <router-link to="/teams" class="mobile-link" @click="mobileOpen = false">Écuries</router-link>
        <router-link to="/news" class="mobile-link" @click="mobileOpen = false">News</router-link>

        <!-- Season selector mobile -->
        <div class="mobile-season">
          <span class="mobile-season-label">Saison</span>
          <select
            class="season-select season-select--mobile"
            :value="selectedValue"
            @change="onSeasonChange"
            :disabled="store.loading"
          >
            <option value="current">{{ currentYear }} ★</option>
            <option v-for="year in seasonYears" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
      </div>
    </transition>
  </nav>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useF1Store } from '@/stores/f1Store'

const store = useF1Store()
const route = useRoute()
const router = useRouter()
const mobileOpen = ref(false)

// L'année courante (pour affichage de l'option "current★")
const currentYear = new Date().getFullYear()

// Génère les années de 1950 à l'année précédente (saisons complètes)
const seasonYears = computed(() => {
  const years = []
  for (let y = currentYear - 1; y >= 1950; y--) {
    years.push(y)
  }
  return years
})

// Valeur affichée dans le select : 'current' si c'est la saison en cours, sinon l'année
const selectedValue = computed(() => {
  if (store.season === 'current') return 'current'
  // Si la saison choisie correspond à l'année courante, montrer 'current'
  if (String(store.season) === String(currentYear)) return 'current'
  return store.season
})

async function onSeasonChange(event) {
  const val = event.target.value
  mobileOpen.value = false
  await store.changeSeason(val)
  // Redirige vers l'accueil pour que l'utilisateur voit les nouvelles données
  if (route.path !== '/') {
    router.push('/')
  }
}

watch(route, () => { mobileOpen.value = false })
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: var(--nav-height);
  background: rgba(8, 8, 8, 0.92);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}

.nav-inner {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 32px;
  justify-content: space-between;
}

.logo {
  text-decoration: none;
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-shrink: 0;
}

.logo-d {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 28px;
  color: var(--red);
  line-height: 1;
}

.logo-rest {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 28px;
  color: var(--white);
  line-height: 1;
}

.logo-tag {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--red);
  background: rgba(232, 0, 45, 0.1);
  border: 1px solid rgba(232, 0, 45, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: middle;
}

.nav-links {
  display: flex;
  gap: 4px;
  flex: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: var(--white-muted);
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 8px;
  transition: color var(--transition), background var(--transition);
  position: relative;
  letter-spacing: 0.01em;
}

.nav-icon {
  font-size: 10px;
  opacity: 0.6;
}

.nav-link:hover {
  color: var(--white);
  background: rgba(255,255,255,0.06);
}

.nav-link.active {
  color: var(--white);
  background: rgba(255,255,255,0.08);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: var(--red);
  border-radius: 1px;
}

/* ── Season selector ── */
.nav-season {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.season-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--white-muted);
  line-height: 1;
}

.season-select-wrap {
  position: relative;
  display: flex;
  align-items: center;
  transition: opacity 0.2s;
}

.season-select-wrap.loading {
  opacity: 0.6;
}

.season-select {
  /* Reset complet */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background: transparent;
  border: none;
  outline: none;
  cursor: pointer;

  /* Style */
  font-family: 'Bebas Neue', 'Barlow', sans-serif;
  font-size: 22px;
  color: var(--white);
  line-height: 1;
  padding-right: 18px;
  padding-left: 2px;
  letter-spacing: 0.02em;

  /* Hover state */
  transition: color 0.2s;
}

.season-select:hover:not(:disabled) {
  color: var(--red);
}

.season-select:disabled {
  cursor: not-allowed;
}

/* Options styling (limited by browser) */
.season-select option {
  background: #111;
  color: var(--white, #fff);
  font-family: 'Barlow', sans-serif;
  font-size: 14px;
}

.season-chevron {
  position: absolute;
  right: 0;
  pointer-events: none;
  font-size: 1.2em;
  color: var(--red);
  display: flex;
  align-items: center;
}

/* Spinner de chargement dans le chevron */
.season-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 1.5px solid rgba(232,0,45,0.3);
  border-top-color: var(--red);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Burger ── */
.burger {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.burger span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--white);
  border-radius: 1px;
  transition: all 0.3s ease;
}

.burger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.burger.open span:nth-child(2) { opacity: 0; }
.burger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* ── Mobile nav ── */
.mobile-nav {
  background: var(--dark);
  border-top: 1px solid var(--border);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-link {
  display: block;
  text-decoration: none;
  color: var(--white-dim);
  font-size: 16px;
  font-weight: 500;
  padding: 12px 16px;
  border-radius: 8px;
  transition: background var(--transition), color var(--transition);
}

.mobile-link:hover {
  background: rgba(255,255,255,0.06);
  color: var(--white);
}

/* Season selector mobile */
.mobile-season {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  margin-top: 4px;
}

.mobile-season-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--white-muted);
}

.season-select--mobile {
  font-size: 16px;
  color: var(--white);
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 28px 6px 12px;
  font-family: 'Barlow', sans-serif;
  font-weight: 600;
}

/* Animations menu mobile */
.mobile-menu-enter-active, .mobile-menu-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.mobile-menu-enter-from, .mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 768px) {
  .nav-links { display: none; }
  .nav-season { display: none; }
  .burger { display: flex; }
}
</style>
