<template>
  <span class="gp-pack" :class="{ locked }" :style="{ width: `${width}px` }" aria-hidden="true">
    <span class="gp-inner">
      <img v-if="flag" class="gp-flag" :src="flag" alt="" loading="lazy" draggable="false" />
      <span class="gp-shade"></span>
      <span class="gp-top">
        <span class="gp-brand">DEVOSI</span>
        <span class="gp-kind">GP PACK</span>
      </span>
      <svg v-if="shape" class="gp-track" :viewBox="shape.viewBox">
        <path :d="shape.d" />
      </svg>
      <span class="gp-bottom">
        <span class="gp-name">{{ shortName }}</span>
        <span class="gp-round">Manche {{ round }}</span>
      </span>
      <span v-if="locked" class="gp-lock"><Icon name="lock" :size="Math.round(width * 0.16)" /></span>
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import circuits from '@/data/circuits.json'
import { useF1Store } from '@/stores/f1Store'

/**
 * Visuel du pack d'un Grand Prix : le drapeau du pays en fond, le tracé du circuit et
 * le nom du GP. `locked` : pack annoncé, pas encore disponible.
 */
const props = defineProps({
  name: { type: String, required: true },
  circuitId: { type: String, required: true },
  season: { type: Number, default: null },
  round: { type: Number, required: true },
  width: { type: Number, default: 96 },
  locked: { type: Boolean, default: false },
})

const store = useF1Store()
const shape = computed(() => circuits[props.circuitId] ?? null)
// « GP de Mexico » → « MEXICO »
const shortName = computed(() => props.name.replace(/^GP (de |du |des |d’|d')?/, '').toUpperCase())
// Drapeau du pays : calendrier de la saison chargé par l'app
const flag = computed(() => {
  const race = store.races.find((r) => r.round === props.round && (!props.season || r.season === props.season))
  return race?.flag ?? null
})
</script>

<style scoped>
/* Conteneur : les tailles en cqw de l'intérieur suivent la largeur du pack */
.gp-pack {
  position: relative;
  flex-shrink: 0;
  display: block;
  aspect-ratio: 5 / 7;
  container-type: inline-size;
}

.gp-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  border-radius: 11cqw;
  color: #fff;
  background: linear-gradient(155deg, #e10600, #3a0606 85%);
  border: 1px solid rgb(255 255 255 / 0.25);
  box-shadow: 0 10px 24px rgb(225 6 0 / 0.3);
}

.gp-flag {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.8;
  filter: saturate(1.3);
  transform: scale(1.3) rotate(-8deg);
}

/* Assombrit le drapeau : texte et tracé restent lisibles */
.gp-shade {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 0.06) 0 3px, transparent 3px 9px),
    linear-gradient(180deg, rgb(12 6 6 / 0.5), rgb(12 6 6 / 0.1) 45%, rgb(12 6 6 / 0.7));
}

.gp-top,
.gp-bottom {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 8cqw 6cqw;
}

.gp-brand { font-size: 8cqw; letter-spacing: 0.3em; opacity: 0.85; }
.gp-kind { font-size: 9cqw; font-weight: 900; letter-spacing: 0.15em; }

.gp-track {
  position: relative;
  align-self: center;
  width: 70%;
  height: 34%;
  overflow: visible;
}

.gp-track path {
  fill: none;
  stroke: #fff;
  stroke-width: 26;
  stroke-linejoin: round;
  stroke-linecap: round;
  filter: drop-shadow(0 0 18px rgb(255 255 255 / 0.6));
}

.gp-name {
  max-width: 100%;
  font-size: 14cqw;
  font-weight: 900;
  line-height: 1;
  overflow-wrap: anywhere;
}

.gp-round { margin-top: 3cqw; font-size: 8cqw; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.8; }

.locked .gp-inner { filter: grayscale(0.4) brightness(0.75); }

.gp-lock {
  position: absolute;
  right: 6cqw;
  top: 6cqw;
  display: grid;
  place-items: center;
  color: #fff;
}
</style>
