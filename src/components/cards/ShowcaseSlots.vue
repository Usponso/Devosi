<template>
  <TransitionGroup tag="div" name="slot" class="sc-slots" :class="{ sorting: drag }">
    <div
      v-for="(id, i) in order"
      :key="id"
      class="sc-slot filled"
      :class="{ placeholder: drag?.id === id }"
      tabindex="0"
      role="listitem"
      :aria-label="`${byId.get(id)?.name}, place ${i + 1} sur 5. Flèches gauche et droite pour la déplacer.`"
      @pointerdown="press($event, id)"
      @keydown.left.prevent="shift(id, -1)"
      @keydown.right.prevent="shift(id, 1)"
    >
      <F1Card v-if="byId.get(id)" :card="byId.get(id)" :finish="finishOf(id)" :interactive="false" :zoomable="false" />
      <span class="sc-pos mono">{{ i + 1 }}</span>
      <button
        class="sc-remove"
        :disabled="busy"
        :aria-label="`Retirer ${byId.get(id)?.name} de la vitrine`"
        @pointerdown.stop
        @click.stop="$emit('remove', id)"
      >
        <Icon name="x" :size="14" />
      </button>
    </div>
    <div v-for="i in 5 - order.length" :key="`empty-${i}`" class="sc-slot">
      <span class="mono">{{ order.length + i }}</span>
    </div>
  </TransitionGroup>

  <!-- Carte déplacée : copie qui suit le pointeur, hors de la liste animée -->
  <Teleport to="body">
    <div
      v-if="drag"
      class="sc-ghost"
      :style="{ width: `${drag.width}px`, transform: `translate3d(${drag.x}px, ${drag.y}px, 0)` }"
      aria-hidden="true"
    >
      <F1Card :card="byId.get(drag.id)" :finish="finishOf(drag.id)" :interactive="false" :zoomable="false" />
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import F1Card from '@/components/cards/F1Card.vue'
import { useCollectionStore } from '@/stores/collectionStore'

/**
 * Les 5 emplacements de la vitrine, réordonnables : glisser une carte (souris ou doigt)
 * vers une autre place, ou flèches gauche / droite au clavier. `reorder` : nouvel ordre.
 */
const props = defineProps({
  ids: { type: Array, required: true },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['reorder', 'remove'])

const col = useCollectionStore()
const byId = computed(() => col.byId)
const finishOf = (id) => col.finishes.get(id) ?? 0

// Ordre affiché : celui de la vitrine, ou l'aperçu pendant un glisser-déposer
const order = ref([...props.ids])
watch(
  () => props.ids,
  (ids) => {
    if (!drag.value) order.value = [...ids]
  },
)

const drag = ref(null) // { id, from, to, x, y, width } pendant le déplacement
let pending = null // appui en cours, avant d'avoir assez bougé pour un déplacement
let rects = [] // positions des emplacements remplis au début du déplacement
let container = null
const THRESHOLD = 6

function press(e, id) {
  if (props.busy || e.button > 0) return
  pending = { id, x0: e.clientX, y0: e.clientY }
  container = e.currentTarget.parentElement
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', release)
  window.addEventListener('pointercancel', release)
}

/** Place la plus proche du pointeur parmi les emplacements remplis */
function nearest(x, y) {
  let best = 0
  let bestDist = Infinity
  rects.forEach((r, i) => {
    const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2))
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  })
  return best
}

function move(e) {
  if (!pending) return
  if (!drag.value) {
    if (Math.hypot(e.clientX - pending.x0, e.clientY - pending.y0) < THRESHOLD) return
    const slots = [...container.querySelectorAll('.sc-slot.filled')]
    rects = slots.map((el) => el.getBoundingClientRect())
    const from = props.ids.indexOf(pending.id)
    // Décalage entre le pointeur et le coin de la carte attrapée
    pending.offsetX = pending.x0 - rects[from].left
    pending.offsetY = pending.y0 - rects[from].top
    drag.value = { id: pending.id, from, to: from, x: rects[from].left, y: rects[from].top, width: rects[from].width }
  }
  const d = drag.value
  const to = nearest(e.clientX, e.clientY)
  if (to !== d.to) {
    const next = props.ids.filter((x) => x !== d.id)
    next.splice(to, 0, d.id)
    order.value = next
    d.to = to
  }
  // La copie suit le pointeur, à l'endroit où la carte a été attrapée
  d.x = e.clientX - pending.offsetX
  d.y = e.clientY - pending.offsetY
}

function release() {
  window.removeEventListener('pointermove', move)
  window.removeEventListener('pointerup', release)
  window.removeEventListener('pointercancel', release)
  const d = drag.value
  pending = null
  drag.value = null
  if (d && d.to !== d.from) emit('reorder', [...order.value])
  else order.value = [...props.ids]
}

/** Clavier : déplace la carte d'une place */
function shift(id, step) {
  const from = props.ids.indexOf(id)
  const to = from + step
  if (props.busy || to < 0 || to >= props.ids.length) return
  const next = [...props.ids]
  next.splice(from, 1)
  next.splice(to, 0, id)
  emit('reorder', next)
}

onUnmounted(release)
</script>

<style scoped>
.sc-slots {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.sc-slot {
  position: relative;
  aspect-ratio: 5 / 7;
  display: grid;
  place-items: center;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-muted);
  border: 1px dashed var(--line-strong);
}

/* La carte prend la largeur de l'emplacement (centrée, elle n'aurait aucune largeur) */
.sc-slot.filled {
  display: block;
  place-items: normal;
  border: none;
  cursor: grab;
  /* Au doigt : le glisser déplace la carte au lieu de faire défiler la fenêtre */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.sc-slot.filled:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

/* Place où la carte déplacée va atterrir */
.sc-slot.placeholder {
  border: 1.5px dashed var(--accent-line);
  border-radius: 8px;
}

.sc-slot.placeholder > * { opacity: 0; }

/* Les autres cartes glissent vers leur nouvelle place */
.slot-move { transition: transform 0.22s var(--ease); }

.sc-ghost {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  pointer-events: none;
  cursor: grabbing;
  will-change: transform;
  filter: drop-shadow(0 16px 26px rgb(0 0 0 / 0.6));
}

.sc-ghost :deep(.f1card) { scale: 1.06; rotate: -2deg; }

.sc-pos {
  position: absolute;
  left: 4px;
  bottom: 4px;
  z-index: 2;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: rgb(0 0 0 / 0.7);
}

.sc-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: var(--text);
  background: var(--surface-3);
  border: 1px solid var(--line-strong);
  cursor: pointer;
}

.sc-remove:hover { background: var(--danger); color: #fff; }
.sorting .sc-remove { visibility: hidden; }

@media (max-width: 640px) {
  .sc-slots { gap: 6px; }
}

@media (prefers-reduced-motion: reduce) {
  .slot-move { transition: none; }
}
</style>
