<template>
  <div class="page shop-page">
    <header class="container page-head">
      <div class="eyebrow">Cartes</div>
      <h1 class="title-lg">Boutique</h1>
      <p class="dim">Dépense tes Pièces pour ouvrir plus de packs.</p>
    </header>

    <div class="container body">
      <p v-if="!col.configured" class="card empty">La collection n'est pas encore configurée.</p>

      <template v-else>
        <!-- Porte-monnaie -->
        <section class="wallet card">
          <Icon name="coin" :size="30" class="coin" />
          <div>
            <div class="wallet-amount mono" v-countup="col.coins"></div>
            <div class="muted small">Pièces</div>
          </div>
        </section>

        <!-- Articles -->
        <section class="items">
          <article class="item card">
            <div class="item-visual" aria-hidden="true">
              <span class="pack">
                <span class="pack-brand">DEVOSI</span>
                <span class="pack-title">F1 PACK</span>
                <span class="pack-sub">5 cartes</span>
              </span>
            </div>
            <div class="item-body">
              <h2 class="title-md">Pack de 5 cartes</h2>
              <p class="muted small">
                Ajouté à ta réserve ({{ available }}/{{ max }}), sans limite d'achats.
              </p>
              <div class="item-buy">
                <span class="price"><span class="mono">{{ formatCoins(shop.price) }}</span> <Icon name="coin" :size="16" class="coin" /></span>
                <button class="btn" :class="{ 'btn-ghost': !canBuy }" :disabled="busy || !canBuy" @click="buy">
                  <Icon name="cart" :size="16" /> Acheter
                </button>
              </div>
              <p v-if="!canBuy && col.status" class="muted small">{{ buyBlocker }}</p>
              <p v-if="message" class="small" :class="error ? 'error' : 'accent'">{{ message }}</p>
            </div>
          </article>

          <!-- Pack du week-end de course -->
          <article v-if="gp" class="item card gp-item">
            <div class="item-visual">
              <GpPack :name="gp.name" :circuit-id="gp.circuit" :season="gp.season" :round="gp.round" :width="96" />
            </div>
            <div class="item-body">
              <span class="gp-tag"><Icon name="flag" :size="12" /> Week-end de course · encore {{ countdown(gp.ends_at) }}</span>
              <h2 class="title-md">Pack {{ gp.name }}</h2>
              <p class="muted small">
                5 cartes dont 2 liées au circuit (Grands Prix disputés là-bas, pilotes et écuries qui y ont gagné)
                et 3 fois plus de chances d'avoir l'édition vainqueur. 1 offert par jour sur la page Packs ;
                en vente sans limite jusqu'à la fin du week-end.
              </p>
              <div class="item-buy">
                <span class="price"><span class="mono">{{ formatCoins(gp.price) }}</span> <Icon name="coin" :size="16" class="coin" /></span>
                <button class="btn" :class="{ 'btn-ghost': !canBuyGp }" :disabled="busy || !canBuyGp" @click="buyGp">
                  <Icon name="cart" :size="16" /> Acheter
                </button>
              </div>
              <p v-if="gp.packs" class="small">
                {{ gp.packs }} pack{{ gp.packs > 1 ? 's' : '' }} GP à ouvrir. <router-link to="/packs" class="link-arrow">Ouvrir →</router-link>
              </p>
              <p v-if="gpMessage" class="small" :class="gpError ? 'error' : 'accent'">{{ gpMessage }}</p>
            </div>
          </article>

          <!-- Prochain pack GP : annoncé avant son week-end -->
          <article v-else-if="gpNext" class="item card gp-item upcoming">
            <div class="item-visual">
              <GpPack :name="gpNext.name" :circuit-id="gpNext.circuit" :season="gpNext.season" :round="gpNext.round" :width="96" locked />
            </div>
            <div class="item-body">
              <span class="gp-tag"><Icon name="clock" :size="12" /> Prochainement</span>
              <h2 class="title-md">Pack {{ gpNext.name }}</h2>
              <div class="arrives">
                <span class="muted small">Arrive dans</span>
                <span class="mono arrives-clock">{{ countdown(gpNext.starts_at, true) }}</span>
              </div>
              <p class="muted small">
                Disponible pendant tout le week-end de course, des premiers essais à la fin de la course :
                1 pack offert chaque jour sur la page Packs, et jusqu'à 3 à acheter ici. 5 cartes dont 2 liées
                au circuit, et 3 fois plus de chances d'avoir l'édition vainqueur.
              </p>
              <div class="item-buy">
                <span class="price"><span class="mono">{{ formatCoins(gpNext.price) }}</span> <Icon name="coin" :size="16" class="coin" /></span>
                <button class="btn btn-ghost" disabled><Icon name="lock" :size="16" /> Bientôt</button>
              </div>
            </div>
          </article>
        </section>

        <!-- Code promo -->
        <section class="promo card">
          <div class="promo-head">
            <Icon name="gift" :size="22" class="coin" />
            <div>
              <h2 class="title-md">Code promo</h2>
              <p class="muted small">Tu as un code ? Saisis-le pour recevoir des Pièces ou des packs bonus.</p>
            </div>
          </div>
          <form class="promo-form" @submit.prevent="redeem">
            <input
              v-model.trim="code"
              class="promo-input mono"
              maxlength="32"
              placeholder="TONCODE"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              aria-label="Code promo"
            />
            <button class="btn" :disabled="redeeming || !code">Valider</button>
          </form>
          <p v-if="codeMessage" class="small" :class="codeError ? 'error' : 'success'">{{ codeMessage }}</p>
        </section>

        <!-- Gagner des Pièces -->
        <section>
          <h2 class="title-md section-title">Gagner des Pièces</h2>
          <div class="earn">
            <router-link to="/quetes" class="earn-tile card">
              <Icon name="trophy" :size="22" />
              <div>
                <div class="earn-title">Quêtes du jour</div>
                <div class="muted small">Jusqu'à 200 Pièces et 2 packs par jour</div>
              </div>
              <span v-if="col.questsReady" class="earn-badge mono">{{ col.questsReady }}</span>
            </router-link>
            <router-link to="/atelier" class="earn-tile card">
              <Icon name="recycle" :size="22" />
              <div>
                <div class="earn-title">Recycler des doublons</div>
                <div class="muted small">De 5 à 2 000 Pièces par carte selon sa rareté</div>
              </div>
            </router-link>
            <router-link to="/collection" class="earn-tile card">
              <Icon name="album" :size="22" />
              <div>
                <div class="earn-title">Compléter des albums</div>
                <div class="muted small">Une récompense par album terminé</div>
              </div>
            </router-link>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import GpPack from '@/components/cards/GpPack.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { economyMessage, formatCoins } from '@/utils/cards'

