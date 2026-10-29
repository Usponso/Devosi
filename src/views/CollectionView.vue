<template>
  <div class="page collection">
    <header class="container page-head">
      <div class="eyebrow">Cartes</div>
      <div class="head-row">
        <h1 class="title-lg">Ma collection</h1>
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
            <div class="showcase-actions">
              <button class="btn btn-ghost" @click="editorOpen = true"><Icon name="edit" :size="16" /> Modifier ma vitrine</button>
              <router-link v-if="col.profile?.username" to="/profil" class="link-arrow">Voir mon profil →</router-link>
              <button v-else class="link-arrow" @click="accountOpen = true">{{ col.isGuest ? 'Sauvegarder ma collection →' : 'Choisir un pseudo →' }}</button>
            </div>
          </div>
          <div class="showcase-slots">
            <template v-for="i in 5" :key="i">
              <div v-if="showcaseCards[i - 1]" class="slot filled">
                <F1Card :card="showcaseCards[i - 1]" :zoom-list="showcaseCards" />
              </div>
              <button v-else class="slot empty-slot" @click="editorOpen = true">
                <Icon name="plus" :size="20" />
                <span class="muted">Ajouter une carte</span>
              </button>
            </template>
          </div>
        </section>

        <!-- Éditions vainqueur (pronostics et packs après chaque GP) -->
        <section v-if="editionCards.length" class="editions card">
          <div class="editions-head">
            <h2 class="title-md"><Icon name="star" :size="18" class="gold" /> Éditions vainqueur</h2>
            <span class="muted small">{{ editionCards.length }} obtenue{{ editionCards.length > 1 ? 's' : '' }} · distribuées 7 jours après chaque GP</span>
          </div>
          <div class="editions-row">
            <F1Card v-for="c in editionCards" :key="`${c.edition.season}-${c.edition.round}`" :card="c" :zoom-list="editionCards" class="edition-card" />
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

        <div class="results-row">
          <p class="muted results">
            {{ filtered.length }} carte{{ filtered.length > 1 ? 's' : '' }}
            <template v-if="searching"> · recherche et raretés limitées aux cartes possédées</template>
          </p>
          <label class="sort">
            <span class="muted">Trier par</span>
            <select v-model="sort" aria-label="Trier les cartes">
              <option v-for="o in SORTS" :key="o.id" :value="o.id">{{ o.label }}</option>
            </select>
            <Icon name="chevron-down" :size="14" class="sort-chevron" />
          </label>
        </div>

        <div class="grid">
          <div
            v-for="card in visible"
            :key="card.id"
            class="cell"
            :class="{ owned: col.owned.has(card.id) }"
            :aria-label="col.owned.has(card.id) ? card.name : `Carte ${card.n} non découverte`"
          >
            <F1Card
              :card="card"
              :locked="!col.owned.has(card.id)"
              :count="col.owned.get(card.id) ?? 0"
              :finish="col.finishes.get(card.id) ?? 0"
              :interactive="col.owned.has(card.id)"
              :zoom-list="ownedVisible"
            />
          </div>
        </div>
        <div ref="sentinel" class="sentinel"></div>
        <p v-if="!filtered.length && !col.loading" class="empty">Aucune carte ne correspond à ces filtres.</p>
        </template>
      </template>
    </div>


    <AccountDialog :open="accountOpen" @close="accountOpen = false" @done="notify" />
    <ProfileEditor :open="editorOpen" initial-tab="showcase" single @close="editorOpen = false" />

    <transition name="toast">
      <div v-if="notice" class="toast" role="status"><Icon name="check" :size="16" /> {{ notice }}</div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import F1Card from '@/components/cards/F1Card.vue'
import ProfileEditor from '@/components/cards/ProfileEditor.vue'
import AccountDialog from '@/components/cards/AccountDialog.vue'
import AlbumShelf from '@/components/cards/AlbumShelf.vue'
import { useRoute, useRouter } from 'vue-router'
import { CARD_TYPES, RARITIES, RARITY_RANK, useCollectionStore } from '@/stores/collectionStore'

const col = useCollectionStore()

/** Éditions vainqueur : la carte du vainqueur, tamponnée (plus récente d'abord) */
const editionCards = computed(() =>
  col.editions
    .map((e) => col.byId.get(e.card_id) && { ...col.byId.get(e.card_id), edition: { season: e.season, round: e.round, name: e.name } })
    .filter(Boolean),
)

const type = ref('all')
const rarities = ref(new Set())
const ownedOnly = ref(false)
const query = ref('')
const accountOpen = ref(false)
const editorOpen = ref(false)

// Vue : classeur d'albums (par défaut) ou toutes les cartes
const route = useRoute()
const router = useRouter()
const view = ref(route.query.vue === 'cartes' ? 'cards' : 'albums')
function setView(v) {
  view.value = v
  router.replace({ query: v === 'cards' ? { vue: 'cartes' } : {} })
}

