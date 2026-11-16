<template>
  <span
    class="ach-badge"
    :class="[`tier-${achievement.tier}`, { locked }]"
    :style="{ '--size': `${size}px` }"
    :title="`${achievementTitle(achievement)} : ${achievementDescription(achievement)}`"
    role="img"
    :aria-label="`${TIER_LABEL[achievement.tier]} · ${achievementTitle(achievement)}`"
  >
    <Icon :name="locked ? 'lock' : ACHIEVEMENT_ICON[achievement.kind] ?? 'star'" :size="Math.round(size * 0.5)" />
  </span>
</template>

<script setup>
import Icon from '@/components/Icon.vue'
import { ACHIEVEMENT_ICON, TIER_LABEL, achievementDescription, achievementTitle } from '@/utils/achievements'

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
.tier-3 {
  --tier: #ffd65a;
  --tier-bg: rgb(232 193 90 / 0.16);
  --tier-line: rgb(232 193 90 / 0.7);
  box-shadow: 0 0 8px rgb(232 193 90 / 0.25);
}

/* Légende : fond irisé, liseré arc-en-ciel épais qui tourne en continu et halo coloré */
@property --ach-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

.tier-4 {
  --tier: #fff;
  border: 2px solid transparent;
  background:
    radial-gradient(circle at 30% 22%, rgb(255 255 255 / 0.35), transparent 55%) padding-box,
    linear-gradient(135deg, #b0258f, #4a2a9e 50%, #1f7fb8) padding-box,
    conic-gradient(from var(--ach-angle), #ff4fd8, #5ad1ff, #ffe066, #7dff9b, #ff4fd8) border-box;
  box-shadow: 0 0 12px rgb(255 79 216 / 0.45), 0 0 4px rgb(90 209 255 / 0.5);
  animation: ach-spin 4s linear infinite;
}

.tier-4 :deep(svg) {
  filter: drop-shadow(0 0 3px rgb(255 255 255 / 0.7));
}

/* Un tour complet : 360° = 0°, la boucle ne se voit pas */
@keyframes ach-spin {
  to { --ach-angle: 360deg; }
}

@media (prefers-reduced-motion: reduce) {
  .tier-4 { animation: none; }
}

.ach-badge.locked {
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1.5px solid var(--line);
  box-shadow: none;
  animation: none;
}

.ach-badge.locked :deep(svg) {
  filter: none;
}
</style>
