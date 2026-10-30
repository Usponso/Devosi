<template>
  <div class="page atelier">
    <header class="container page-head">
      <div class="eyebrow">Cartes · doublons</div>
      <div class="head-row">
        <h1 class="title-lg">Atelier</h1>
      </div>

      <div class="wallet card">
        <Icon name="coin" :size="28" class="wallet-icon" />
        <div>
          <div class="wallet-amount mono">{{ formatCoins(col.coins) }}</div>
          <div class="muted small">Pièces · à dépenser en fabrication ou à la <router-link to="/boutique" class="link-arrow">boutique</router-link></div>
        </div>
        <div class="wallet-dups">
          <span class="mono">{{ formatCoins(totalDuplicates) }}</span>
          <span class="muted small">doublon{{ totalDuplicates > 1 ? 's' : '' }}</span>
        </div>
      </div>
    </header>

    <div class="container">
      <p v-if="!col.configured" class="card empty">
        La collection n'est pas encore configurée (Supabase). Renseigne <code>.env.local</code> pour l'activer.
      </p>
      <p v-else-if="col.error && !col.status" class="card empty">
        Impossible de charger ta collection pour le moment. <button class="link-arrow" @click="col.init()">Réessayer</button>
      </p>

      <template v-else>
        <div class="tabs atelier-tabs" role="tablist">
          <button
            v-for="t in TABS"
            :key="t.id"
            class="tab"
            role="tab"
            :aria-selected="tab === t.id"
            :class="{ active: tab === t.id }"
            @click="setTab(t.id)"
          ><Icon :name="t.icon" :size="15" /> {{ t.label }}</button>
        </div>

        <!-- 1. Recycler -->
        <section v-if="tab === 'recycle'" class="card panel">
          <h2 class="title-md">Recycler mes doublons</h2>
          <p class="dim">Chaque doublon rapporte des Pièces selon sa rareté. Ton dernier exemplaire n'est jamais recyclé.</p>

          <div class="dup-table">
            <button
              v-for="r in RARITIES"
              :key="r.id"
              class="dup-row"
              :class="[`r-${r.id}`, { active: recycleRarities.has(r.id) }]"
              :aria-pressed="recycleRarities.has(r.id)"
              @click="toggleRecycleRarity(r.id)"
            >
              <span class="check"><Icon v-if="recycleRarities.has(r.id)" name="check" :size="14" /></span>
              <span class="dup-label">{{ r.label }}</span>
              <span class="mono muted">+{{ r.recycle }} / doublon</span>
              <span class="mono">{{ recyclable[r.id].copies }} × → <b>{{ formatCoins(recyclable[r.id].value) }}</b></span>
            </button>
          </div>

          <div class="keep-row">
            <span class="small dim">Garder</span>
            <div class="tabs">
              <button v-for="k in KEEP_OPTIONS" :key="k.value" class="tab" :class="{ active: keep === k.value }" @click="keep = k.value">
                {{ k.label }}
              </button>
            </div>
          </div>
          <p class="small muted">{{ KEEP_OPTIONS.find((k) => k.value === keep).hint }}</p>

          <div class="actions">
            <button
              class="btn"
              :disabled="busy || !recycleTotal.copies"
              @click="confirmRecycle ? recycleAll() : (confirmRecycle = true)"
            >
              <Icon name="recycle" :size="16" />
              <template v-if="!recycleTotal.copies">Aucun doublon à recycler</template>
              <template v-else-if="confirmRecycle">Confirmer : {{ recycleTotal.copies }} cartes → +{{ formatCoins(recycleTotal.value) }}</template>
              <template v-else>Recycler {{ recycleTotal.copies }} doublon{{ recycleTotal.copies > 1 ? 's' : '' }} · +{{ formatCoins(recycleTotal.value) }}</template>
            </button>
            <button v-if="confirmRecycle" class="btn btn-ghost" @click="confirmRecycle = false">Annuler</button>
          </div>
          <p class="small muted">Pour recycler une carte précise ou l'améliorer en Chrome / Or, ouvre-la depuis <router-link to="/collection" class="link-arrow">ta collection</router-link>.</p>
        </section>

        <!-- 3. Fabriquer -->
        <section v-else-if="tab === 'craft'" class="card panel">
          <h2 class="title-md">Fabriquer une carte</h2>
          <p class="dim">Choisis une carte qui te manque et fabrique-la avec tes Pièces.</p>

          <div class="craft-filters">
            <input
              v-model.trim="craftQuery"
              class="search"
              type="search"
              placeholder="Pilote, écurie, Grand Prix, moment, année…"
              aria-label="Rechercher une carte à fabriquer"
            />
            <div class="rarity-chips">
              <button
                v-for="r in RARITIES"
                :key="r.id"
                class="chip"
                :class="[`r-${r.id}`, { active: craftRarity === r.id }]"
                @click="craftRarity = craftRarity === r.id ? null : r.id"
              >{{ r.label }} · {{ formatCoins(r.craft) }}</button>
            </div>
          </div>

          <p v-if="!craftSearching" class="small muted">Tape au moins 2 lettres ou choisis une rareté pour voir les cartes manquantes.</p>
          <p v-else-if="!craftResults.length" class="small muted">Aucune carte manquante ne correspond.</p>
          <ul v-else class="craft-list">
            <li v-for="card in craftResults" :key="card.id" class="craft-row" :class="`r-${card.rarity}`">
              <span class="mono muted">#{{ String(card.n).padStart(4, '0') }}</span>
              <span class="craft-name">
                <b>{{ card.name }}</b>
                <span class="small muted">{{ TYPE_LABEL[card.type] }} · {{ yearsOf(card) }}</span>
              </span>
              <span class="rarity-tag">{{ RARITY_LABEL[card.rarity] }}</span>
              <button class="btn" :class="{ 'btn-ghost': col.coins < RARITY_VALUE[card.rarity].craft }" :disabled="busy || col.coins < RARITY_VALUE[card.rarity].craft" @click="craft(card)">
                <Icon name="hammer" :size="14" /> {{ formatCoins(RARITY_VALUE[card.rarity].craft) }}
              </button>
            </li>
          </ul>
          <p v-if="craftMore" class="small muted">… et {{ craftMore }} autres : affine ta recherche.</p>
        </section>

        <!-- 4. Vitesse supérieure -->
        <section v-else class="card panel">
          <h2 class="title-md">Vitesse supérieure</h2>
          <p class="dim">
            Sacrifie {{ TRADE_UP_COST }} doublons d'une rareté pour tirer une carte au hasard de la rareté supérieure.
            Les cartes que tu as en plus grand nombre partent en premier, et ton dernier exemplaire est toujours conservé.
          </p>
          <div class="trade-grid">
            <div v-for="t in tradeUps" :key="t.from.id" class="trade-tile" :class="{ ready: t.ready }">
              <div class="trade-flow">
                <span class="rarity-tag" :class="`r-${t.from.id}`">{{ TRADE_UP_COST }} × {{ t.from.label }}</span>
                <Icon name="arrow-right" :size="16" class="muted" />
                <span class="rarity-tag" :class="`r-${t.to.id}`">1 {{ t.to.label }}</span>
              </div>
              <div class="trade-meter">
                <span class="meter"><span :class="`bg-${t.from.id}`" :style="{ width: `${Math.min(1, t.copies / TRADE_UP_COST) * 100}%` }"></span></span>
                <span class="mono small muted">{{ t.copies }}/{{ TRADE_UP_COST }}</span>
              </div>
              <button class="btn" :class="{ 'btn-ghost': !t.ready }" :disabled="busy || !t.ready" @click="tradeUp(t.from.id)">
                <Icon name="gauge" :size="16" /> Passer la vitesse
              </button>
            </div>
          </div>
        </section>

        <p v-if="message" class="message" :class="messageError ? 'error' : 'accent'">{{ message }}</p>
      </template>
    </div>

    <!-- Révélation d'une carte fabriquée ou tirée -->
    <transition name="fade">
      <div v-if="reveal" class="reveal-backdrop" @click.self="closeReveal">
        <div class="reveal-box">
          <div v-if="reveal.merging" class="merge" aria-hidden="true">
            <span v-for="i in TRADE_UP_COST" :key="i" class="merge-card" :class="`bg-${reveal.from}`" :style="{ '--i': i - 1 }"></span>
          </div>
          <template v-else>
            <button class="reveal-card" :aria-label="reveal.flipped ? reveal.card.name : 'Retourner la carte'" @click="reveal.flipped = true">
              <F1Card :card="reveal.card" :face-down="!reveal.flipped" :is-new="reveal.flipped && reveal.card.isNew" />
            </button>
            <p class="muted small">{{ reveal.flipped ? (reveal.card.isNew ? 'Nouvelle carte !' : 'Doublon : il pourra servir à l\'atelier.') : 'Touche la carte pour la retourner' }}</p>
            <button v-if="reveal.flipped" class="btn" @click="closeReveal">Continuer</button>
          </template>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import F1Card from '@/components/cards/F1Card.vue'
