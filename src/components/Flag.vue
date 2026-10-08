<template>
  <img v-if="src" class="flag" :src="src" :alt="alt" loading="lazy" :style="{ height: size + 'px', width: Math.round(size * 1.4) + 'px' }" />
  <span v-else class="flag flag-empty" :style="{ height: size + 'px', width: Math.round(size * 1.4) + 'px' }" aria-hidden="true"></span>
</template>

<script setup>
defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  size: { type: Number, default: 14 },
})
</script>

<style scoped>
.flag {
  display: inline-block;
  object-fit: cover;
  border-radius: 3px;
  vertical-align: middle;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
}
.flag-empty { background: var(--surface-3); }
</style>
