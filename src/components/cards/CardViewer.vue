<template>
  <transition name="viewer">
    <div
      v-if="card"
      class="viewer"
      :class="`r-${card.rarity}`"
      :style="{ '--tc': card.color }"
      role="dialog"
      aria-modal="true"
      :aria-label="card.name"
    >
      <div class="viewer-bg" @click="close"></div>
      <button class="v-close" aria-label="Fermer" @click="close"><Icon name="x" :size="22" /></button>

      <div class="layout">
        <!-- Carte : glisser pour la faire pivoter, double-clic pour la retourner -->
        <div class="stage">
          <div class="stage-row">
            <button v-if="hasList" class="nav" aria-label="Carte précédente" @click="go(-1)">
              <Icon name="chevron-right" :size="22" class="flip-x" />
            </button>
            <div
              class="card-zone"
              :class="{ dragging }"
              @pointerdown="onDown"
              @pointermove="onMove"
              @pointerup="onUp"
              @pointercancel="onUp"
              @dblclick="turn"
              @dragstart.prevent
            >
              <transition name="card-swap" mode="out-in">
                <F1Card
                  :key="card.id"
                  :card="card"
                  :finish="finish"
                  :interactive="false"
                  :zoomable="false"
                  :style="{ '--rx': `${rx}deg`, '--ry': `${ry}deg`, '--mx': `${shineX}%`, '--my': `${shineY}%` }"
                />
              </transition>
            </div>
            <button v-if="hasList" class="nav" aria-label="Carte suivante" @click="go(1)">
              <Icon name="chevron-right" :size="22" />
            </button>
          </div>

          <div class="tools">
            <button class="tool" @click="turn"><Icon name="swap" :size="16" /> Retourner</button>
            <button class="tool" :disabled="!rx && !ry" @click="recenter"><Icon name="rotate" :size="16" /> Recentrer</button>
            <span v-if="hasList" class="mono muted counter">{{ index + 1 }} / {{ viewer.state.list.length }}</span>
          </div>
          <p class="hint muted">Fais glisser la carte pour la faire pivoter</p>
        </div>

        <!-- Fiche -->
        <aside class="info">
          <div class="eyebrow">{{ TYPE_LABEL[card.type] }} · #{{ String(card.n).padStart(4, '0') }}</div>
          <h2 class="title-lg name">{{ card.name }}</h2>
          <div class="sub">
            <img v-if="card.flag" :src="`https://flagcdn.com/${card.flag}.svg`" alt="" class="flag" />
            <span>{{ subLabel }}</span>
            <span v-if="yearsLabel" class="mono muted">· {{ yearsLabel }}</span>
          </div>
          <div v-if="teamName" class="team-line" :style="{ '--tc': card.color }">
            <span class="team-dot"></span>
            Écurie : <b>{{ teamName }}</b>
            <span class="muted">(celle où il a couru le plus)</span>
          </div>

          <div class="rarity-line">
            <span class="rarity-pill">{{ RARITY_LABEL[card.rarity] }}</span>
            <span class="muted">{{ rarityOdds }}</span>
          </div>

          <div v-if="stats.length" class="stat-grid">
            <div v-for="s in stats" :key="s.label" class="stat">
              <span class="stat-value" :class="{ mono: typeof s.value === 'number' }">{{ s.value }}</span>
              <span class="stat-label">{{ s.label }}</span>
            </div>
          </div>

          <p v-if="card.text" class="desc">{{ card.text }}</p>
          <blockquote v-if="card.quote" class="quote">« {{ card.quote }} »</blockquote>

          <CardOwnerPanel v-if="col.owned.has(card.id)" :card="card" />
          <p v-else-if="col.ready" class="missing muted"><Icon name="lock" :size="15" /> Pas encore dans ta collection</p>

          <div v-if="albums.length" class="albums">
            <div class="eyebrow">Dans les albums</div>
            <div class="album-chips">
              <router-link v-for="a in albums" :key="a.id" :to="`/collection/album/${a.id}`" class="album-chip" @click="close">
                <Icon name="album" :size="13" /> {{ a.title }}
              </router-link>
            </div>
          </div>

          <p v-if="card.photo" class="credit muted">
            Photo : {{ card.photo.author }} ·
            <a :href="card.photo.source" target="_blank" rel="noopener">{{ card.photo.license }}</a>, via Wikimedia Commons
          </p>
        </aside>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '@/components/Icon.vue'
import F1Card from './F1Card.vue'
import CardOwnerPanel from './CardOwnerPanel.vue'
import { useCardViewer } from '@/composables/useCardViewer'
import { RARITIES, RARITY_LABEL, TYPE_LABEL, useCollectionStore } from '@/stores/collectionStore'
import { getNationalityLabel } from '@/data/nationalities'
import { driverTeamName } from '@/utils/cards'

const viewer = useCardViewer()
const col = useCollectionStore()
const route = useRoute()

