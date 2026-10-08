<template>
  <nav class="tabbar" aria-label="Navigation">
    <router-link
      v-for="item in NAV_ITEMS"
      :key="item.to"
      :to="item.to"
      class="tabbar-item"
      :class="{ active: isActive(item) }"
    >
      <Icon :name="item.icon" :size="22" />
      <span>{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'
import Icon from './Icon.vue'
import { NAV_ITEMS } from './navItems'

const route = useRoute()
const isActive = (item) => (item.exact ? route.path === item.to : route.path.startsWith(item.to))
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
    grid-template-columns: repeat(5, 1fr);
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
}
</style>