// Confirmation après une action du compte (pseudo enregistré, connexion…)
const notice = ref('')
let noticeTimer = null
function notify(message) {
  notice.value = message
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = ''), 4500)
}

const PAGE = 60
const limit = ref(PAGE)

const percent = (a = 0, b = 0) => (b ? Math.round((a / b) * 100) : 0)

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

// Tri (mémorisé sur l'appareil) : numéro, plus récentes, rareté
const SORTS = [
  { id: 'number', label: 'Numéro' },
  { id: 'recent', label: 'Plus récentes' },
  { id: 'rarity', label: 'Rareté' },
]
const SORT_KEY = 'devosi:collection-sort'
const sort = ref(readSort())
function readSort() {
  try {
    const saved = localStorage.getItem(SORT_KEY)
    return SORTS.some((o) => o.id === saved) ? saved : 'number'
  } catch {
    return 'number'
  }
}
watch(sort, (value) => {
  try {
    localStorage.setItem(SORT_KEY, value)
  } catch {
    /* localStorage indisponible : tri non mémorisé */
  }
})

/** Le catalogue est déjà dans l'ordre des numéros ; les cartes non possédées finissent la liste */
const sorted = computed(() => {
  const list = filtered.value
  if (sort.value === 'recent') {
    const at = (c) => col.obtained.get(c.id) ?? -1
    return [...list].sort((a, b) => at(b) - at(a) || a.n - b.n)
  }
  if (sort.value === 'rarity') {
    const rank = (c) => (col.owned.has(c.id) ? RARITY_RANK[c.rarity] : -1)
    return [...list].sort((a, b) => rank(b) - rank(a) || a.n - b.n)
  }
  return list
})

const visible = computed(() => sorted.value.slice(0, limit.value))
// Visionneuse : flèches entre les cartes possédées affichées
const ownedVisible = computed(() => visible.value.filter((c) => col.owned.has(c.id)))
watch([type, rarities, ownedOnly, query, sort], () => (limit.value = PAGE))

const totalByType = computed(() => countBy(col.cards))
const ownedByType = computed(() => countBy(col.cards.filter((c) => col.owned.has(c.id))))

function countBy(cards) {
  return cards.reduce((acc, c) => ((acc[c.type] = (acc[c.type] ?? 0) + 1), acc), {})
}

// Vitrine
const showcaseCards = computed(() => col.showcase.map((id) => col.byId.get(id)).filter(Boolean))

// Chargement progressif au défilement
const sentinel = ref(null)
let observer = null

onMounted(() => {
  col.init()
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && limit.value < filtered.value.length) limit.value += PAGE
    },
    { rootMargin: '600px' },
  )
  watch(sentinel, (el) => el && observer.observe(el), { immediate: true })
})

onUnmounted(() => {
  observer?.disconnect()
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

.editions { margin-bottom: 24px; }

.editions-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-bottom: 14px;
}

.editions-head .title-md { display: inline-flex; align-items: center; gap: 8px; }
.gold { color: #e8c15a; }

.editions-row {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 140px;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 6px;
}

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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  border: 1px dashed var(--line-strong);
  transition: border-color var(--t), color var(--t);
}

.empty-slot:hover { border-color: var(--accent); color: var(--text); }

.showcase-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
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

.results-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 12px;
}

.results { font-size: 13px; }

.sort {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.sort select {
  appearance: none;
  padding: 7px 32px 7px 14px;
  border-radius: 99px;
  font: inherit;
  font-weight: 700;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--line);
  cursor: pointer;
  transition: border-color var(--t);
}

.sort select:hover,
.sort select:focus { outline: none; border-color: var(--line-strong); }
.sort select option { background: var(--surface); }
.sort-chevron { position: absolute; right: 12px; pointer-events: none; color: var(--text-muted); }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 14px;
}

.cell { display: block; text-align: left; border-radius: 10px; }
.cell:not(.owned) { cursor: default; }
.sentinel { height: 1px; }

.toast {
  position: fixed;
  left: 50%;
  bottom: calc(24px + var(--tabbar-h, 0px));
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100vw - 32px);
  padding: 12px 18px;
  border-radius: 99px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--surface-3);
  border: 1px solid var(--success, #3ecf8e);
  box-shadow: 0 12px 30px rgb(0 0 0 / 0.45);
  transform: translateX(-50%);
}

.toast .icon { color: var(--success, #3ecf8e); }
.toast-enter-active, .toast-leave-active { transition: opacity 0.25s ease, transform 0.3s var(--ease); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }

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


@media (max-width: 640px) {
  .comp-types { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .search { margin-left: 0; width: 100%; }
  .grid { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }
  .showcase-slots { gap: 6px; }
  .empty-slot span { display: none; }
}
</style>
