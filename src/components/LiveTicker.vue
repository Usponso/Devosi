<template>
  <div v-if="items.length >= MIN_ITEMS" class="ticker" aria-label="Tirages marquants des dernières 24 heures">
    <span class="live" aria-hidden="true"><span class="dot"></span><span class="live-label">En direct</span></span>
    <div class="viewport">
      <!-- Deux fois la liste : le défilement boucle sans saut -->
      <div class="track" :style="{ animationDuration: `${items.length * SECONDS_PER_ITEM}s` }">
        <button
          v-for="(item, i) in [...items, ...items]"
          :key="i"
          class="ev"
          :tabindex="i < items.length ? 0 : -1"
          :aria-hidden="i >= items.length"
          @click="open(item.card)"
        >
          <span class="swatch" :style="{ background: item.color }"></span>
          <b>{{ item.username }}</b> {{ item.card.name }}
          <span class="meta">· {{ item.label }} · {{ ago(item.at) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RARITY_LABEL, TYPE_LABEL, useCollectionStore } from '@/stores/collectionStore'
import { fetchLiveTicker } from '@/services/collection'
import { useCardViewer } from '@/composables/useCardViewer'

/** Bandeau sous le menu : les cartes marquantes obtenues par les joueurs (24 h) */
const MIN_ITEMS = 3
const SECONDS_PER_ITEM = 7
const REFRESH_MS = 60_000

const col = useCollectionStore()
const viewer = useCardViewer()
const rows = ref([])
const now = ref(Date.now())

const COLORS = { mythic: '#ff4fd8', legendary: '#e8c15a', epic: '#a855f7', rare: '#3b82f6', common: '#8a8f98' }

const items = computed(() =>
  rows.value
    .map((r) => {
      const card = col.byId.get(r.card)
      if (!card) return null
      const special = card.edition ? 'Édition' : card.type === 'poster' || card.type === 'masterpiece' ? TYPE_LABEL[card.type] : null
      return {
        ...r,
        card,
        label: special ?? RARITY_LABEL[card.rarity],
        color: card.edition ? '#ffd65a' : COLORS[card.rarity],
      }
    })
    .filter(Boolean),
)

function ago(at) {
  const min = Math.max(0, Math.round((now.value - new Date(at).getTime()) / 60000))
  if (min < 1) return 'à l’instant'
  if (min < 60) return `il y a ${min} min`
  return `il y a ${Math.floor(min / 60)} h`
}

function open(card) {
  viewer.open(card, { list: items.value.map((i) => i.card) })
}

async function refresh() {
  if (document.hidden) return
  try {
    const data = await fetchLiveTicker()
    // Le catalogue (noms, raretés) n'est chargé que s'il y a de quoi afficher
    if (data.length >= MIN_ITEMS) await col.ensureCards(data.map((r) => r.card))
    rows.value = data
    now.value = Date.now()
  } catch {
    /* bandeau facultatif : on garde l'affichage précédent */
  }
}

let timer = null
onMounted(() => {
  refresh()
  timer = setInterval(refresh, REFRESH_MS)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.ticker {
  display: flex;
  align-items: stretch;
  height: 30px;
  overflow: hidden;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}

.live {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  background: var(--accent);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  animation: blink 1.4s infinite;
}

@keyframes blink {
  50% { opacity: 0.25; }
}

.viewport { flex: 1; min-width: 0; overflow: hidden; }

.track {
  display: flex;
  gap: 28px;
  width: max-content;
  height: 100%;
  padding-left: 24px;
  animation: scroll linear infinite;
}

/* Pause au survol, au toucher ou au clavier */
.ticker:hover .track,
.ticker:focus-within .track,
.ticker:active .track { animation-play-state: paused; }

@keyframes scroll {
  to { transform: translateX(-50%); }
}

.ev {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
  color: var(--text-dim);
  cursor: pointer;
}

.ev b { color: var(--text); }
.ev:hover b { color: var(--accent); }
.meta { color: var(--text-muted); }
.swatch { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

@media (max-width: 640px) {
  .live-label { display: none; }
  .live { padding: 0 10px; }
}

/* Mouvement réduit : liste fixe que l'on fait défiler soi-même */
@media (prefers-reduced-motion: reduce) {
  .track { animation: none; }
  .viewport { overflow-x: auto; }
  .dot { animation: none; }
}
</style>
