<template>
  <div class="page album-page">
    <header class="container page-head">
      <router-link to="/collection" class="link-arrow back">← Mon classeur</router-link>
      <template v-if="album">
        <div class="eyebrow">{{ album.section }}</div>
        <div class="head-row">
          <div>
            <h1 class="title-lg">{{ album.title }}</h1>
            <p class="dim">{{ album.subtitle }}</p>
          </div>
          <CoinBalance />
        </div>

        <div class="progress card" :class="{ complete: stats.complete }">
          <div class="progress-num">
            <span class="mono big">{{ stats.owned }}</span>
            <span class="muted">/ {{ stats.total }} cartes · {{ Math.floor((stats.owned / stats.total) * 100) }} %</span>
          </div>
          <span class="meter"><span :style="{ width: `${(stats.owned / stats.total) * 100}%` }"></span></span>
          <div class="reward">
            <template v-if="stats.claimed">
              <span class="done"><Icon name="check" :size="16" /> Album complété · {{ formatCoins(album.reward) }} Pièces récupérées</span>
            </template>
            <button v-else-if="stats.complete" class="btn claim" :disabled="busy" @click="claim">
              <Icon name="coin" :size="16" /> Récupérer {{ formatCoins(album.reward) }} Pièces
            </button>
            <span v-else class="muted small">
              <Icon name="coin" :size="14" class="gold" /> {{ formatCoins(album.reward) }} Pièces une fois l'album complet ·
              encore {{ stats.total - stats.owned }} carte{{ stats.total - stats.owned > 1 ? 's' : '' }}
            </span>
          </div>
          <p v-if="message" class="small" :class="messageError ? 'error' : 'gold'">{{ message }}</p>
        </div>
      </template>
    </header>

    <div v-if="!album" class="container">
      <p class="card empty">Cet album n'existe pas. <router-link to="/collection" class="link-arrow">Retour au classeur</router-link></p>
    </div>

    <div v-else class="container">
      <!-- Une double page de l'album -->
      <section class="spread">
        <div class="pager">
          <button class="btn btn-ghost" :disabled="page === 0" aria-label="Page précédente" @click="go(page - 1)">
            <Icon name="chevron-right" :size="16" class="flip" />
          </button>
          <span class="mono small">Page {{ page + 1 }} / {{ pageCount }}</span>
          <button class="btn btn-ghost" :disabled="page >= pageCount - 1" aria-label="Page suivante" @click="go(page + 1)">
            <Icon name="chevron-right" :size="16" />
          </button>
        </div>

        <transition :name="direction" mode="out-in">
          <div :key="page" class="sheet">
            <div v-for="(card, i) in pageCards" :key="card.id" class="slot" :style="{ animationDelay: `${i * 25}ms` }">
              <F1Card
                v-if="col.owned.has(card.id)"
                :card="card"
                :count="col.owned.get(card.id)"
                :finish="col.finishes.get(card.id) ?? 0"
              />
              <div v-else class="empty-slot">
                <span class="slot-num mono">{{ card.n }}</span>
              </div>
            </div>
          </div>
        </transition>

        <div class="dots" aria-hidden="true">
          <button
            v-for="p in pageCount"
            :key="p"
            class="dot"
            :class="{ on: p - 1 === page, full: pageComplete(p - 1) }"
            tabindex="-1"
            @click="go(p - 1)"
          ></button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '@/components/Icon.vue'
import F1Card from '@/components/cards/F1Card.vue'
import CoinBalance from '@/components/cards/CoinBalance.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { economyMessage, formatCoins } from '@/utils/cards'

/** Cartes par page, comme une page d'album Panini */
const PER_PAGE = 12

const col = useCollectionStore()
const route = useRoute()

const album = computed(() => col.albums.find((a) => a.id === route.params.id) ?? null)
const stats = computed(() => col.albumStats.get(album.value?.id) ?? { owned: 0, total: 0 })
const cards = computed(() => (album.value?.cards ?? []).map((id) => col.byId.get(id)).filter(Boolean))

const page = ref(0)
const direction = ref('turn-next')
const pageCount = computed(() => Math.max(1, Math.ceil(cards.value.length / PER_PAGE)))
const pageCards = computed(() => cards.value.slice(page.value * PER_PAGE, (page.value + 1) * PER_PAGE))
const pageComplete = (p) => cards.value.slice(p * PER_PAGE, (p + 1) * PER_PAGE).every((c) => col.owned.has(c.id))

