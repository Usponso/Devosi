<template>
  <img
    v-if="src && !failed"
    class="car-img"
    :src="src"
    :alt="alt"
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
    draggable="false"
    @error="failed = true"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { carImage } from '@/data/cars'

const props = defineProps({
  teamId: { type: String, required: true },
  season: { type: Number, required: true },
  view: { type: String, default: 'right' },
  width: { type: Number, default: 1200 },
  alt: { type: String, default: '' },
  eager: { type: Boolean, default: false },
})

const failed = ref(false)
const src = computed(() => carImage(props.teamId, props.season, props.view, props.width))
watch(src, () => (failed.value = false))
</script>

<style scoped>
.car-img {
  display: block;
  max-width: none;
  user-select: none;
  pointer-events: none;
}
</style>
