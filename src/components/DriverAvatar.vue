<template>
  <div class="avatar" :style="{ '--tc': driver.color, '--size': size + 'px' }">
    <img v-if="photo && !failed" :src="photo" :alt="driver.name" loading="lazy" @error="failed = true" />
    <span v-else class="initials">{{ driver.shortName }}</span>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useHeadshots } from '@/composables/useHeadshots'
import { useF1Store } from '@/stores/f1Store'

const props = defineProps({
  driver: { type: Object, required: true },
  size: { type: Number, default: 56 },
})

const store = useF1Store()
const headshots = useHeadshots()
const failed = ref(false)

// Les photos OpenF1 correspondent à la grille actuelle : pas pour les saisons passées
const photo = computed(() => {
  if (!store.isCurrentSeason) return null
  const url = headshots.value.get(props.driver.shortName)
  return url ? url.replace('/1col/', props.size > 100 ? '/4col/' : '/2col/') : null
})
</script>

<style scoped>
.avatar {
  width: var(--size);
  height: var(--size);
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: end center;
  border-radius: 50%;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 110%, color-mix(in srgb, var(--tc) 70%, transparent), transparent 70%),
    var(--surface-2);
  border: 2px solid color-mix(in srgb, var(--tc) 60%, transparent);
}

img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.initials {
  font-size: calc(var(--size) * 0.3);
  align-self: center;
  font-weight: 900;
  color: var(--tc);
}
</style>
