<template>
  <div
    ref="root"
    class="f1card"
    :class="[locked ? 'locked' : `r-${card.rarity}`, { 'face-down': faceDown, tilt: interactive && !locked, zoomable: canZoom, [`finish-${finish}`]: finish && !locked }]"
    :style="locked ? null : { '--tc': card.color }"
    @pointermove="onMove"
    @pointerleave="onLeave"
    @click="zoom"
  >
    <div class="inner">
      <!-- Recto -->
      <div class="face front">
        <div v-if="locked" class="locked-face">
          <span class="locked-num">#{{ String(card.n).padStart(4, '0') }}</span>
        </div>
        <div v-else class="frame">
          <div class="body">
            <div class="top">
              <span>{{ TYPE_LABEL[card.type] }}</span>
              <span class="rarity">{{ RARITY_LABEL[card.rarity] }}</span>
            </div>

            <div class="art">
              <img v-if="hasPhoto" :src="card.photo.url" alt="" loading="lazy" draggable="false" @error="photoFailed = true" />
              <CircuitMap v-else-if="hasCircuit" :circuit-id="card.circuitId" small class="art-circuit" />
              <template v-else>
                <div v-if="card.type === 'moment' && card.quote" class="art-quote">« {{ card.quote }} »</div>
                <div v-else class="art-mono">{{ monogram }}</div>
              </template>
              <div v-if="card.type === 'moment' && card.quote && hasPhoto" class="art-quote on-photo">« {{ card.quote }} »</div>
              <CircuitMap v-if="hasPhoto && hasCircuit" :circuit-id="card.circuitId" small class="art-circuit badge" />
              <span v-if="card.number" class="art-number">{{ card.number }}</span>
              <span class="years">{{ yearsLabel }}</span>
            </div>

            <div class="name">{{ card.name }}</div>
            <div class="sub">
              <img v-if="card.flag" :src="`https://flagcdn.com/${card.flag}.svg`" alt="" class="flag" draggable="false" />
              <span>{{ subLabel }}</span>
            </div>

            <div class="stats">
              <div v-for="s in stats" :key="s.label"><b>{{ s.value }}</b>{{ s.label }}</div>
            </div>

            <div class="foot">
              <span>#{{ String(card.n).padStart(4, '0') }}</span>
              <span v-if="finish" class="finish-tag">{{ FINISH_LABEL[finish] }}</span>
              <span v-else>DEVOSI</span>
            </div>
          </div>
        </div>
        <div v-if="holo && !locked" class="holo"></div>
        <div v-if="finish && !locked" class="sheen"></div>
        <span v-if="isNew" class="new">Nouveau</span>
        <span v-if="count > 1" class="count">×{{ count }}</span>
      </div>

      <!-- Verso -->
      <div class="face back">
        <div class="back-body">
          <span class="back-logo"><span>D</span>EVOSI</span>
          <span class="back-sub">F1 COLLECTION</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import CircuitMap from '@/components/CircuitMap.vue'
import { RARITY_LABEL, TYPE_LABEL } from '@/stores/collectionStore'
import { getNationalityLabel } from '@/data/nationalities'
import circuits from '@/data/circuits.json'
import { useCardViewer } from '@/composables/useCardViewer'

const props = defineProps({
  card: { type: Object, required: true },
  faceDown: { type: Boolean, default: false },
  /** Carte non possédée : seul le numéro est visible */
  locked: { type: Boolean, default: false },
  isNew: { type: Boolean, default: false },
  count: { type: Number, default: 0 },
  /** Inclinaison et reflets au survol */
  interactive: { type: Boolean, default: true },
  /** Finition débloquée : 0 standard, 1 Chrome, 2 Or */
  finish: { type: Number, default: 0 },
  /** Clic : ouvre la carte en plein écran (désactivé là où le clic sert déjà, ex. ouverture de pack) */
  zoomable: { type: Boolean, default: true },
  /** Cartes voisines dans la visionneuse (flèches) et finitions d'un autre joueur */
  zoomList: { type: Array, default: null },
  zoomFinishes: { type: Object, default: null },
})

const viewer = useCardViewer()
const canZoom = computed(() => props.zoomable && !props.locked && !props.faceDown)

function zoom() {
  if (!canZoom.value) return
  viewer.open(props.card, { list: props.zoomList ?? [], finishes: props.zoomFinishes, finish: props.finish })
}

const FINISH_LABEL = { 1: 'Chrome', 2: 'Or' }

const root = ref(null)
const photoFailed = ref(false)

const holo = computed(() => ['epic', 'legendary', 'mythic'].includes(props.card.rarity))

const hasPhoto = computed(() => Boolean(props.card.photo) && !photoFailed.value)
// Grands Prix : photo du vainqueur pendant ce GP, sinon le tracé du circuit (en médaillon sur la photo)
const hasCircuit = computed(() => props.card.type === 'gp' && Boolean(circuits[props.card.circuitId]))

