<template>
  <span
    class="player-avatar"
    :class="[`r-${card?.rarity ?? 'none'}`, { [`finish-${finish}`]: finish > 0 }]"
    :style="{ '--size': `${size}px`, '--tc': card?.color ?? teamColor }"
    :title="card ? card.name : undefined"
  >
    <span class="pa-inner">
      <img v-if="photo && !failed" :src="photo" alt="" loading="lazy" @error="failed = true" />
      <span v-else class="pa-initial">{{ initial }}</span>
    </span>
  </span>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getTeamColor } from '@/data/teams'
import { useCollectionStore } from '@/stores/collectionStore'

/**
 * Avatar d'un joueur : photo d'une de ses cartes dans un cadre aux couleurs de la
 * rareté (reflet Chrome ou Or selon la finition), sinon l'initiale de son pseudo.
 */
const props = defineProps({
  cardId: { type: String, default: null },
  finish: { type: Number, default: 0 },
  username: { type: String, default: '' },
  team: { type: String, default: null },
  size: { type: Number, default: 40 },
})

const col = useCollectionStore()
const failed = ref(false)

const card = computed(() => (props.cardId ? col.byId.get(props.cardId) : null))
const photo = computed(() => card.value?.photo?.url ?? null)
const initial = computed(() => (card.value?.name || props.username || '?').charAt(0).toUpperCase())
const teamColor = computed(() => (props.team ? getTeamColor(props.team) : 'var(--accent)'))

watch(photo, () => (failed.value = false))
</script>

<style scoped>
.player-avatar {
  --ring: var(--line);
  width: var(--size);
  height: var(--size);
  flex-shrink: 0;
  display: inline-grid;
  padding: max(2px, calc(var(--size) * 0.05));
  border-radius: 50%;
  background: var(--ring);
  position: relative;
  vertical-align: middle;
}

.r-common { --ring: #8a8f98; }
.r-rare { --ring: #3b82f6; }
.r-epic { --ring: #a855f7; }
.r-legendary { --ring: #e8c15a; }
.r-mythic { --ring: conic-gradient(from 0deg, #ff4fd8, #7c5cff, #3bd5ff, #5cff9d, #ffe45c, #ff4fd8); }
.r-none { --ring: color-mix(in srgb, var(--tc) 70%, transparent); }

.pa-inner {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 110%, color-mix(in srgb, var(--tc) 65%, transparent), transparent 70%),
    var(--surface-2);
}

img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 25%;
}

.pa-initial {
  font-size: calc(var(--size) * 0.42);
  font-weight: 900;
  line-height: 1;
  color: var(--tc);
}

/* Finitions : reflet qui balaie l'avatar */
.finish-1 .pa-inner,
.finish-2 .pa-inner { position: relative; }

.finish-1 .pa-inner::after,
.finish-2 .pa-inner::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgb(255 255 255 / 0.55) 48%, transparent 60%) no-repeat;
  background-size: 250% 100%;
  animation: avatar-sheen 3.2s ease-in-out infinite;
}

.finish-2 .pa-inner::after {
  background-image: linear-gradient(105deg, transparent 35%, rgb(255 236 160 / 0.7) 48%, transparent 60%);
}

.finish-2 { box-shadow: 0 0 calc(var(--size) * 0.25) rgb(232 193 90 / 0.45); }

@keyframes avatar-sheen {
  from { background-position: 120% 0; }
  to { background-position: -120% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .pa-inner::after { animation: none !important; }
}
</style>