import {
  RARITIES,
  RARITY_LABEL,
  RARITY_VALUE,
  TRADE_UP_COST,
  TYPE_LABEL,
  useCollectionStore,
} from '@/stores/collectionStore'
import { economyMessage, formatCoins } from '@/utils/cards'

const col = useCollectionStore()
const route = useRoute()
const router = useRouter()

const TABS = [
  { id: 'recycle', label: 'Recycler', icon: 'recycle' },
  { id: 'craft', label: 'Fabriquer', icon: 'hammer' },
  { id: 'trade', label: 'Vitesse supérieure', icon: 'gauge' },
]
const tab = ref(TABS.some((t) => t.id === route.query.tab) ? route.query.tab : 'recycle')
function setTab(id) {
  tab.value = id
  message.value = ''
  router.replace({ query: { tab: id } })
}

const busy = ref(false)
const message = ref('')
const messageError = ref(false)

async function run(fn) {
  busy.value = true
  messageError.value = false
  message.value = ''
  try {
    message.value = (await fn()) ?? ''
  } catch (err) {
    console.error('[Atelier]', err)
    messageError.value = true
    message.value = economyMessage(err)
  } finally {
    busy.value = false
  }
}

const totalDuplicates = computed(() => Object.values(col.duplicates).reduce((sum, d) => sum + d.copies, 0))

