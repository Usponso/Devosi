<template>
  <nav class="cards-nav" aria-label="Section Cartes">
    <div class="container cn-inner">
      <div ref="scroller" class="cn-tabs">
        <router-link
          v-for="tab in TABS"
          :key="tab.to"
          :to="tab.to"
          class="cn-tab"
          :class="{ active: isActive(tab) }"
          :aria-current="isActive(tab) ? 'page' : undefined"
        >
          <Icon :name="tab.icon" :size="16" />
          <span>{{ tab.label }}</span>
          <span v-if="badge(tab)" class="cn-badge mono">{{ badge(tab) }}</span>
        </router-link>
      </div>
      <CoinBalance class="cn-coins" />
    </div>
  </nav>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '@/components/Icon.vue'
import CoinBalance from './CoinBalance.vue'
import { useCollectionStore } from '@/stores/collectionStore'

/** Onglets communs à toutes les pages de la collection de cartes */
const TABS = [
  { to: '/packs', label: 'Packs', icon: 'package', badge: 'packs' },
  { to: '/quetes', label: 'Quêtes', icon: 'trophy', badge: 'quests' },
  { to: '/boutique', label: 'Boutique', icon: 'cart' },
  { to: '/collection', label: 'Collection', icon: 'album' },
  { to: '/atelier', label: 'Atelier', icon: 'hammer' },
  { to: '/joueurs', label: 'Joueurs', icon: 'users', badge: 'friends' },
]

const route = useRoute()
const col = useCollectionStore()
const scroller = ref(null)

const isActive = (tab) => route.path.startsWith(tab.to)

function badge(tab) {
  if (tab.badge === 'packs') return col.packsToOpen
  if (tab.badge === 'quests') return col.questsReady
  if (tab.badge === 'friends') return col.friendRequests
  return 0
}

// Mobile : l'onglet actif reste visible dans la barre qui défile
watch(
  () => route.path,
  async () => {
    await nextTick()
    scroller.value?.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  },
  { immediate: true },
)
</script>

<style scoped>
.cards-nav {
  position: sticky;
  top: var(--header-h);
  z-index: 90;
  background: rgb(11 12 15 / 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}

.cn-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cn-tabs {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.cn-tabs::-webkit-scrollbar { display: none; }

.cn-tab {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 14px 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-muted);
  transition: color var(--t);
}

.cn-tab::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 0;
  height: 2px;
  border-radius: 1px;
  background: var(--accent);
  transform: scaleX(0);
  transition: transform 0.35s var(--ease);
}

.cn-tab:hover,
.cn-tab.active { color: var(--text); }
.cn-tab.active::after { transform: scaleX(1); }

.cn-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  color: var(--on-accent);
  background: var(--accent);
}

.cn-coins { flex-shrink: 0; }

@media (max-width: 640px) {
  .cn-tab { padding: 12px 10px; font-size: 13px; }
  .cn-coins { display: none; }
}
</style>
