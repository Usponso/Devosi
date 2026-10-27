<template>
  <div class="page collection">
    <header class="container page-head">
      <div class="eyebrow">Collection</div>
      <div class="head-row">
        <h1 class="title-lg">Mes cartes</h1>
        <div class="head-actions">
          <CoinBalance />
          <button class="btn btn-ghost" @click="accountOpen = true">
            <Icon :name="col.isGuest ? 'save' : 'user'" :size="16" />
            {{ col.isGuest ? 'Sauvegarder ma collection' : col.profile?.username ? `@${col.profile.username}` : 'Mon compte' }}
          </button>
          <router-link to="/atelier" class="btn btn-ghost"><Icon name="hammer" :size="16" /> Atelier</router-link>
          <router-link to="/packs" class="btn">
            <Icon name="package" :size="16" />
            Ouvrir des packs<span v-if="col.status?.available" class="mono"> ({{ col.status.available }})</span>
          </router-link>
        </div>
      </div>

      <!-- Complétion -->
      <div class="completion">
        <div class="comp-total">
          <span class="mono comp-num">{{ col.ownedCount }}</span>
          <span class="muted">/ {{ col.cards.length }} · {{ percent(col.ownedCount, col.cards.length) }} %</span>
        </div>
        <div class="comp-types">
          <div v-for="t in CARD_TYPES" :key="t.id" class="comp-type">
            <span class="muted">{{ t.label }}</span>
            <span class="mono">{{ ownedByType[t.id] ?? 0 }}/{{ totalByType[t.id] ?? 0 }}</span>
            <span class="meter"><span :style="{ width: percent(ownedByType[t.id], totalByType[t.id]) + '%', background: 'var(--accent)' }"></span></span>
          </div>
        </div>
      </div>
    </header>

    <div class="container">
      <p v-if="!col.configured" class="card empty">La collection n'est pas encore configurée.</p>

      <template v-else>
        <!-- Vitrine -->
        <section class="showcase card">
          <div class="showcase-head">
            <div>
              <h2 class="title-md">Ma vitrine</h2>
              <p class="muted small">
                <template v-if="col.isGuest">Sauvegarde ta collection et choisis un pseudo pour rendre ta vitrine publique.</template>
                <template v-else-if="!col.profile?.username">Choisis un pseudo pour rendre ta vitrine publique.</template>
                <template v-else>Tes 5 cartes préférées, visibles par tous les joueurs.</template>
              </p>
            </div>
            <router-link v-if="col.profile?.username" :to="`/joueurs/${col.profile.username}`" class="link-arrow">Voir ma vitrine publique →</router-link>
            <button v-else class="link-arrow" @click="accountOpen = true">{{ col.isGuest ? 'Sauvegarder ma collection →' : 'Choisir un pseudo →' }}</button>
          </div>
          <div class="showcase-slots">
            <template v-for="i in 5" :key="i">
              <button v-if="showcaseCards[i - 1]" class="slot filled" @click="selected = showcaseCards[i - 1]">
                <F1Card :card="showcaseCards[i - 1]" />
              </button>
              <div v-else class="slot empty-slot">
                <span class="muted">Clique sur une de tes cartes puis « Mettre en vitrine »</span>
              </div>
            </template>
          </div>
        </section>

        <!-- Classeur ou liste complète -->
        <div class="tabs view-tabs" role="tablist">
          <button class="tab" role="tab" :aria-selected="view === 'albums'" :class="{ active: view === 'albums' }" @click="setView('albums')">
            <Icon name="album" :size="15" /> Classeur
            <span v-if="col.albumsToClaim" class="claim-dot mono">{{ col.albumsToClaim }}</span>
          </button>
          <button class="tab" role="tab" :aria-selected="view === 'cards'" :class="{ active: view === 'cards' }" @click="setView('cards')">
            <Icon name="cards" :size="15" /> Toutes les cartes
          </button>
        </div>

        <AlbumShelf v-if="view === 'albums'" />

        <template v-else>
        <!-- Filtres -->
        <div class="filters">
          <div class="tabs">
            <button class="tab" :class="{ active: type === 'all' }" @click="type = 'all'">Tout</button>
            <button v-for="t in CARD_TYPES" :key="t.id" class="tab" :class="{ active: type === t.id }" @click="type = t.id">
              {{ t.label }}
            </button>
          </div>
          <div class="filter-row">
            <div class="rarity-chips">
              <button
                v-for="r in RARITIES"
                :key="r.id"
                class="chip"
                :class="[`r-${r.id}`, { active: rarities.has(r.id) }]"
                @click="toggleRarity(r.id)"
              >{{ r.label }}</button>
            </div>
            <label class="owned-toggle">
              <input v-model="ownedOnly" type="checkbox" :disabled="searching" />
              Possédées
            </label>
            <input v-model.trim="query" class="search" type="search" placeholder="Rechercher dans mes cartes" aria-label="Rechercher dans mes cartes" />
          </div>
        </div>

        <p class="muted results">
          {{ filtered.length }} carte{{ filtered.length > 1 ? 's' : '' }}
          <template v-if="searching"> · recherche et raretés limitées aux cartes possédées</template>
        </p>

        <div class="grid">
          <component
            :is="col.owned.has(card.id) ? 'button' : 'div'"
            v-for="card in visible"
            :key="card.id"
            class="cell"
            :class="{ owned: col.owned.has(card.id) }"
            :aria-label="col.owned.has(card.id) ? card.name : `Carte ${card.n} non découverte`"
            @click="col.owned.has(card.id) && (selected = card)"
          >
            <F1Card
              :card="card"
              :locked="!col.owned.has(card.id)"
              :count="col.owned.get(card.id) ?? 0"
              :finish="col.finishes.get(card.id) ?? 0"
              :interactive="col.owned.has(card.id)"
            />
          </component>
        </div>
        <div ref="sentinel" class="sentinel"></div>
        <p v-if="!filtered.length && !col.loading" class="empty">Aucune carte ne correspond à ces filtres.</p>
        </template>
      </template>
    </div>

    <!-- Fiche détaillée (cartes possédées uniquement) -->
    <transition name="fade">
      <div v-if="selected" class="detail-backdrop" @click.self="selected = null">
        <div class="detail card" role="dialog" aria-modal="true" :aria-label="selected.name">
          <button class="close" aria-label="Fermer" @click="selected = null"><Icon name="x" /></button>
          <div class="detail-card">
            <F1Card :card="selected" :count="copies" :finish="finishOf(selected)" />
          </div>
          <div class="detail-info">
            <div class="eyebrow">{{ TYPE_LABEL[selected.type] }} · {{ RARITY_LABEL[selected.rarity] }} · #{{ String(selected.n).padStart(4, '0') }}</div>
            <h2 class="title-md">{{ selected.name }}</h2>
            <p class="dim">{{ describe(selected) }}</p>
            <p v-if="selected.text" class="dim">{{ selected.text }}</p>
            <p v-if="selected.quote" class="quote">« {{ selected.quote }} »</p>
            <p class="owned-line">
              Possédée ×{{ copies }}
              <span v-if="finishOf(selected)" class="finish-chip" :class="`f-${finishOf(selected)}`">{{ FINISHES[finishOf(selected)].label }}</span>
            </p>

            <!-- Doublons : finition et recyclage -->
            <div class="dup-actions">
              <div v-if="nextFinish" class="upgrade">
                <div class="upgrade-head">
                  <span>Finition <b>{{ nextFinish.label }}</b></span>
                  <span class="mono muted">{{ Math.min(copies, nextFinish.copies) }}/{{ nextFinish.copies }}</span>
                </div>
                <span class="meter"><span :class="`f-${nextFinish.id}`" :style="{ width: `${Math.min(1, copies / nextFinish.copies) * 100}%` }"></span></span>
                <button v-if="copies >= nextFinish.copies" class="btn" :disabled="actionBusy" @click="upgrade">
                  <Icon name="star" :size="16" /> Améliorer en {{ nextFinish.label }} ({{ nextFinish.copies - 1 }} doublons)
                </button>
              </div>
              <div v-if="copies > 1" class="recycle-row">
                <button class="btn btn-ghost" :disabled="actionBusy" @click="recycle(1)">
                  <Icon name="recycle" :size="16" /> Recycler 1 · +{{ value.recycle }}
                </button>
                <button v-if="copies > 2" class="btn btn-ghost" :disabled="actionBusy" @click="recycle(copies - 1)">
                  <Icon name="recycle" :size="16" /> Recycler les {{ copies - 1 }} doublons · +{{ formatCoins(value.recycle * (copies - 1)) }}
                </button>
              </div>
              <p v-if="actionMsg" class="small" :class="actionError ? 'error' : 'accent'">{{ actionMsg }}</p>
            </div>

            <button class="btn showcase-btn" :class="{ 'btn-ghost': inShowcase(selected) }" :disabled="showcaseBusy" @click="toggleShowcase(selected)">
              <Icon :name="inShowcase(selected) ? 'check' : 'star'" :size="16" />
              {{ inShowcase(selected) ? 'Retirer de la vitrine' : 'Mettre en vitrine' }}
            </button>
            <p v-if="showcaseError" class="error small">{{ showcaseError }}</p>

            <p v-if="selected.photo" class="credit muted">
              Photo : {{ selected.photo.author }} ·
              <a :href="selected.photo.source" target="_blank" rel="noopener">{{ selected.photo.license }}</a>, via Wikimedia Commons
            </p>
          </div>
        </div>
      </div>
    </transition>

    <AccountDialog :open="accountOpen" @close="accountOpen = false" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import F1Card from '@/components/cards/F1Card.vue'