const col = useCollectionStore()
const busy = ref(false)
const message = ref('')
const error = ref(false)

const available = computed(() => col.status?.available ?? 0)
const max = computed(() => col.status?.max ?? 10)
const shop = computed(() => col.status?.shop ?? { price: 150, daily: 3, left: 0 })
const canBuy = computed(() => available.value < max.value && col.coins >= shop.value.price)
const buyBlocker = computed(() => {
  if (available.value >= max.value) return 'Ta réserve de packs est pleine : ouvre-en avant d’en acheter.'
  return `Encore ${formatCoins(shop.value.price - col.coins)} Pièces à gagner.`
})

// Pack du week-end de course
const gp = computed(() => col.gpWeekend)
const gpNext = computed(() => col.status?.gp_next ?? null)

// Comptes à rebours (heure du serveur) : arrivée du prochain pack, fin du week-end
const now = ref(Date.now())
const clock = setInterval(() => {
  now.value = Date.now()
  // Le week-end commence : l'état est relu, le pack devient achetable
  if (gpNext.value && !gp.value && new Date(gpNext.value.starts_at).getTime() <= now.value + col.clockOffset) {
    col.refreshStatus().catch(() => {})
  }
}, 1000)
onUnmounted(() => clearInterval(clock))

/** « 1 j 03 h 12 min 05 s » (avec les secondes) ou « 1 j 03 h » */
function countdown(iso, seconds = false) {
  const s = Math.max(0, Math.floor((new Date(iso).getTime() - (now.value + col.clockOffset)) / 1000))
  const d = Math.floor(s / 86400)
  const h = String(Math.floor((s % 86400) / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  if (seconds) return `${d ? `${d} j ` : ''}${h} h ${m} min ${sec} s`
  return d ? `${d} j ${h} h` : `${h} h ${m} min`
}
const canBuyGp = computed(() => gp.value && col.coins >= gp.value.price)
const gpMessage = ref('')
const gpError = ref(false)

async function buyGp() {
  busy.value = true
  gpError.value = false
  try {
    await col.buyGpPack()
    gpMessage.value = 'Pack GP ajouté : ouvre-le depuis la page Packs.'
  } catch (err) {
    gpError.value = true
    gpMessage.value = economyMessage(err)
  } finally {
    busy.value = false
  }
}

// Code promo
const code = ref('')
const redeeming = ref(false)
const codeMessage = ref('')
const codeError = ref(false)

async function redeem() {
  redeeming.value = true
  codeError.value = false
  codeMessage.value = ''
  try {
    const { coins, packs } = await col.redeemCode(code.value)
    const parts = []
    if (packs) parts.push(`${packs} pack${packs > 1 ? 's' : ''} bonus`)
    if (coins) parts.push(`${formatCoins(coins)} Pièces`)
    codeMessage.value = `Code validé : +${parts.join(' et +')} !`
    code.value = ''
  } catch (err) {
    codeError.value = true
    codeMessage.value = economyMessage(err)
  } finally {
    redeeming.value = false
  }
}

async function buy() {
  busy.value = true
  error.value = false
  try {
    await col.buyPack()
    message.value = 'Pack ajouté à ta réserve !'
  } catch (err) {
    error.value = true
    message.value = economyMessage(err)
  } finally {
    busy.value = false
  }
}

onMounted(() => !col.ready && col.init())
</script>

<style scoped>
.page-head {
  padding-top: 32px;
  padding-bottom: 20px;
}

.page-head .title-lg { margin: 6px 0 6px; }

.body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.small { font-size: 13px; }
.error { color: var(--danger); }
.coin { color: #e8c15a; }
.section-title { margin-bottom: 12px; }

.wallet {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;
  border-color: rgb(232 193 90 / 0.3);
  background: linear-gradient(90deg, rgb(232 193 90 / 0.1), transparent 70%), var(--surface);
}

.wallet-amount { font-size: 30px; font-weight: 700; line-height: 1; }

.items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
  gap: 16px;
}

.item {
  display: flex;
  gap: 20px;
  padding: 20px;
}

.item-visual { flex-shrink: 0; width: 96px; }

.pack {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  aspect-ratio: 5 / 7;
  border-radius: 10px;
  background: linear-gradient(150deg, var(--accent), color-mix(in srgb, var(--accent) 40%, #0b0c0f));
  box-shadow: 0 10px 24px rgb(0 0 0 / 0.4);
  color: #fff;
  text-align: center;
}

.pack-brand { font-size: 9px; letter-spacing: 0.3em; opacity: 0.8; }
.pack-title { font-size: 15px; font-weight: 900; line-height: 1; }
.pack-sub { font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; opacity: 0.8; }

.gp-item { border-color: rgb(225 6 0 / 0.4); }
.gp-item.upcoming { border-style: dashed; }

.gp-tag {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  color: #ff8a8a;
  background: rgb(225 6 0 / 0.16);
}

.arrives { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; }
.arrives-clock { font-size: 20px; font-weight: 800; color: var(--text); }

.item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-buy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
}

.price {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 20px;
  font-weight: 800;
}

.btn:disabled { opacity: 0.55; cursor: default; }

.success { color: var(--success); }

.promo {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.promo-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.promo-form {
  display: flex;
  gap: 8px;
}

.promo-input {
  flex: 1;
  min-width: 0;
  max-width: 360px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 16px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.promo-input::placeholder { letter-spacing: 0.12em; color: var(--text-muted); }
.promo-input:focus { outline: none; border-color: var(--accent-line); }

.earn {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 12px;
}

.earn-tile {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  transition: border-color var(--t), transform var(--t);
}

.earn-tile:hover { border-color: var(--accent-line); transform: translateY(-2px); }
.earn-tile > .icon { color: var(--accent); flex-shrink: 0; }
.earn-title { font-weight: 700; }

.earn-badge {
  position: absolute;
  top: 10px;
  right: 12px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  color: var(--on-accent);
  background: var(--accent);
}
</style>