const card = computed(() => viewer.state.card)
const index = viewer.index
const hasList = computed(() => viewer.state.list.length > 1)
const close = viewer.close

/** Finition : celle du joueur dont on regarde les cartes, sinon la mienne */
const finish = computed(() => {
  const id = card.value?.id
  if (!id) return 0
  if (viewer.state.finishes) return viewer.state.finishes[id] ?? 0
  return col.finishes.get(id) ?? viewer.state.finish ?? 0
})

const teamName = computed(() => driverTeamName(card.value, col.byId))

const subLabel = computed(() =>
  ['driver', 'team'].includes(card.value?.type) ? getNationalityLabel(card.value.sub) : card.value?.sub,
)

const yearsLabel = computed(() => {
  const [a, b] = card.value?.years ?? []
  if (!a) return ''
  return a === b ? String(a) : `${a}–${b}`
})

const rarityOdds = computed(() => {
  const r = RARITIES.find((x) => x.id === card.value?.rarity)
  if (!r) return ''
  const n = Math.round(100 / r.odds)
  return n <= 1 ? 'la rareté la plus courante' : `1 carte sur ${n.toLocaleString('fr-FR')} environ`
})

const stats = computed(() => {
  const s = card.value?.stats ?? {}
  switch (card.value?.type) {
    case 'driver':
      return [
        { label: 'Titres', value: s.titles },
        { label: 'Victoires', value: s.wins },
        { label: 'Podiums', value: s.podiums },
        { label: 'Saisons', value: s.seasons },
      ]
    case 'team':
      return [
        { label: 'Titres', value: s.titles },
        { label: 'Victoires', value: s.wins },
        { label: 'Saisons', value: s.seasons },
      ]
    case 'gp':
      return [
        { label: 'Vainqueur', value: s.winner },
        { label: 'Écurie', value: s.team },
        { label: 'Manche', value: s.round },
      ].filter((x) => x.value != null)
    default:
      return []
  }
})

const albums = computed(() => (card.value ? col.albums.filter((a) => a.cards.includes(card.value.id)) : []))

// ---------------------------------------------------------------------------
// Rotation : glisser pour pivoter, avec un peu d'élan au relâchement
// ---------------------------------------------------------------------------
const rx = ref(0)
const ry = ref(0)
const dragging = ref(false)
let start = null
let velocity = 0
let lastX = 0
let frame = null

const shineX = computed(() => 50 + Math.sin((ry.value * Math.PI) / 180) * 45)
const shineY = computed(() => 50 - rx.value)

function onDown(e) {
  cancelAnimationFrame(frame)
  dragging.value = true
  start = { x: e.clientX, y: e.clientY, rx: rx.value, ry: ry.value }
  lastX = e.clientX
  velocity = 0
  e.currentTarget.setPointerCapture(e.pointerId)
}

function onMove(e) {
  if (!dragging.value) return
  ry.value = start.ry + (e.clientX - start.x) * 0.6
  rx.value = Math.max(-35, Math.min(35, start.rx - (e.clientY - start.y) * 0.35))
  velocity = (e.clientX - lastX) * 0.6
  lastX = e.clientX
}

function onUp() {
  if (!dragging.value) return
  dragging.value = false
  const glide = () => {
    if (Math.abs(velocity) < 0.05) return
    ry.value += velocity
    velocity *= 0.92
    frame = requestAnimationFrame(glide)
  }
  frame = requestAnimationFrame(glide)
}

/** Retourne la carte (recto ↔ verso), en arrondissant au demi-tour le plus proche */
function turn() {
  cancelAnimationFrame(frame)
  ry.value = Math.round(ry.value / 180) * 180 + 180
  rx.value = 0
}

function recenter() {
  cancelAnimationFrame(frame)
  ry.value = Math.round(ry.value / 360) * 360
  rx.value = 0
}

function go(delta) {
  viewer.step(delta)
}

// Nouvelle carte : de face
watch(
  () => card.value?.id,
  () => {
    cancelAnimationFrame(frame)
    rx.value = 0
    ry.value = 0
  },
)

// ---------------------------------------------------------------------------
// Clavier, défilement de la page, changement de page
// ---------------------------------------------------------------------------
function onKey(e) {
  if (!card.value) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'ArrowRight') go(1)
  else if (e.key === ' ') {
    e.preventDefault()
    turn()
  }
}

watch(
  () => Boolean(card.value),
  (isOpen) => {
    document.documentElement.classList.toggle('viewer-open', isOpen)
    window[isOpen ? 'addEventListener' : 'removeEventListener']('keydown', onKey)
  },
)
watch(() => route.fullPath, close)

onUnmounted(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('keydown', onKey)
  document.documentElement.classList.remove('viewer-open')
})
</script>

