<template>
  <nav class="tabbar" aria-label="Navigation">
    <router-link
      v-for="item in NAV_ITEMS"
      :key="item.to"
      :to="item.to"
      class="tabbar-item"
      :class="{ active: isActive(item), featured: item.featured }"
    >
      <span v-if="item.featured" class="featured-icon">
        <Icon :name="item.icon" :size="20" />
        <span v-if="packBadge" class="tab-badge mono" :aria-label="`${packBadge} packs ou récompenses en attente`">{{ packBadge }}</span>
      </span>
      <Icon v-else :name="item.icon" :size="22" />
      <span :class="{ 'featured-label': item.featured }">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'
import Icon from './Icon.vue'
import { NAV_ITEMS, isNavActive } from './navItems'
import { usePackBadge } from '@/composables/usePackBadge'

const route = useRoute()
const packBadge = usePackBadge()
const isActive = (item) => isNavActive(item, route.path)
</script>

<style scoped>
.tabbar {
  display: none;
}

@media (max-width: 860px) {
  .tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    height: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: rgba(11, 12, 15, 0.92);
    backdrop-filter: blur(14px);
    border-top: 1px solid var(--line);
  }

  .tabbar-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    transition: color var(--t);
  }

  .tabbar-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 30%;
    right: 30%;
    height: 2px;
    border-radius: 0 0 2px 2px;
    background: var(--accent);
    transform: scaleX(0);
    transition: transform 0.35s var(--ease);
  }

  .tabbar-item.active { color: var(--text); }
  .tabbar-item.active::before { transform: scaleX(1); }
  .tabbar-item.active .icon { color: var(--accent); }

  .featured-icon {
    position: relative;
    display: grid;
    place-items: center;
    width: 40px;
    height: 26px;
    border-radius: 9px;
    color: #fff;
    border: 1.5px solid transparent;
    background:
      linear-gradient(var(--surface-2), var(--surface-2)) padding-box,
      conic-gradient(from var(--holo-spin), #ff4fd8, #5ad1ff, #ffe066, #7dff9b, #ff4fd8) border-box;
    box-shadow: 0 0 14px rgb(255 79 216 / 0.25);
    animation: holo-spin 6s linear infinite;
  }

  .tabbar-item.featured.active .featured-icon .icon { color: #fff; }
  .tabbar-item.featured::before { left: 25%; right: 25%; }

  .featured-label {
    background: linear-gradient(100deg, #fff 40%, #ffc6f2 47%, #9be8ff 53%, #fff 60%);
    background-size: 250% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: label-shine 4.5s ease-in-out infinite;
  }

  .tab-badge {
    position: absolute;
    top: -8px;
    right: -10px;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    display: grid;
    place-items: center;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 700;
    background: var(--accent);
    color: var(--on-accent);
    animation: badge-ping 2s ease-out infinite;
  }
}

/* Lien « Cartes » mis en avant : contour holographique comme les cartes Mythiques */
@property --holo-spin {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@keyframes holo-spin {
  to { --holo-spin: 360deg; }
}

@keyframes label-shine {
  0%, 55% { background-position: 120% 0; }
  100% { background-position: -120% 0; }
}

@keyframes badge-ping {
  0% { box-shadow: 0 0 0 2px var(--bg), 0 0 0 2px rgb(var(--accent-rgb) / 0.7); }
  80%, 100% { box-shadow: 0 0 0 2px var(--bg), 0 0 0 9px rgb(var(--accent-rgb) / 0); }
}

@media (prefers-reduced-motion: reduce) {
  .featured-icon, .featured-label, .tab-badge { animation: none; }
}
</style>
