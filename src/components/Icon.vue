<template>
  <svg
    class="icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
})

// Pictogrammes au trait (style Tabler, grille 24×24)
const ICONS = {
  home: ['M5 12H3l9-9 9 9h-2', 'M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7', 'M9 21v-6h6v6'],
  trophy: ['M8 21h8', 'M12 17v4', 'M7 4h10v5a5 5 0 0 1-10 0z', 'M17 5h2a2 2 0 0 1 0 4h-2', 'M7 5H5a2 2 0 0 0 0 4h2'],
  calendar: ['M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'M16 3v4', 'M8 3v4', 'M4 11h16'],
  helmet: ['M12 4a9 9 0 0 1 5.2 16.3H6.8A9 9 0 0 1 12 4z', 'M3.5 13H12l1-4h7.4'],
  shield: ['M12 3l8 4.5v5c0 4.5-3.4 7.9-8 8.5-4.6-.6-8-4-8-8.5v-5z'],
  'arrow-right': ['M5 12h14', 'M13 18l6-6', 'M13 6l6 6'],
  'chevron-right': ['M9 6l6 6-6 6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  sun: ['M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0', 'M3 12h1M12 3v1M20 12h1M12 20v1M5.6 5.6l.7.7M18.4 5.6l-.7.7M17.7 17.7l.7.7M6.3 17.7l-.7.7'],
  'cloud-sun': ['M8 18a4 4 0 0 1 0-8h.4A5 5 0 0 1 18 11a3.5 3.5 0 0 1 0 7z', 'M13 5.5A4 4 0 0 1 19.5 9', 'M17 2v1M21.5 4.5l-.7.7'],
  cloud: ['M6.7 19a4.6 4.6 0 0 1-.8-9.1A5.5 5.5 0 0 1 16.6 8a4.5 4.5 0 0 1 .9 8.9V19z'],
  mist: ['M5 5h3m4 0h9', 'M3 10h11m4 0h1', 'M5 15h5m4 0h7', 'M3 20h9m4 0h3'],
  'cloud-drizzle': ['M7 16a4 4 0 0 1-.9-7.9A5.5 5.5 0 0 1 16.6 7a4.5 4.5 0 0 1 .4 9', 'M9 19v1M13 18v1M17 19v1'],
  'cloud-rain': ['M7 16a4 4 0 0 1-.9-7.9A5.5 5.5 0 0 1 16.6 7a4.5 4.5 0 0 1 .4 9', 'M9 16l-1 4M13 16l-1 4M17 16l-1 4'],
  snowflake: ['M12 3v18', 'M4.2 7.5l15.6 9', 'M19.8 7.5l-15.6 9'],
  'cloud-storm': ['M7 18a4.6 4.6 0 0 1-.8-9.1A5.5 5.5 0 0 1 16.6 7a4.5 4.5 0 0 1 .4 9', 'M13 14l-2 4h3l-2 4'],
  droplet: ['M7.5 9.5L12 4l4.5 5.5a6 6 0 1 1-9 0z'],
  clock: ['M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0', 'M12 7v5l3 3'],
  flag: ['M5 5a5 5 0 0 1 7 0 5 5 0 0 0 7 0v9a5 5 0 0 1-7 0 5 5 0 0 0-7 0z', 'M5 21v-7'],
  bolt: ['M13 3v7h6l-8 11v-7H5l8-11'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  check: ['M5 12l5 5L20 7'],
  swap: ['M7 7h13l-4-4', 'M17 17H4l4 4'],
  timer: ['M12 13m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0', 'M12 10v3l2 1', 'M10 2h4', 'M12 2v4'],
  pin: ['M12 11m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M17.7 16.7L13.4 21a2 2 0 0 1-2.8 0l-4.3-4.3a8 8 0 1 1 11.4 0z'],
  star: ['M12 17.8l-6.2 3.2 1.2-6.9-5-4.9 6.9-1L12 2l3.1 6.2 6.9 1-5 4.9 1.2 6.9z'],
  tyre: ['M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0', 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0'],
  chart: ['M4 19h16', 'M4 15l4-6 4 3 4-7 4 4'],
}

const paths = computed(() => ICONS[props.name] ?? [])
</script>

<style scoped>
.icon {
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}
</style>