import AccountDialog from '@/components/cards/AccountDialog.vue'
import CoinBalance from '@/components/cards/CoinBalance.vue'
import AlbumShelf from '@/components/cards/AlbumShelf.vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CARD_TYPES,
  FINISHES,
  RARITIES,
  RARITY_LABEL,
  RARITY_VALUE,
  TYPE_LABEL,
  useCollectionStore,
} from '@/stores/collectionStore'
import { describeCard, economyMessage, formatCoins } from '@/utils/cards'

const col = useCollectionStore()

const type = ref('all')
const rarities = ref(new Set())
const ownedOnly = ref(false)
const query = ref('')
const selected = ref(null)
const accountOpen = ref(false)
const showcaseBusy = ref(false)
const showcaseError = ref('')

// Doublons de la carte affichée
const copies = computed(() => (selected.value ? col.owned.get(selected.value.id) ?? 0 : 0))
const finishOf = (card) => col.finishes.get(card.id) ?? 0
const nextFinish = computed(() => (selected.value ? FINISHES[finishOf(selected.value) + 1] ?? null : null))
const value = computed(() => RARITY_VALUE[selected.value?.rarity] ?? RARITIES[0])
const actionBusy = ref(false)
const actionMsg = ref('')
const actionError = ref(false)
watch(selected, () => (actionMsg.value = ''))