<style scoped>
.viewer {
  --c: #8a8f98;
  position: fixed;
  inset: 0;
  z-index: 260;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.r-rare { --c: #3b82f6; }
.r-epic { --c: #a855f7; }
.r-legendary { --c: #e8c15a; }
.r-mythic { --c: #ff4fd8; }

.viewer-bg {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 55% at 30% 45%, color-mix(in srgb, var(--c) 28%, transparent), transparent 70%),
    radial-gradient(ellipse 50% 50% at 75% 60%, color-mix(in srgb, var(--tc, var(--c)) 14%, transparent), transparent 70%),
    rgb(6 7 9 / 0.96);
}

.v-close {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: var(--text);
  background: rgb(255 255 255 / 0.08);
  border: 1px solid var(--line);
  transition: background var(--t);
}

.v-close:hover { background: rgb(255 255 255 / 0.16); }

.layout {
  position: relative;
  min-height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  align-items: center;
  gap: 40px;
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 40px 32px;
  pointer-events: none;
}

.stage,
.info { pointer-events: auto; }

.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.stage-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.card-zone {
  position: relative;
  width: min(400px, calc(78dvh * 5 / 7));
  cursor: grab;
  touch-action: none;
  animation: float 6s ease-in-out infinite;
  will-change: transform;
}

/* Ombre au sol : un dégradé fixe, bien moins coûteux qu'un filter: drop-shadow recalculé à chaque image */
.card-zone::before {
  content: '';
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: -7%;
  height: 12%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.6), transparent);
  pointer-events: none;
}

.card-zone.dragging { cursor: grabbing; animation-play-state: paused; }
.card-zone.dragging :deep(.inner) { transition: none; }
.card-zone :deep(.inner) { transition-duration: 0.5s; will-change: transform; }

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.nav {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  color: var(--text);
  background: rgb(255 255 255 / 0.06);
  border: 1px solid var(--line);
  transition: background var(--t);
}

.nav:hover { background: rgb(255 255 255 / 0.14); }
.flip-x { transform: scaleX(-1); }

.tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  background: rgb(255 255 255 / 0.06);
  border: 1px solid var(--line);
  transition: background var(--t);
}

.tool:hover:not(:disabled) { background: rgb(255 255 255 / 0.14); }
.tool:disabled { opacity: 0.4; }
.counter { font-size: 13px; margin-left: 6px; }
.hint { font-size: 12px; }

.info {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 520px;
}

.name { line-height: 1; }

.sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: var(--text-dim);
}

.flag { width: 22px; border-radius: 3px; }

.team-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 14px;
  color: var(--text-dim);
}

.team-line b { color: var(--text); }
.team-line .muted { font-size: 12px; }
.team-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--tc); flex-shrink: 0; }

.rarity-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 13px;
}

.rarity-pill {
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
}

.r-mythic .rarity-pill {
  color: #fff;
  background: linear-gradient(90deg, #ff4fd8, #5ad1ff, #ffe066, #7dff9b);
  border-color: transparent;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgb(255 255 255 / 0.04);
  border: 1px solid var(--line);
}

.stat-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.stat-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.desc { color: var(--text-dim); line-height: 1.6; }

.quote {
  font-size: 17px;
  font-style: italic;
  line-height: 1.5;
  padding-left: 14px;
  border-left: 3px solid var(--c);
}

.missing { display: flex; align-items: center; gap: 8px; font-size: 14px; }

.albums { display: flex; flex-direction: column; gap: 8px; }
.album-chips { display: flex; flex-wrap: wrap; gap: 6px; }

.album-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  color: #ffe08a;
  background: rgb(232 193 90 / 0.1);
  border: 1px solid rgb(232 193 90 / 0.35);
  transition: background var(--t);
}

.album-chip:hover { background: rgb(232 193 90 / 0.2); }

.credit { font-size: 12px; }
.credit a { text-decoration: underline; }

/* Transitions */
.viewer-enter-active,
.viewer-leave-active { transition: opacity 0.25s ease; }
.viewer-enter-from,
.viewer-leave-to { opacity: 0; }
.viewer-enter-active .card-zone { animation: zoom-in 0.45s var(--ease) both; }

@keyframes zoom-in {
  from { transform: scale(0.7) translateY(30px); opacity: 0; }
}

.card-swap-enter-active,
.card-swap-leave-active { transition: opacity 0.18s ease, transform 0.22s var(--ease); }
.card-swap-enter-from { opacity: 0; transform: translateX(24px) scale(0.96); }
.card-swap-leave-to { opacity: 0; transform: translateX(-24px) scale(0.96); }

/* Mobile : la carte en haut, la fiche en dessous (la fenêtre défile) */
@media (max-width: 860px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    gap: 24px;
    padding: 64px 16px calc(32px + env(safe-area-inset-bottom));
  }

  .card-zone { width: min(68vw, calc(56dvh * 5 / 7)); }
  .stage-row { gap: 8px; }
  .nav { width: 38px; height: 38px; }
  .info { max-width: none; }
  .v-close { top: 12px; right: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .card-zone { animation: none; }
}
</style>