const monogram = computed(() =>
  props.card.name
    .split(/\s+/)
    .filter((w) => /^[A-ZÀ-Ö]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase(),
)

const yearsLabel = computed(() => {
  const [a, b] = props.card.years ?? []
  if (!a) return ''
  return a === b ? String(a) : `${a}–${b}`
})

const subLabel = computed(() =>
  props.card.type === 'driver' || props.card.type === 'team' ? getNationalityLabel(props.card.sub) : props.card.sub,
)

const stats = computed(() => {
  const s = props.card.stats ?? {}
  switch (props.card.type) {
    case 'driver':
      return [
        { label: 'titres', value: s.titles },
        { label: 'vict.', value: s.wins },
        { label: 'podiums', value: s.podiums },
      ]
    case 'team':
      return [
        { label: 'titres', value: s.titles },
        { label: 'vict.', value: s.wins },
        { label: 'saisons', value: s.seasons },
      ]
    case 'gp':
      return [{ label: s.team, value: s.winner }]
    default:
      return []
  }
})

/** Inclinaison 3D et position du reflet holographique */
function onMove(e) {
  if (!props.interactive || props.faceDown) return
  const r = root.value.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width
  const y = (e.clientY - r.top) / r.height
  root.value.style.setProperty('--rx', `${(0.5 - y) * 14}deg`)
  root.value.style.setProperty('--ry', `${(x - 0.5) * 16}deg`)
  root.value.style.setProperty('--mx', `${x * 100}%`)
  root.value.style.setProperty('--my', `${y * 100}%`)
}

function onLeave() {
  root.value?.style.setProperty('--rx', '0deg')
  root.value?.style.setProperty('--ry', '0deg')
}
</script>

<style scoped>
.f1card {
  --c: #8a8f98;
  --rx: 0deg;
  --ry: 0deg;
  --mx: 50%;
  --my: 50%;
  position: relative;
  aspect-ratio: 5 / 7;
  container-type: inline-size;
  perspective: 900px;
  user-select: none;
}

.zoomable { cursor: zoom-in; }

.r-rare { --c: #3b82f6; }
.r-epic { --c: #a855f7; }
.r-legendary { --c: #e8c15a; }
.r-mythic { --c: #ff4fd8; }

.inner {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.tilt:hover .inner { transition-duration: 0.12s; }
.face-down .inner { transform: rotateY(180deg); }

.face {
  position: absolute;
  inset: 0;
  border-radius: 6cqw;
  backface-visibility: hidden;
  overflow: hidden;
}

.back { transform: rotateY(180deg); }

/*
 * Carte face cachée : le recto est masqué explicitement. Firefox laisse sinon apparaître
 * à travers le verso les éléments du recto qui ont un z-index (années, médaillon du circuit).
 * Le changement se fait vers le milieu du retournement (rotation de 0,6 s).
 */
.front { transition: visibility 0s linear 0.12s; }
.face-down .front { visibility: hidden; }

/* ---------- Recto ---------- */
.frame {
  height: 100%;
  padding: 3.5cqw;
  border-radius: inherit;
  background: linear-gradient(155deg, var(--c), color-mix(in srgb, var(--c) 35%, #0d0e11) 45%, var(--c));
}

.r-mythic .frame {
  background: conic-gradient(from var(--spin, 0deg), #ff4fd8, #5ad1ff, #ffe066, #7dff9b, #ff4fd8);
  animation: spin 6s linear infinite;
}

@property --spin {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@keyframes spin {
  to { --spin: 360deg; }
}

.body {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 4cqw;
  background: #101114;
  overflow: hidden;
}

.top {
  display: flex;
  justify-content: space-between;
  padding: 2.6cqw 3.6cqw;
  font-size: 5cqw;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
}

.rarity { color: var(--c); filter: brightness(1.25); }

.art {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 80%, color-mix(in srgb, var(--tc) 55%, transparent), transparent 70%),
    #16181c;
}

.art img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 22%;
}

.art::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 55%, rgba(16, 17, 20, 0.95));
  pointer-events: none;
}

.art-mono {
  font-size: 26cqw;
  font-weight: 900;
  font-style: italic;
  color: color-mix(in srgb, var(--tc) 70%, #fff);
  opacity: 0.9;
}

.art-circuit {
  width: 80%;
  height: 70%;
}

.art-circuit.badge {
  position: absolute;
  right: 3cqw;
  bottom: 3cqw;
  z-index: 1;
  width: 24cqw;
  height: 18cqw;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.9));
}

.art-circuit :deep(.track-line) { stroke: #fff; }
.art-circuit :deep(.track-base) { stroke: color-mix(in srgb, var(--tc) 60%, transparent); }

.art-quote {
  padding: 0 7cqw;
  font-size: 6.4cqw;
  font-style: italic;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
  color: #fff;
}

.art-quote.on-photo {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 4cqw;
  z-index: 1;
  font-size: 5.6cqw;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
}

.art-number {
  position: absolute;
  right: 3cqw;
  bottom: 1cqw;
  z-index: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13cqw;
  font-weight: 700;
  color: #fff;
  opacity: 0.35;
}

.years {
  position: absolute;
  left: 3cqw;
  top: 3cqw;
  z-index: 1;
  padding: 0.8cqw 2.4cqw;
  border-radius: 99px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 4.4cqw;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
}

.name {
  padding: 2cqw 3.6cqw 0;
  font-size: 8.4cqw;
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub {
  display: flex;
  align-items: center;
  gap: 1.6cqw;
  padding: 1cqw 3.6cqw 0;
  font-size: 4.6cqw;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
}

.sub span { overflow: hidden; text-overflow: ellipsis; }
.flag { width: 5.6cqw; height: 4cqw; object-fit: cover; border-radius: 0.6cqw; flex-shrink: 0; }

.stats {
  display: flex;
  justify-content: space-between;
  gap: 2cqw;
  padding: 2cqw 3.6cqw 0;
  font-size: 4cqw;
  color: rgba(255, 255, 255, 0.55);
  min-height: 9cqw;
}

.stats div { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

.stats b {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 6cqw;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
}

.foot {
  display: flex;
  justify-content: space-between;
  padding: 1.6cqw 3.6cqw 2.4cqw;
  font-family: 'JetBrains Mono', monospace;
  font-size: 3.8cqw;
  color: rgba(255, 255, 255, 0.35);
}

/* Finitions Chrome et Or : cadre métallique et reflet qui balaie la carte */
.finish-1 .frame,
.finish-2 .frame { animation: none; }

.finish-1 .frame {
  background: linear-gradient(135deg, #f4f6f9, #8e97a2 22%, #ffffff 42%, #6f7782 62%, #e3e7ec 82%, #9ea6b0);
}

.finish-2 .frame {
  background: linear-gradient(135deg, #fff0b0, #c58f17 22%, #fff7d6 42%, #9f6c0c 62%, #ffe27a 82%, #b5850f);
}

.sheen {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.5) 48%, transparent 60%);
  background-size: 250% 100%;
  mix-blend-mode: overlay;
  animation: sheen 3.2s ease-in-out infinite;
}

.finish-2 .sheen { background-image: linear-gradient(105deg, transparent 35%, rgba(255, 236, 160, 0.65) 48%, transparent 60%); }

@keyframes sheen {
  0% { background-position: 120% 0; }
  60%, 100% { background-position: -120% 0; }
}

.finish-tag {
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #dfe4ea;
}

.finish-2 .finish-tag { color: #ffd65a; }

@media (prefers-reduced-motion: reduce) {
  .sheen { animation: none; }
}

/* Reflet holographique (Épique et plus) */
.holo {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  mix-blend-mode: color-dodge;
  opacity: 0.18;
  background:
    radial-gradient(circle at var(--mx) var(--my), rgba(255, 255, 255, 0.55), transparent 45%),
    linear-gradient(115deg, transparent 20%, rgba(255, 0, 140, 0.55) 36%, rgba(0, 220, 255, 0.55) 50%, rgba(255, 230, 0, 0.55) 64%, transparent 80%);
  background-size: 100% 100%, 250% 250%;
  background-position: center, var(--mx) var(--my);
  transition: opacity 0.3s;
}

.tilt:hover .holo { opacity: 0.6; }

.new,
.count {
  position: absolute;
  top: 12%;
  padding: 0.8cqw 2.6cqw;
  border-radius: 99px;
  font-size: 4.4cqw;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.new { right: 4cqw; background: #e10600; color: #fff; box-shadow: 0 0 12px rgba(225, 6, 0, 0.6); }
.count { right: 4cqw; top: auto; bottom: 20%; background: rgba(0, 0, 0, 0.7); color: #fff; font-family: 'JetBrains Mono', monospace; }

/* Non possédée */
.locked-face {
  height: 100%;
  display: grid;
  place-items: center;
  border-radius: inherit;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  background: repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.025) 0 6px, transparent 6px 14px), #121317;
}

.locked-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11cqw;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.22);
}

/* ---------- Verso ---------- */
.back {
  background:
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0 6px, transparent 6px 14px),
    radial-gradient(circle at 50% 40%, #2a0a0d, #0b0c0f 70%);
  border: 3cqw solid #1a1c21;
}

.back-body {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2cqw;
}

.back-logo {
  font-size: 15cqw;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #fff;
}

.back-logo span { color: #e10600; }

.back-sub {
  font-size: 4.4cqw;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.45);
}
</style>
