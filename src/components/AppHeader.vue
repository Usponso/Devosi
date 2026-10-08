<template>
  <header class="header" :class="{ scrolled }">
    <div class="container header-inner">
      <router-link to="/" class="logo" aria-label="Devosi, accueil">
        <span class="logo-d">D</span>evosi
        <span class="logo-stripe" aria-hidden="true"></span>
      </router-link>

      <nav class="nav" aria-label="Navigation principale">
        <router-link
          v-for="item in NAV_ITEMS"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ active: isActive(item) }"
        >
          {{ item.label }}
        </router-link>
      </nav>

      <div class="header-tools">
        <label class="season" :class="{ loading: store.loading }">
          <span class="sr-only">Saison</span>
          <select :value="selectedValue" :disabled="store.loading" @change="onSeasonChange">
            <option value="current">{{ currentYear }}</option>
            <option v-for="year in seasonYears" :key="year" :value="year">{{ year }}</option>
          </select>
          <Icon name="chevron-down" :size="14" class="season-chevron" />
        </label>

        <button class="team-chip" :aria-label="chipLabel" @click="prefs.pickerOpen = true">
          <span class="team-dot"></span>
          <span class="team-chip-name">{{ prefs.favoriteTeam?.name ?? 'Mon écurie' }}</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from './Icon.vue'
import { NAV_ITEMS } from './navItems'
import { useF1Store } from '@/stores/f1Store'
import { usePrefsStore } from '@/stores/prefsStore'

const store = useF1Store()
const prefs = usePrefsStore()
const route = useRoute()
const router = useRouter()

const currentYear = new Date().getFullYear()
const seasonYears = computed(() => {
  const years = []
  for (let y = currentYear - 1; y >= 1950; y--) years.push(y)
  return years
})

const selectedValue = computed(() =>
  store.season === 'current' || String(store.season) === String(currentYear) ? 'current' : store.season,
)

const chipLabel = computed(() => `Écurie favorite : ${prefs.favoriteTeam?.name ?? 'aucune'}. Changer`)

const isActive = (item) => (item.exact ? route.path === item.to : route.path.startsWith(item.to))

async function onSeasonChange(event) {
  await store.changeSeason(event.target.value)
  // Une fiche détail peut ne pas exister dans la nouvelle saison : retour à la liste
  if (Object.keys(route.params).length) router.push(route.matched[0]?.path.split('/:')[0] || '/')
}

const scrolled = ref(false)
const onScroll = () => (scrolled.value = window.scrollY > 8)
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: var(--header-h);
  border-bottom: 1px solid transparent;
  transition: background var(--t), border-color var(--t);
}

.header.scrolled {
  background: rgba(11, 12, 15, 0.82);
  backdrop-filter: blur(14px);
  border-bottom-color: var(--line);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 24px;
  height: 100%;
}

.logo {
  position: relative;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  line-height: 1;
}

.logo-d { color: var(--accent); }

.logo-stripe {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -5px;
  height: 2px;
  background: linear-gradient(90deg, var(--accent), transparent);
}

.nav {
  display: flex;
  gap: 4px;
  margin-left: 16px;
}

.nav-link {
  position: relative;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  transition: color var(--t);
}

.nav-link::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 2px;
  height: 2px;
  border-radius: 1px;
  background: var(--accent);
  transform: scaleX(0);
  transition: transform 0.35s var(--ease);
}

.nav-link:hover,
.nav-link.active { color: var(--text); }
.nav-link.active::after { transform: scaleX(1); }

.header-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.season {
  position: relative;
  display: flex;
  align-items: center;
}

.season select {
  appearance: none;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 99px;
  padding: 7px 30px 7px 14px;
  cursor: pointer;
  transition: border-color var(--t);
}

.season select:hover { border-color: var(--line-strong); }
.season select option { background: var(--surface); }
.season-chevron { position: absolute; right: 10px; pointer-events: none; color: var(--text-muted); }
.season.loading .season-chevron { animation: pulse 1s infinite; }

.team-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px 7px 10px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  transition: border-color var(--t);
}

.team-chip:hover { border-color: var(--accent); }

.team-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
}

@media (max-width: 860px) {
  .nav { display: none; }
  .header {
    background: rgba(11, 12, 15, 0.82);
    backdrop-filter: blur(14px);
    border-bottom-color: var(--line);
  }
}

@media (max-width: 420px) {
  .team-chip-name { display: none; }
  .team-chip { padding: 9px; }
}
</style>