async function runAction(fn) {
  actionBusy.value = true
  actionError.value = false
  try {
    actionMsg.value = await fn()
  } catch (err) {
    actionError.value = true
    actionMsg.value = economyMessage(err)
  } finally {
    actionBusy.value = false
  }
}

const recycle = (qty) =>
  runAction(async () => `+${formatCoins(await col.recycle(selected.value.id, qty))} Pièces`)

const upgrade = () =>
  runAction(async () => `Finition ${FINISHES[await col.upgrade(selected.value.id)].label} débloquée !`)

// Vue : classeur d'albums (par défaut) ou toutes les cartes
const route = useRoute()
const router = useRouter()
const view = ref(route.query.vue === 'cartes' ? 'cards' : 'albums')
function setView(v) {
  view.value = v
  router.replace({ query: v === 'cards' ? { vue: 'cartes' } : {} })
}

const PAGE = 60
const limit = ref(PAGE)

const percent = (a = 0, b = 0) => (b ? Math.round((a / b) * 100) : 0)
const describe = describeCard

function toggleRarity(id) {
  const next = new Set(rarities.value)
  next.has(id) ? next.delete(id) : next.add(id)
  rarities.value = next
}

const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Recherche et raretés ne portent que sur les cartes possédées (pas d'indice sur les autres) */
const searching = computed(() => Boolean(query.value) || rarities.value.size > 0)

const filtered = computed(() => {
  const q = normalize(query.value)
  const ownedFilter = ownedOnly.value || searching.value
  return col.cards.filter(
    (c) =>
      (type.value === 'all' || c.type === type.value) &&
      (!ownedFilter || col.owned.has(c.id)) &&
      (!rarities.value.size || rarities.value.has(c.rarity)) &&
      (!q || normalize(`${c.name} ${c.sub ?? ''} ${c.years?.[0] ?? ''}`).includes(q)),
  )
})

const visible = computed(() => filtered.value.slice(0, limit.value))
watch([type, rarities, ownedOnly, query], () => (limit.value = PAGE))

const totalByType = computed(() => countBy(col.cards))
const ownedByType = computed(() => countBy(col.cards.filter((c) => col.owned.has(c.id))))

function countBy(cards) {
  return cards.reduce((acc, c) => ((acc[c.type] = (acc[c.type] ?? 0) + 1), acc), {})
}

// Vitrine
const showcaseCards = computed(() => col.showcase.map((id) => col.byId.get(id)).filter(Boolean))
const inShowcase = (card) => col.showcase.includes(card.id)

async function toggleShowcase(card) {
  showcaseBusy.value = true
  showcaseError.value = ''
  try {
    await col.toggleShowcase(card.id)
  } catch (err) {
    showcaseError.value = err.code === 'SHOWCASE_FULL' ? 'Ta vitrine est pleine : retires-en une carte d’abord.' : err.message
  } finally {
    showcaseBusy.value = false
  }
}

watch(selected, () => (showcaseError.value = ''))

// Chargement progressif au défilement
const sentinel = ref(null)
let observer = null

const onKey = (e) => e.key === 'Escape' && (selected.value = null)

onMounted(() => {
  col.init()
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && limit.value < filtered.value.length) limit.value += PAGE
    },
    { rootMargin: '600px' },
  )
  watch(sentinel, (el) => el && observer.observe(el), { immediate: true })
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  observer?.disconnect()
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.page-head {
  padding-top: 40px;
  padding-bottom: 20px;
}