function go(p) {
  if (p < 0 || p >= pageCount.value) return
  direction.value = p > page.value ? 'turn-next' : 'turn-prev'
  page.value = p
}

watch(() => route.params.id, () => (page.value = 0))

const busy = ref(false)
const message = ref('')
const messageError = ref(false)

async function claim() {
  busy.value = true
  messageError.value = false
  try {
    const reward = await col.claimAlbum(album.value.id)
    message.value = `+${formatCoins(reward)} Pièces ! Bravo, l'album est complet.`
  } catch (err) {
    messageError.value = true
    message.value = economyMessage(err)
  } finally {
    busy.value = false
  }
}

function onKey(e) {
  if (e.key === 'ArrowRight') go(page.value + 1)
  if (e.key === 'ArrowLeft') go(page.value - 1)
}

onMounted(() => {
  if (!col.ready) col.init()
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.page-head { padding-top: 32px; padding-bottom: 20px; }
.back { display: inline-block; margin-bottom: 14px; }

.head-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 6px;
}

.progress {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
  padding: 18px 22px;
}

.progress.complete { border-color: rgb(232 193 90 / 0.5); }
.progress .meter { height: 6px; }
.progress .meter > span { background: var(--accent); }
.progress.complete .meter > span { background: linear-gradient(90deg, #b5850f, #e8c15a); }
.progress-num { display: flex; align-items: baseline; gap: 8px; }
.big { font-size: 30px; font-weight: 700; }
.small { font-size: 13px; }
.gold { color: #e8c15a; }
.done { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: var(--success, #3ecf8e); }

.claim {
  background: linear-gradient(90deg, #b5850f, #e8c15a, #b5850f);
  color: #2a1c00;
  box-shadow: 0 0 22px rgb(232 193 90 / 0.45);
  animation: pulse 1.6s ease-in-out infinite alternate;
}

@keyframes pulse {
  to { box-shadow: 0 0 34px rgb(232 193 90 / 0.75); }
}

/* Double page d'album */
.spread {
  padding: 22px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background:
    linear-gradient(90deg, transparent calc(50% - 1px), rgb(0 0 0 / 0.35) 50%, transparent calc(50% + 1px)),
    radial-gradient(120% 80% at 50% 0%, rgb(255 255 255 / 0.04), transparent 60%),
    var(--surface);
  box-shadow: inset 0 0 60px rgb(0 0 0 / 0.35);
}

.pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 18px; }
.pager .btn { padding: 8px 12px; }
.pager .btn:disabled { opacity: 0.35; cursor: default; }
.flip { transform: rotate(180deg); }

.sheet {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}

.slot { animation: drop 0.35s var(--ease) both; }

@keyframes drop {
  from { opacity: 0; transform: translateY(8px); }
}

.empty-slot {
  aspect-ratio: 5 / 7;
  display: grid;
  place-items: center;
  border-radius: 6%;
  border: 2px dashed rgb(255 255 255 / 0.12);
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 0.02) 0 6px, transparent 6px 14px),
    rgb(0 0 0 / 0.2);
}

.slot-num { font-size: 22px; font-weight: 700; color: rgb(255 255 255 / 0.22); }

.dots { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-top: 18px; }

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--surface-3);
  transition: transform 0.2s var(--ease), background 0.2s;
}

.dot.full { background: #e8c15a; }
.dot.on { transform: scale(1.45); background: var(--accent); }

/* Tourne-page */
.turn-next-enter-active, .turn-next-leave-active,
.turn-prev-enter-active, .turn-prev-leave-active { transition: opacity 0.2s ease, transform 0.25s var(--ease); }
.turn-next-enter-from, .turn-prev-leave-to { opacity: 0; transform: translateX(30px) rotateY(-8deg); }
.turn-next-leave-to, .turn-prev-enter-from { opacity: 0; transform: translateX(-30px) rotateY(8deg); }

@media (max-width: 1000px) {
  .sheet { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .spread { padding: 14px; background: var(--surface); }
  .sheet { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .slot-num { font-size: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .claim, .slot { animation: none; }
}
</style>