// ---------------------------------------------------------------------------
// 1. Recyclage
// ---------------------------------------------------------------------------
const KEEP_OPTIONS = [
  { value: 1, label: '1 exemplaire', hint: 'Tous les doublons sont recyclés.' },
  { value: 2, label: '2', hint: 'Un doublon de chaque carte est mis de côté.' },
  { value: 5, label: '5 (Chrome)', hint: "Garde de quoi passer chaque carte en Chrome (5 exemplaires)." },
  { value: 10, label: '10 (Or)', hint: "Garde de quoi passer chaque carte en Or (10 exemplaires)." },
]
const keep = ref(1)
// Par défaut, les raretés supérieures ne sont pas recyclées par mégarde
const recycleRarities = ref(new Set(['common', 'rare']))
const confirmRecycle = ref(false)
watch([keep, recycleRarities], () => (confirmRecycle.value = false))

function toggleRecycleRarity(id) {
  const next = new Set(recycleRarities.value)
  next.has(id) ? next.delete(id) : next.add(id)
  recycleRarities.value = next
}

/** Doublons recyclables par rareté selon le nombre d'exemplaires gardés */
const recyclable = computed(() => {
  const out = Object.fromEntries(RARITIES.map((r) => [r.id, { copies: 0, value: 0 }]))
  for (const [id, count] of col.owned) {
    const card = col.byId.get(id)
    if (!card || count <= keep.value) continue
    out[card.rarity].copies += count - keep.value
    out[card.rarity].value += (count - keep.value) * RARITY_VALUE[card.rarity].recycle
  }
  return out
})