.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 6px;
}

.head-actions { display: flex; flex-wrap: wrap; gap: 8px; }

.small { font-size: 13px; }

.completion {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 18px;
}

.comp-num { font-size: 34px; font-weight: 700; }

.comp-types {
  display: grid;
  grid-template-columns: repeat(4, minmax(110px, 1fr));
  gap: 14px;
  flex: 1;
}

.comp-type {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

/* Vitrine */
.showcase { margin-bottom: 24px; }

.showcase-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.showcase-slots {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  max-width: 760px;
}

.slot { aspect-ratio: 5 / 7; border-radius: 10px; }

.empty-slot {
  display: grid;
  place-items: center;
  padding: 12px;
  text-align: center;
  font-size: 11px;
  border: 1px dashed var(--line-strong);
}

/* Filtres */
.filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.rarity-chips { display: flex; flex-wrap: wrap; gap: 6px; }

.chip {
  --c: #8a8f98;
  padding: 5px 12px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--c) 50%, transparent);
  color: var(--text-dim);
}

.chip.active { background: color-mix(in srgb, var(--c) 30%, transparent); color: var(--text); border-color: var(--c); }
.chip.r-rare { --c: #3b82f6; }
.chip.r-epic { --c: #a855f7; }
.chip.r-legendary { --c: #e8c15a; }
.chip.r-mythic { --c: #ff4fd8; }

.owned-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.owned-toggle input { accent-color: var(--accent); }

.search {
  margin-left: auto;
  min-width: 220px;
  padding: 8px 14px;
  border-radius: 99px;
  font: inherit;
  font-size: 13px;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--line);
}

.search:focus { outline: none; border-color: var(--accent-line); }

.results { font-size: 13px; margin-bottom: 12px; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 14px;
}

.cell { display: block; text-align: left; border-radius: 10px; }
.cell:not(.owned) { cursor: default; }
.sentinel { height: 1px; }

.view-tabs { margin: 8px 0 22px; }
.view-tabs .tab { display: inline-flex; align-items: center; gap: 6px; }

.claim-dot {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  border-radius: 99px;
  font-size: 11px;
  background: #e8c15a;
  color: #2a1c00;
}

/* Fiche */
.detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(5, 6, 8, 0.88);
}

.detail {
  position: relative;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 28px;
  width: min(760px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 28px;
}

.close {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 6px;
  color: var(--text-muted);
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
}

.quote { font-style: italic; font-size: 16px; }
.owned-line { display: flex; align-items: center; gap: 8px; font-weight: 700; }

.finish-chip,
.meter .f-1 { background: linear-gradient(90deg, #8e97a2, #ffffff, #8e97a2); }
.finish-chip.f-2,
.meter .f-2 { background: linear-gradient(90deg, #b5850f, #fff0b0, #b5850f); }
.finish-chip {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #111;
}

.dup-actions { display: flex; flex-direction: column; gap: 12px; }
.upgrade { display: flex; flex-direction: column; gap: 8px; }
.upgrade-head { display: flex; justify-content: space-between; font-size: 14px; }
.upgrade .btn { align-self: flex-start; }
.recycle-row { display: flex; flex-wrap: wrap; gap: 8px; }
.dup-actions .btn:disabled { opacity: 0.5; }
.showcase-btn { align-self: flex-start; }
.showcase-btn:disabled { opacity: 0.5; }
.error { color: var(--danger); }
.credit { font-size: 12px; margin-top: auto; }
.credit a { text-decoration: underline; }

@media (max-width: 640px) {
  .comp-types { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .search { margin-left: 0; width: 100%; }
  .grid { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }
  .showcase-slots { gap: 6px; }
  .empty-slot span { display: none; }
  .detail { grid-template-columns: 1fr; justify-items: center; padding: 20px 16px; }
  .detail-card { width: min(240px, 70vw); }
}
</style>
