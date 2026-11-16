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

/*
 * Bronze, Argent et Or : médailles en métal (fond dégradé, reflet en haut à gauche,
 * liseré métallique, icône gravée). L'Or ajoute un halo et un reflet qui passe ;
 * la Légende garde l'irisé et le liseré qui tourne.
 */
.tier-1,
.tier-2,
.tier-3 {
  position: relative;
  overflow: hidden;
  border: 1.5px solid transparent;
  background:
    radial-gradient(circle at 30% 22%, rgb(255 255 255 / 0.45), transparent 50%) padding-box,
    linear-gradient(145deg, var(--m-light), var(--m-mid) 45%, var(--m-dark)) padding-box,
    linear-gradient(145deg, var(--m-edge), var(--m-dark) 55%, var(--m-edge)) border-box;
  box-shadow: inset 0 -2px 3px rgb(0 0 0 / 0.25);
}

.tier-1,
.tier-2,
.tier-3 {
  color: var(--m-ink);
}

.tier-1 :deep(svg),
.tier-2 :deep(svg),
.tier-3 :deep(svg) {
  filter: drop-shadow(0 1px 0 rgb(255 255 255 / 0.35));
}

.tier-1 { --m-light: #f0b98f; --m-mid: #c27a49; --m-dark: #7a4422; --m-edge: #ffd2ad; --m-ink: #3a1a07; }
.tier-2 { --m-light: #ffffff; --m-mid: #c3cad3; --m-dark: #7b8591; --m-edge: #ffffff; --m-ink: #262c33; }
.tier-3 { --m-light: #fff1b3; --m-mid: #e8b93f; --m-dark: #9a6a12; --m-edge: #fff6cf; --m-ink: #3d2803; }

.tier-3 {
  box-shadow: inset 0 -2px 3px rgb(0 0 0 / 0.25), 0 0 10px rgb(232 193 90 / 0.4);
}

/* Or : un reflet traverse la médaille de temps en temps */
.tier-3::after {
  content: '';
  position: absolute;
  inset: -50%;
  background: linear-gradient(115deg, transparent 42%, rgb(255 255 255 / 0.55) 50%, transparent 58%);
  transform: translateX(-100%);
  animation: ach-shine 5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes ach-shine {
  0%, 60% { transform: translateX(-100%); }
  85%, 100% { transform: translateX(100%); }
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
  .tier-3::after { display: none; }
}

.ach-badge.locked {
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1.5px solid var(--line);
  box-shadow: none;
  animation: none;
}

.ach-badge.locked::after {
  display: none;
}

.ach-badge.locked :deep(svg) {
  filter: none;
}
</style>