const recycleTotal = computed(() =>
  [...recycleRarities.value].reduce(
    (acc, r) => ({ copies: acc.copies + recyclable.value[r].copies, value: acc.value + recyclable.value[r].value }),
    { copies: 0, value: 0 },
  ),
)

const recycleAll = () =>
  run(async () => {
    confirmRecycle.value = false
    const gained = await col.recycleAll(keep.value, [...recycleRarities.value])
    return `Recyclage terminé : +${formatCoins(gained)} Pièces`
  })

// ---------------------------------------------------------------------------
// 3. Fabrication
// ---------------------------------------------------------------------------
const CRAFT_LIMIT = 40
const craftQuery = ref('')
const craftRarity = ref(null)
const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const craftSearching = computed(() => craftQuery.value.length >= 2 || Boolean(craftRarity.value))

const craftMatches = computed(() => {
  if (!craftSearching.value) return []
  const words = normalize(craftQuery.value).split(/\s+/).filter(Boolean)
  return col.cards.filter((card) => {
    if (card.edition || card.type === 'poster' || col.owned.has(card.id)) return false
    if (craftRarity.value && card.rarity !== craftRarity.value) return false
    if (!words.length) return true
    const text = normalize(`${card.name} ${card.sub ?? ''} ${card.stats?.winner ?? ''} ${card.years?.join(' ') ?? ''} ${TYPE_LABEL[card.type]}`)
    return words.every((w) => text.includes(w))
  })
})
const craftResults = computed(() => craftMatches.value.slice(0, CRAFT_LIMIT))
const craftMore = computed(() => Math.max(0, craftMatches.value.length - CRAFT_LIMIT))

function yearsOf(card) {
  const [a, b] = card.years ?? []
  return a === b ? a : `${a}–${b}`
}

const craft = (card) =>
  run(async () => {
    const made = await col.craft(card.id)
    showReveal(made)
  })

// ---------------------------------------------------------------------------
// 4. Vitesse supérieure
// ---------------------------------------------------------------------------
const tradeUps = computed(() =>
  RARITIES.slice(0, -1).map((from, i) => {
    const copies = col.duplicates[from.id].copies
    return { from, to: RARITIES[i + 1], copies, ready: copies >= TRADE_UP_COST }
  }),
)

const tradeUp = (rarity) =>
  run(async () => {
    const [card] = await Promise.all([col.tradeUp(rarity), startMerge(rarity)])
    showReveal(card)
  })

// ---------------------------------------------------------------------------
// Révélation
// ---------------------------------------------------------------------------
const reveal = ref(null)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Animation des 5 doublons qui fusionnent (pendant l'appel au serveur) */
async function startMerge(rarity) {
  reveal.value = reactive({ merging: true, from: rarity })
  await sleep(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100)
}

function showReveal(card) {
  reveal.value = reactive({ merging: false, card, flipped: false })
}

function closeReveal() {
  if (reveal.value?.merging) return
  reveal.value = null
}

onMounted(() => {
  if (!col.ready) col.init()
})
</script>

<style scoped>
.page-head {
  padding-top: 40px;
  padding-bottom: 24px;
}

.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 6px;
}

.head-links { display: flex; flex-wrap: wrap; gap: 8px; }

.wallet {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding: 18px 22px;
  background:
    radial-gradient(120% 160% at 0% 50%, rgb(232 193 90 / 0.14), transparent 60%),
    var(--surface);
}

.wallet-icon { color: #e8c15a; }
.wallet-amount { font-size: 34px; font-weight: 700; line-height: 1; }
.wallet-dups { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; font-size: 20px; }
.small { font-size: 13px; }

.atelier-tabs { margin-bottom: 16px; overflow-x: auto; max-width: 100%; }
.atelier-tabs .tab { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }

.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px;
}

