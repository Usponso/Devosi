<template>
  <span
    class="ach-badge"
    :class="[`tier-${achievement.tier}`, { locked }]"
    :style="{ '--size': `${size}px` }"
    :title="`${achievement.title} : ${achievement.description}`"
    role="img"
    :aria-label="`${TIER_LABEL[achievement.tier]} · ${achievement.title}`"
  >
    <Icon :name="locked ? 'lock' : ACHIEVEMENT_ICON[achievement.kind] ?? 'star'" :size="Math.round(size * 0.5)" />
  </span>
</template>

<script setup>
import Icon from '@/components/Icon.vue'
import { ACHIEVEMENT_ICON, TIER_LABEL } from '@/utils/achievements'

defineProps({
  /** { tier, kind, title, description } */
  achievement: { type: Object, required: true },
  locked: { type: Boolean, default: false },
  size: { type: Number, default: 40 },
})
</script>

<style scoped>
.ach-badge {
  flex: none;
  width: var(--size);
  height: var(--size);
  display: inline-grid;
  place-items: center;
  border-radius: 28%;
  border: 1.5px solid var(--tier-line);
  color: var(--tier);
  background: var(--tier-bg);
}

.tier-1 { --tier: #e7a983; --tier-bg: rgb(205 127 80 / 0.16); --tier-line: rgb(205 127 80 / 0.45); }
.tier-2 { --tier: #dfe4ea; --tier-bg: rgb(200 205 214 / 0.12); --tier-line: rgb(200 205 214 / 0.4); }
.tier-3 { --tier: #ffd65a; --tier-bg: rgb(232 193 90 / 0.14); --tier-line: rgb(232 193 90 / 0.55); }

.tier-4 {
  --tier: #fff;
  --tier-bg: rgb(255 79 216 / 0.14);
  border-color: transparent;
  background:
    linear-gradient(rgb(40 22 44), rgb(40 22 44)) padding-box,
    conic-gradient(from 30deg, #ff4fd8, #5ad1ff, #ffe066, #7dff9b, #ff4fd8) border-box;
}

.ach-badge.locked {
  color: var(--text-muted);
  background: var(--surface-2);
  border-color: var(--line);
}
</style>
