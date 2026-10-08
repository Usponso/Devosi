<template>
  <div class="circuit" :class="{ small }">
    <svg v-if="shape" :viewBox="shape.viewBox" role="img" :aria-label="`Tracé du circuit ${label}`">
      <defs>
        <filter :id="`glow-${uid}`" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <path v-if="!small" class="track-glow" :d="shape.d" :filter="`url(#glow-${uid})`" />
      <path class="track-base" :d="shape.d" />
      <path :id="`track-${uid}`" class="track-line" :class="{ draw: animated }" :d="shape.d" pathLength="1" />
      <circle v-if="animated && !reducedMotion" class="car" r="11">
        <animateMotion dur="7s" begin="1.6s" repeatCount="indefinite" rotate="auto">
          <mpath :href="`#track-${uid}`" />
        </animateMotion>
      </circle>
    </svg>
    <div v-else-if="!small" class="circuit-missing muted">
      <Icon name="pin" :size="28" />
      <span>Tracé indisponible</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  circuitId: { type: String, required: true },
  label: { type: String, default: '' },
  animated: { type: Boolean, default: false },
  small: { type: Boolean, default: false },
})

const uid = Math.random().toString(36).slice(2, 8)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Les tracés (≈40 Ko) sont chargés à la demande, dans un chunk séparé
let circuitsPromise = null
const loadCircuits = () => (circuitsPromise ??= import('@/data/circuits.json').then((m) => m.default))

const shape = ref(null)
watch(() => props.circuitId, async (id) => {
  const circuits = await loadCircuits()
  shape.value = circuits[id] ?? null
}, { immediate: true })
</script>

<style scoped>
.circuit {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}

svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

path {
  fill: none;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.track-glow {
  stroke: var(--accent);
  stroke-width: 22;
  opacity: 0.35;
}

.track-base {
  stroke: var(--surface-3);
  stroke-width: 18;
}

.track-line {
  stroke: var(--accent);
  stroke-width: 7;
  transition: stroke 0.6s var(--ease);
}

.small .track-base { stroke-width: 34; stroke: var(--line-strong); }
.small .track-line { stroke-width: 18; stroke: var(--text-muted); }

.track-line.draw {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw 1.8s var(--ease) 0.2s forwards;
}

@keyframes draw {
  to { stroke-dashoffset: 0; }
}

.car {
  fill: #fff;
  filter: drop-shadow(0 0 6px #fff);
}

.circuit-missing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
</style>