.panel .dim { max-width: 640px; }

.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.btn:disabled { opacity: 0.5; cursor: default; }

/* Couleurs de rareté */
.r-common { --c: #8a8f98; }
.r-rare { --c: #3b82f6; }
.r-epic { --c: #a855f7; }
.r-legendary { --c: #e8c15a; }
.r-mythic { --c: #ff4fd8; }
.bg-common { background: #8a8f98 !important; }
.bg-rare { background: #3b82f6 !important; }
.bg-epic { background: #a855f7 !important; }
.bg-legendary { background: #e8c15a !important; }

/* Recyclage */
.dup-table { display: flex; flex-direction: column; gap: 6px; }

.dup-row {
  display: grid;
  grid-template-columns: 22px 1fr auto auto;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--surface-2);
  text-align: left;
  font-size: 14px;
  transition: border-color 0.2s, background 0.2s;
}

.dup-row.active { border-color: color-mix(in srgb, var(--c) 70%, transparent); background: color-mix(in srgb, var(--c) 12%, var(--surface-2)); }

.check {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  border: 1px solid var(--line-strong);
  color: #111;
}

.dup-row.active .check { background: var(--c); border-color: var(--c); }
.dup-label { font-weight: 700; color: var(--c); filter: brightness(1.2); }

.keep-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }

/* Fabrication */
.craft-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }

.search {
  flex: 1 1 260px;
  padding: 9px 14px;
  border-radius: 99px;
  font: inherit;
  font-size: 14px;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.search:focus { outline: none; border-color: var(--accent-line); }

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

.craft-list { display: flex; flex-direction: column; gap: 6px; list-style: none; padding: 0; margin: 0; }

.craft-row {
  display: grid;
  grid-template-columns: 56px 1fr auto auto;
  align-items: center;
  gap: 14px;
  padding: 8px 8px 8px 14px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border-left: 3px solid var(--c);
}

.craft-name { display: flex; flex-direction: column; min-width: 0; }
.craft-name b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.rarity-tag {
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--c);
  background: color-mix(in srgb, var(--c) 16%, transparent);
  white-space: nowrap;
}

/* Vitesse supérieure */
.trade-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }

.trade-tile {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.trade-tile.ready { border-color: var(--accent-line); box-shadow: 0 0 24px rgb(var(--accent-rgb) / 0.15); }
.trade-flow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.trade-meter { display: flex; align-items: center; gap: 10px; }
.trade-meter .meter { flex: 1; }

.message { margin-top: 14px; font-weight: 700; }

/* Révélation */
.reveal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(5, 6, 8, 0.88);
}

.reveal-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.reveal-card {
  width: min(300px, 72vw);
  animation: pop 0.45s var(--ease) both;
}

@keyframes pop {
  from { transform: scale(0.6); opacity: 0; }
}

.merge {
  position: relative;
  width: min(300px, 72vw);
  aspect-ratio: 5 / 7;
}

.merge-card {
  position: absolute;
  inset: 22%;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 30px currentColor;
  animation: merge 1.1s cubic-bezier(0.6, 0, 0.3, 1) both;
}

@keyframes merge {
  0% { transform: translate(calc((var(--i) - 2) * 70%), 30%) rotate(calc((var(--i) - 2) * 10deg)); opacity: 0; }
  25% { opacity: 1; }
  80% { transform: translate(0, 0) rotate(0) scale(0.9); opacity: 1; filter: brightness(1); }
  100% { transform: scale(1.3); opacity: 0; filter: brightness(3); }
}

@media (max-width: 640px) {
  .dup-row { grid-template-columns: 22px 1fr auto; }
  .dup-row > .muted { display: none; }
  .craft-row { grid-template-columns: 1fr auto; }
  .craft-row > .mono, .craft-row .rarity-tag { display: none; }
  .wallet-amount { font-size: 28px; }
}

@media (prefers-reduced-motion: reduce) {
  .merge-card, .reveal-card { animation: none; }
}
</style>
