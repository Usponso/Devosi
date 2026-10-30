<template>
  <div class="page packs">
    <header class="container page-head">
      <div class="eyebrow">Collection · {{ col.ownedCount }} / {{ col.collectionCards.length || '…' }} cartes</div>
      <div class="head-row">
        <h1 class="title-lg">Packs</h1>
        <div class="head-links">
          <button
            class="btn btn-ghost sound-toggle"
            :aria-pressed="!prefs.soundOn"
            :aria-label="prefs.soundOn ? 'Couper le son' : 'Activer le son'"
            :title="prefs.soundOn ? 'Couper le son' : 'Activer le son'"
            @click="prefs.toggleSound()"
          >
            <Icon :name="prefs.soundOn ? 'volume' : 'volume-off'" :size="16" />
          </button>
        </div>
      </div>
    </header>

    <div class="container">
      <!-- Rendez-vous du jour : série de connexion et carte mystère -->
      <DailyPanel v-if="col.ready && stage === 'idle' && !col.welcomeAvailable" />

      <p v-if="!col.configured" class="card empty">
        La collection n'est pas encore configurée (Supabase). Renseigne <code>.env.local</code> pour l'activer.
      </p>

      <p v-else-if="col.error && !col.status" class="card empty">
        Impossible de charger ta collection pour le moment. <button class="link-arrow" @click="col.init()">Réessayer</button>
      </p>

      <!-- Bienvenue (1re visite) : pack doré à ouvrir -->
      <section v-else-if="stage === 'idle' && col.welcomeAvailable" class="welcome card">
        <div class="eyebrow">Étape 1 / 2</div>
        <h1 class="title-lg">Bienvenue dans ta collection</h1>
        <p class="dim">{{ col.cards.length.toLocaleString('fr-FR') }} cartes de pilotes, écuries, Grands Prix et moments de légende depuis 1950. Ton premier pack t'attend.</p>
        <button class="welcome-pack" :disabled="busy" aria-label="Ouvrir mon pack de bienvenue" @click="openWelcome">
          <span class="pack-brand">DEVOSI</span>
          <span class="pack-title">BIENVENUE</span>
          <span class="pack-sub">Pack doré</span>
        </button>
        <p class="muted small">
          Une Épique garantie<template v-if="prefs.favoriteTeam"> et une carte {{ prefs.favoriteTeam.name }}, ton écurie</template>.
        </p>
        <button class="btn" :disabled="busy" @click="openWelcome">
          <Icon name="gift" :size="16" /> {{ busy ? 'Ouverture…' : 'Ouvrir mon pack de bienvenue' }}
        </button>
        <p v-if="message" class="message">{{ message }}</p>
      </section>

      <!-- Bienvenue, étape 2 : comment continuer -->
      <section v-else-if="stage === 'tips'" class="welcome card">
        <div class="eyebrow">Étape 2 / 2</div>
        <h2 class="title-lg">Pour aller plus loin</h2>
        <ul class="tips">
          <li>
            <Icon name="package" :size="22" />
            <span><b>Un pack toutes les 30 min</b><span class="muted">{{ available }} pack{{ available > 1 ? 's' : '' }} t'attende{{ available > 1 ? 'nt' : '' }} déjà dans ta réserve.</span></span>
          </li>
          <li>
            <Icon name="trophy" :size="22" />
            <span><b>4 quêtes par jour</b><span class="muted">Des Pièces, des packs bonus et une série à tenir.</span></span>
          </li>
          <li>
            <Icon name="flag" :size="22" />
            <span><b>Pronostique chaque Grand Prix</b><span class="muted">Trouve le vainqueur et gagne sa carte en édition limitée.</span></span>
          </li>
          <li>
            <Icon name="user" :size="22" />
            <span><b>Crée ton profil</b><span class="muted">Avatar, vitrine et badges, visibles par tes amis.</span></span>
          </li>
        </ul>
        <button class="btn" @click="stage = 'idle'">C'est parti <Icon name="arrow-right" :size="16" /></button>
      </section>

      <!-- Réserve de packs -->
      <section v-else-if="stage === 'idle'" class="reserve card">
        <button
          class="stack"
          :class="{ empty: !total, special: special > 0 }"
          :disabled="!total || busy"
          aria-label="Ouvrir un pack"
          @click="openPack"
        >
          <span v-for="i in Math.min(3, Math.max(total, 1))" :key="i" class="pack" :style="{ '--i': i - 1 }">
            <span class="pack-brand">DEVOSI</span>
            <span class="pack-title">F1 PACK</span>
            <span class="pack-sub">5 cartes</span>
          </span>
        </button>

        <div class="reserve-info">
          <div class="eyebrow">Réserve · 1 pack toutes les 30 min</div>
          <div class="count-row">
            <span class="count mono">{{ available }}</span>
            <span class="muted">/ {{ max }}</span>
            <div class="gauge" aria-hidden="true">
              <span v-for="i in max" :key="i" :class="{ on: i <= available }"></span>
            </div>
          </div>
          <p class="dim timer">
            <template v-if="available >= max">Réserve pleine : ouvre un pack pour relancer le compteur.</template>
            <template v-else>Prochain pack dans <span class="mono">{{ countdown }}</span></template>
          </p>

          <!-- Packs gagnés : réserve bonus sans plafond, packs spéciaux de la série -->
          <div v-if="bonus || special" class="extra-reserves">
            <span v-if="special" class="reserve-chip special">
              <Icon name="star" :size="14" /> {{ special }} pack{{ special > 1 ? 's' : '' }} spécia{{ special > 1 ? 'ux' : 'l' }} · Épique garantie
            </span>
            <span v-if="bonus" class="reserve-chip bonus">
              <Icon name="gift" :size="14" /> Réserve bonus : <b class="mono">{{ bonus }}</b> pack{{ bonus > 1 ? 's' : '' }}
            </span>
          </div>

          <div class="actions">
            <button class="btn" :disabled="!total || busy" @click="openPack">
              <Icon name="package" :size="16" />
              {{ busy ? 'Ouverture…' : special ? 'Ouvrir le pack spécial' : total > 1 ? `Ouvrir un pack (${total})` : 'Ouvrir un pack' }}
            </button>
            <span v-if="col.status" class="muted pity">
              Légendaire garantie dans <b>{{ col.status.pity_left }}</b> pack{{ col.status.pity_left > 1 ? 's' : '' }}
            </span>
          </div>
          <p v-if="message" class="message">{{ message }}</p>
        </div>

        <!-- Week-end de course : pack GP (1 offert par jour, 3 en boutique) -->
        <div v-if="gp" class="gp-block">
          <GpPack :name="gp.name" :circuit-id="gp.circuit" :season="gp.season" :round="gp.round" :width="76" />
          <div class="gp-info">
            <span class="gp-tag"><Icon name="flag" :size="12" /> Week-end de course · encore {{ gpEndsIn }}</span>
            <div class="gp-title">Pack {{ gp.name }}</div>
            <p class="muted small">5 cartes dont 2 liées au circuit : Grands Prix disputés là-bas, pilotes et écuries qui y ont gagné.</p>
            <p v-if="gpPoster" class="small gp-poster">
              <Icon name="star" :size="13" />
              {{ col.owned.has(gpPoster.id) ? 'Affiche du week-end obtenue !' : "Affiche d'époque du week-end : 1 chance sur 4 par pack GP, introuvable ensuite." }}
            </p>
          </div>
          <div class="gp-actions">
            <button class="btn" :disabled="!col.gpPacksToOpen || busy" @click="openPack(true)">
              <Icon name="package" :size="16" />
              {{ gp.free ? 'Ouvrir le pack du jour (offert)' : gp.packs ? `Ouvrir un pack GP (${gp.packs})` : 'Pack du jour ouvert' }}
            </button>
            <router-link to="/boutique" class="muted small gp-shop">
              En boutique : {{ formatCoins(gp.price) }} Pièces
            </router-link>
          </div>
        </div>

        <!-- Édition vainqueur en jeu -->
        <div v-if="edition" class="edition-line" :class="{ owned: editionOwned }">
          <Icon name="star" :size="16" />
          <span v-if="editionOwned">Édition vainqueur du {{ edition.name }} obtenue !</span>
          <span v-else>
            <b>Carte limitée : {{ editionDriver }}, vainqueur du {{ edition.name }}</b>, avec un tampon doré « Vainqueur ».
            À trouver dans les packs jusqu'au {{ editionUntil }} (0,5 % de chances par pack, 1,5 % dans un pack GP).
            Au prochain GP, pronostique le bon vainqueur pour recevoir sa carte à coup sûr.
            <router-link to="/pronostics" class="link-arrow">Pronostics →</router-link>
          </span>
        </div>

        <!-- Notifications : proposées après la première ouverture de pack -->
        <NotificationsInvite v-if="col.status?.packs_opened > 0" />

        <!-- Rappel : profil à compléter -->
        <router-link v-if="profileLeft" to="/profil" class="profile-line">
          <Icon name="user-check" :size="16" />
          <span>Ton profil est complété à <b>{{ profileLeft.percent }} %</b> : termine-le pour gagner {{ profileLeft.reward }} Pièces.</span>
          <Icon name="chevron-right" :size="16" class="sc-arrow" />
        </router-link>

        <!-- Raccourcis : quêtes du jour et boutique -->
        <div class="shortcuts">
          <router-link to="/quetes" class="shortcut" :class="{ ready: col.questsReady }">
            <Icon name="trophy" :size="20" />
            <span class="sc-text">
              <span class="sc-title">Quêtes du jour</span>
              <span class="muted small">{{ questsSummary }}</span>
            </span>
            <span v-if="col.questsReady" class="sc-badge mono">{{ col.questsReady }}</span>
            <Icon name="chevron-right" :size="16" class="sc-arrow" />
          </router-link>
          <router-link to="/boutique" class="shortcut">
            <Icon name="cart" :size="20" />
            <span class="sc-text">
              <span class="sc-title">Boutique</span>
              <span class="muted small">1 pack pour {{ formatCoins(shop.price) }} Pièces, sans limite</span>
            </span>
            <Icon name="chevron-right" :size="16" class="sc-arrow" />
          </router-link>
        </div>

        <div class="odds">
          <div class="eyebrow">Chances par pack</div>
          <p class="muted odds-intro">Probabilité qu'un pack de 5 cartes contienne au moins une carte de chaque rareté.</p>
          <table class="odds-table">
            <thead>
              <tr><th>Rareté</th><th class="num">Par carte</th><th class="num">Par pack</th><th class="num">Soit environ</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in RARITIES" :key="r.id" :class="`r-${r.id}`">
                <td><span class="dot"></span>{{ r.label }}</td>
                <td class="num mono muted">{{ formatPercent(r.odds / 100) }}</td>
                <td class="num mono">{{ formatPercent(packChance(r)) }}</td>
                <td class="num muted">{{ packFrequency(r) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Révélation carte par carte -->
      <section v-else-if="stage === 'reveal'" class="opening">
        <div class="reveal-head">
          <span class="eyebrow">
            Carte {{ index + 1 }} / {{ drawn.length }}
            <span v-if="drawn.source === 'special'" class="source-tag special">Pack spécial</span>
            <span v-else-if="drawn.source?.startsWith('gp')" class="source-tag gp">Pack GP</span>
            <span v-else-if="drawn.source === 'welcome'" class="source-tag">Pack de bienvenue</span>
            <span v-else-if="drawn.source === 'bonus'" class="source-tag">Pack bonus</span>
          </span>
          <div class="reveal-actions">
            <button
              class="sound-toggle quiet"
              :aria-label="prefs.soundOn ? 'Couper le son' : 'Activer le son'"
              :title="prefs.soundOn ? 'Couper le son' : 'Activer le son'"
              @click="prefs.toggleSound()"
            >
              <Icon :name="prefs.soundOn ? 'volume' : 'volume-off'" :size="18" />
            </button>
            <button class="link-arrow" @click="skipToSummary">Tout révéler</button>
          </div>
        </div>

        <div class="stage-area" @click="advance">
          <div v-if="flipped" :key="`burst-${index}`" class="burst" :class="`r-${current.rarity}`"></div>
          <transition name="deal" mode="out-in">
            <div :key="index" class="current">
              <F1Card :card="current" :face-down="!flipped" :is-new="flipped && current.isNew" :interactive="flipped" :zoomable="false" />
            </div>
          </transition>
        </div>

        <p class="hint muted">
          {{ flipped ? (index + 1 < drawn.length ? 'Touche pour la carte suivante' : 'Touche pour voir le récapitulatif') : 'Touche la carte pour la retourner' }}
        </p>

        <div class="tray">
          <div v-for="(c, i) in drawn" :key="i" class="tray-slot" :class="{ done: i < index || (i === index && flipped) }">
            <F1Card v-if="i < index || (i === index && flipped)" :card="c" :interactive="false" :zoomable="false" />
          </div>
        </div>
      </section>

      <!-- Récapitulatif -->
      <section v-else class="summary">
        <div class="summary-head">
          <h2 class="title-md">{{ newCount ? `${newCount} nouvelle${newCount > 1 ? 's' : ''} carte${newCount > 1 ? 's' : ''} !` : 'Pack ouvert' }}</h2>
          <div class="actions">
            <button v-if="drawn.source === 'welcome'" class="btn" @click="stage = 'tips'">Continuer <Icon name="arrow-right" :size="16" /></button>
            <button v-else-if="lastWasGp && col.gpPacksToOpen" class="btn" @click="openPack(true)">Ouvrir un autre pack GP ({{ col.gpPacksToOpen }})</button>
            <button v-else-if="total" class="btn" @click="openPack()">Ouvrir un autre pack ({{ total }})</button>
            <button v-if="drawn.source !== 'welcome'" class="btn btn-ghost" @click="stage = 'idle'">Retour aux packs</button>
          </div>
        </div>
        <!-- Rappel : une belle carte mérite la vitrine -->
        <div v-if="highlight && !showcaseDone" class="reminder">
          <Icon name="cards" :size="18" />
          <span>
            Tu viens d'obtenir <b>{{ highlight.name }}</b> ({{ highlight.edition ? 'édition vainqueur' : RARITY_LABEL[highlight.rarity] }}) :
            {{ col.showcase.length < 5 ? 'ajoute-la à ta vitrine ?' : 'elle mérite ta vitrine !' }}
          </span>
          <button v-if="col.showcase.length < 5" class="btn btn-ghost" :disabled="showcaseBusy" @click="addToShowcase">Ajouter</button>
          <button v-else class="btn btn-ghost" @click="showcaseEditor = true">Remplacer une carte</button>
        </div>
        <p v-else-if="showcaseDone" class="reminder done"><Icon name="check" :size="16" /> Ajoutée à ta vitrine.</p>

        <div class="summary-grid">
          <F1Card v-for="(c, i) in drawn" :key="i" :card="c" :is-new="c.isNew" :zoom-list="drawn" class="summary-card" :style="{ animationDelay: `${i * 80}ms` }" />
        </div>
      </section>

      <ProfileEditor :open="showcaseEditor" initial-tab="showcase" single @close="showcaseEditor = false" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import F1Card from '@/components/cards/F1Card.vue'
import ProfileEditor from '@/components/cards/ProfileEditor.vue'
import GpPack from '@/components/cards/GpPack.vue'
import DailyPanel from '@/components/cards/DailyPanel.vue'
import NotificationsInvite from '@/components/NotificationsInvite.vue'
import { RARITIES, RARITY_LABEL, RARITY_RANK, packChance, useCollectionStore } from '@/stores/collectionStore'
import { formatCoins } from '@/utils/cards'
import { packSounds } from '@/utils/packSounds'
import { usePrefsStore } from '@/stores/prefsStore'

const col = useCollectionStore()
const prefs = usePrefsStore()

/** Joue un son de l'ouverture, sauf si le joueur a coupé le son */
function play(name, ...args) {
  if (prefs.soundOn) packSounds[name](...args)
}

const stage = ref('idle') // idle → reveal → summary
const drawn = ref([])
const index = ref(0)
const flipped = ref(false)
const busy = ref(false)
const message = ref('')

// Réserve qui se recharge (10 max), réserve bonus et packs spéciaux
const available = computed(() => col.status?.available ?? 0)
const bonus = computed(() => col.status?.bonus ?? 0)
const special = computed(() => col.status?.special ?? 0)
const total = computed(() => available.value + bonus.value + special.value)
const max = computed(() => col.status?.max ?? 10)
const current = computed(() => drawn.value[index.value])
const newCount = computed(() => drawn.value.filter((c) => c.isNew).length)
const lastWasGp = computed(() => drawn.value.source?.startsWith('gp'))

// Rappels : la plus belle carte du pack (Légendaire et plus, ou édition vainqueur) pour la vitrine
const showcaseEditor = ref(false)
const showcaseBusy = ref(false)
const showcaseDone = ref(false)
const highlight = computed(() => {
  const best = [...drawn.value]
    .filter((c) => c.edition || RARITY_RANK[c.rarity] >= RARITY_RANK.legendary)
    .sort((a, b) => Boolean(b.edition) - Boolean(a.edition) || RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity])[0]
  return best && !col.showcase.includes(best.id) ? best : null
})
watch(drawn, () => (showcaseDone.value = false))

async function addToShowcase() {
  showcaseBusy.value = true
  try {
    await col.toggleShowcase(highlight.value.id)
    showcaseDone.value = true
  } catch {
    showcaseEditor.value = true
  } finally {
    showcaseBusy.value = false
  }
}

// Profil public à compléter (joueurs avec un pseudo)
const profileLeft = computed(() => {
  const c = col.profile?.completion
  return col.isPlayer && c && !c.rewarded && c.percent < 100 ? c : null
})

// Week-end de course et édition vainqueur
const gp = computed(() => col.gpWeekend)
const gpEndsIn = computed(() => {
  if (!gp.value) return ''
  const min = Math.max(0, Math.round((new Date(gp.value.ends_at).getTime() - (now.value + col.clockOffset)) / 60000))
  return min >= 1440 ? `${Math.floor(min / 1440)} j ${Math.floor((min % 1440) / 60)} h` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`
})
/** Affiche d'époque de ce week-end, si elle existe (uniquement dans le pack GP) */
const gpPoster = computed(() => (gp.value ? col.byId.get(`a-${gp.value.season}-${gp.value.round}`) ?? null : null))
const edition = computed(() => col.status?.edition ?? null)
const editionOwned = computed(() =>
  col.owned.has(edition.value?.card),
)
const editionDriver = computed(() => col.byId.get(edition.value?.card)?.name ?? 'le vainqueur')
const editionUntil = computed(() =>
  edition.value ? new Date(edition.value.until).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '',
)

// Raccourcis : boutique et avancement des quêtes du jour
const shop = computed(() => col.status?.shop ?? { price: 150, daily: 3, left: 0 })
const questsSummary = computed(() => {
  const quests = col.quests?.quests
  if (!quests) return '4 quêtes par jour : Pièces et packs bonus'
  const done = quests.filter((q) => q.claimed).length
  if (col.questsReady) return `${col.questsReady} récompense${col.questsReady > 1 ? 's' : ''} à récupérer`
  return done === 4 ? 'Toutes terminées, reviens demain' : `${done} / 4 terminées`
})

// Compte à rebours vers le prochain pack (heure du serveur)
const now = ref(Date.now())
let timer = null
let refreshing = false
const countdown = computed(() => {
  if (!col.nextPackAt) return '—'
  const s = Math.max(0, Math.round((col.nextPackAt - now.value) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})

async function tick() {
  now.value = Date.now()
  if (col.nextPackAt && now.value >= col.nextPackAt && !refreshing) {
    refreshing = true
    try {
      await col.refreshStatus()
    } finally {
      refreshing = false
    }
  }
}

/** Ouvre un pack de la réserve, ou un pack GP (`gp`) */
async function openPack(gp = false) {
  if (busy.value || !(gp === true ? col.gpPacksToOpen : total.value)) return
  busy.value = true
  message.value = ''
  try {
    // Petite attente minimale : le pack « tremble » avant de s'ouvrir
    const [cards] = await Promise.all([col.open(gp === true), new Promise((r) => setTimeout(r, 650))])
    drawn.value = cards
    index.value = 0
    flipped.value = false
    stage.value = 'reveal'
    play('rip')
  } catch (err) {
    message.value = err.code === 'NO_PACK' ? 'Plus de pack disponible pour le moment.' : "L'ouverture a échoué, réessaie."
    await col.refreshStatus().catch(() => {})
  } finally {
    busy.value = false
  }
}

/** Pack de bienvenue : même révélation qu'un pack, puis les conseils */
async function openWelcome() {
  if (busy.value) return
  busy.value = true
  message.value = ''
  try {
    const [cards] = await Promise.all([col.openWelcome(prefs.favoriteTeamId ?? null), new Promise((r) => setTimeout(r, 650))])
    drawn.value = cards
    index.value = 0
    flipped.value = false
    stage.value = 'reveal'
    play('rip')
  } catch {
    message.value = "L'ouverture a échoué, réessaie."
    await col.refreshStatus().catch(() => {})
  } finally {
    busy.value = false
  }
}

/** Un clic retourne la carte, le suivant passe à la carte suivante */
function advance() {
  if (!flipped.value) {
    flipped.value = true
    play('flip', current.value.rarity)
    return
  }
  if (index.value + 1 < drawn.value.length) {
    flipped.value = false
    index.value++
  } else {
    stage.value = 'summary'
  }
}

/** 0.0499 → « 5 % », 0.00099 → « 0,1 % », au-delà de 99,9 % → « > 99,9 % » */
function formatPercent(x) {
  if (x > 0.999) return '> 99,9 %'
  const pct = x * 100
  const digits = pct >= 10 ? 0 : pct >= 1 ? 1 : 2
  return `${pct.toLocaleString('fr-FR', { maximumFractionDigits: digits })} %`
}

/** « 1 pack sur N » (ou presque tous les packs) */
function packFrequency(rarity) {
  const p = packChance(rarity)
  if (p > 0.9) return 'presque tous les packs'
  const n = 1 / p
  return `1 pack sur ${n.toLocaleString('fr-FR', { maximumFractionDigits: n < 10 ? 1 : 0 })}`
}

function skipToSummary() {
  stage.value = 'summary'
}

function onKey(e) {
  if (stage.value === 'reveal' && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault()
    advance()
  }
}

// Quêtes : leur avancement s'affiche dans le raccourci
watch(
  () => col.ready,
  (ready) => ready && col.loadQuests().catch(() => {}),
  { immediate: true },
)

onMounted(() => {
  col.init()
  timer = setInterval(tick, 1000)
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('keydown', onKey)
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
  gap: 16px;
  margin-top: 6px;
}

.head-links { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

.empty code { font-family: var(--mono); color: var(--text); }

/* ---------- Réserve ---------- */
.reserve {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 28px;
  align-items: center;
  padding: 28px;
}

.stack {
  position: relative;
  width: 170px;
  aspect-ratio: 5 / 7;
}

.pack {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 14px;
  color: #fff;
  background:
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0 4px, transparent 4px 12px),
    linear-gradient(155deg, var(--accent), color-mix(in srgb, var(--accent) 30%, #0b0c0f) 75%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  transform: translate(calc(var(--i) * 7px), calc(var(--i) * -7px)) rotate(calc(var(--i) * 3deg));
  transition: transform 0.3s var(--ease);
}

.pack:not(:last-child) { opacity: 0.6; }
.stack:not(:disabled):hover .pack:last-child { transform: translate(calc(var(--i) * 7px), calc(var(--i) * -7px - 8px)) rotate(-2deg); }
.stack:disabled { cursor: default; }
.stack.empty .pack { filter: grayscale(1) brightness(0.5); }

.stack:disabled:not(.empty) .pack:last-child { animation: shake 0.12s linear infinite; }

@keyframes shake {
  0%, 100% { transform: translate(calc(var(--i) * 7px), calc(var(--i) * -7px)) rotate(-1.5deg); }
  50% { transform: translate(calc(var(--i) * 7px + 2px), calc(var(--i) * -7px)) rotate(1.5deg); }
}

.pack-brand { font-size: 11px; font-weight: 700; letter-spacing: 0.3em; opacity: 0.8; }
.pack-title { font-size: 30px; font-weight: 900; letter-spacing: -0.02em; line-height: 1; }
.pack-sub { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.8; }

.count-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 4px 0 8px;
}

.count { font-size: 46px; font-weight: 700; line-height: 1; }

.gauge {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.gauge span {
  width: 16px;
  height: 7px;
  border-radius: 2px;
  background: var(--surface-3);
}

.gauge span.on { background: var(--accent); box-shadow: 0 0 8px var(--accent-line); }

.timer { font-size: 14px; }

.actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 16px;
}

.btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.pity { font-size: 13px; }
.pity b { color: #e8c15a; }
.message { margin-top: 10px; color: var(--danger); font-size: 14px; }

.shortcuts {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 10px;
}

.shortcut {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--line);
  transition: border-color var(--t), transform var(--t);
}

.shortcut:hover { border-color: var(--accent-line); transform: translateY(-1px); }
.shortcut > .icon:first-child { color: var(--accent); flex-shrink: 0; }
.shortcut.ready { border-color: rgb(232 193 90 / 0.45); background: rgb(232 193 90 / 0.07); }
.sc-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.sc-title { font-weight: 700; }
.sc-text .small { font-size: 13px; }
.sc-arrow { color: var(--text-muted); flex-shrink: 0; }

.sc-badge {
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

.odds { grid-column: 1 / -1; }

.extra-reserves {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 2px;
}

.reserve-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid var(--line-strong);
  background: var(--surface-2);
}

.reserve-chip.bonus { color: #ffe08a; border-color: rgb(232 193 90 / 0.4); background: rgb(232 193 90 / 0.08); }
.reserve-chip.special { color: #d9c2ff; border-color: rgb(168 85 247 / 0.5); background: rgb(168 85 247 / 0.12); }

.source-tag {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 99px;
  color: #ffe08a;
  background: rgb(232 193 90 / 0.12);
}

.source-tag.special { color: #d9c2ff; background: rgb(168 85 247 / 0.16); }
.stack.special .pack { box-shadow: 0 0 22px rgb(168 85 247 / 0.45); }

/* Week-end de course */
.gp-block {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid rgb(225 6 0 / 0.45);
  background: linear-gradient(90deg, rgb(225 6 0 / 0.14), transparent 70%), var(--surface-2);
  text-align: left;
}

.gp-info { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 4px; }
.gp-info p { margin: 0; }
.gp-poster { display: flex; align-items: center; gap: 6px; color: #e8c15a; }

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

.gp-title { font-size: 18px; font-weight: 800; }

.gp-actions { display: flex; flex-direction: column; align-items: stretch; gap: 6px; text-align: center; }
.gp-shop:hover { color: var(--text); }

.edition-line {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  color: #ffe08a;
  border: 1px solid rgb(232 193 90 / 0.35);
  background: rgb(232 193 90 / 0.08);
  text-align: left;
}

.edition-line .icon { flex-shrink: 0; }
.edition-line .link-arrow { margin-left: 6px; }
.edition-line.owned { color: var(--success); border-color: color-mix(in srgb, var(--success) 40%, transparent); background: color-mix(in srgb, var(--success) 8%, transparent); }

.reminder {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin: 0 0 16px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgb(232 193 90 / 0.4);
  background: rgb(232 193 90 / 0.08);
}

.reminder > .icon { color: #ffd65a; flex-shrink: 0; }
.reminder > span { flex: 1; min-width: 200px; }
.reminder .btn { padding: 6px 14px; }
.reminder.done { color: var(--success); border-color: color-mix(in srgb, var(--success) 40%, transparent); background: color-mix(in srgb, var(--success) 8%, transparent); }

.profile-line {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  text-align: left;
  color: var(--text-dim);
  border: 1px dashed var(--accent-line);
  transition: border-color var(--t);
}

.profile-line:hover { border-color: var(--accent); }
.profile-line > .icon:first-child { color: var(--accent); flex-shrink: 0; }
.profile-line > span { flex: 1; }

/* Bienvenue */
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 36px 24px;
  text-align: center;
  border-color: rgb(232 193 90 / 0.4);
  background: radial-gradient(80% 60% at 50% 40%, rgb(232 193 90 / 0.12), transparent 70%), var(--surface);
}

.welcome .title-lg { margin: 0; }
.welcome > p { margin: 0; max-width: 520px; }

.welcome-pack {
  width: 150px;
  aspect-ratio: 5 / 7;
  margin: 8px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 14px;
  color: #ffe08a;
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 0.06) 0 4px, transparent 4px 12px),
    linear-gradient(155deg, #6b5520, #2a2212 70%);
  border: 2px solid #e8c15a;
  box-shadow: 0 18px 40px rgb(0 0 0 / 0.45), 0 0 32px rgb(232 193 90 / 0.35);
  cursor: pointer;
  animation: welcome-float 2.8s var(--ease) infinite;
}

.welcome-pack:disabled { animation: shake 0.12s linear infinite; cursor: default; }
.welcome-pack .pack-title { font-size: 20px; }

@keyframes welcome-float {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-8px) rotate(2deg); }
}

.tips {
  margin: 6px 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 12px;
  width: 100%;
  max-width: 720px;
  text-align: left;
}

.tips li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.tips li > .icon { color: var(--accent); flex-shrink: 0; }
.tips li > span { display: flex; flex-direction: column; gap: 2px; font-size: 14px; }

@media (prefers-reduced-motion: reduce) {
  .welcome-pack { animation: none; }
}

.source-tag.gp { color: #ff8a8a; background: rgb(225 6 0 / 0.16); }

.odds-intro { font-size: 13px; margin: 4px 0 10px; }

.odds-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.odds-table th {
  padding: 8px 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: left;
  color: var(--text-muted);
  border-bottom: 1px solid var(--line);
}

.odds-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
}

.odds-table tr:last-child td { border-bottom: none; }
.odds-table .num { text-align: right; }
.odds-table tbody td:first-child { font-weight: 700; }

.dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  margin-right: 10px;
  border-radius: 50%;
  background: var(--c, #8a8f98);
}

.odds-table .r-rare { --c: #3b82f6; }
.odds-table .r-epic { --c: #a855f7; }
.odds-table .r-legendary { --c: #e8c15a; }
.odds-table .r-mythic { --c: #ff4fd8; }

/* ---------- Révélation ---------- */
.opening {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.reveal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: min(100%, 520px);
}

.reveal-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sound-toggle.quiet {
  display: grid;
  place-items: center;
  padding: 4px;
  color: var(--text-muted);
  transition: color var(--t);
}

.sound-toggle.quiet:hover { color: var(--text); }

.stage-area {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  min-height: min(68vh, 520px);
  cursor: pointer;
}

.current {
  width: min(280px, 68vw);
  position: relative;
  z-index: 1;
}

.burst {
  --c: #8a8f98;
  position: absolute;
  width: min(560px, 120vw);
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--c) 55%, transparent) 0 6deg, transparent 6deg 18deg),
    radial-gradient(circle, color-mix(in srgb, var(--c) 70%, transparent), transparent 62%);
  -webkit-mask-image: radial-gradient(circle, #000 25%, transparent 70%);
  mask-image: radial-gradient(circle, #000 25%, transparent 70%);
  opacity: 0;
  animation: burst 1.2s var(--ease) forwards, rays 14s linear infinite;
  pointer-events: none;
}

.burst.r-common { opacity: 0; animation: none; }
.burst.r-rare { --c: #3b82f6; }
.burst.r-epic { --c: #a855f7; }
.burst.r-legendary { --c: #e8c15a; }
.burst.r-mythic { --c: #ff4fd8; }

@keyframes burst {
  0% { opacity: 0; transform: scale(0.3); }
  30% { opacity: 1; }
  100% { opacity: 0.55; transform: scale(1); }
}

@keyframes rays {
  to { rotate: 360deg; }
}

.deal-enter-active { animation: deal-in 0.45s var(--ease) both; }
.deal-leave-active { animation: deal-out 0.25s ease-in both; }

@keyframes deal-in {
  from { opacity: 0; transform: translateY(60px) scale(0.85) rotate(-4deg); }
}

@keyframes deal-out {
  to { opacity: 0; transform: translate(-40px, 40px) scale(0.6) rotate(-8deg); }
}

.hint { font-size: 14px; margin: 4px 0 18px; }

.tray {
  display: grid;
  grid-template-columns: repeat(5, 64px);
  gap: 10px;
}

.tray-slot {
  aspect-ratio: 5 / 7;
  border-radius: 6px;
  border: 1px dashed var(--line-strong);
}

.tray-slot.done { border: none; animation: rise 0.4s var(--ease) both; }

/* ---------- Récapitulatif ---------- */
.summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.summary-head .actions { margin-top: 0; }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.summary-card { animation: rise 0.5s var(--ease) both; }

@media (max-width: 860px) {
  .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .reserve {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    padding: 20px 16px;
  }
  .count-row,
  .actions { justify-content: center; }
  .gauge { margin-left: 0; width: 100%; justify-content: center; }
  .gp-actions { width: 100%; }
  .odds-table { font-size: 12px; }
  .odds-table th,
  .odds-table td { padding: 8px 6px; }
  .odds-table th:nth-child(2),
  .odds-table td:nth-child(2) { display: none; }
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tray { grid-template-columns: repeat(5, 48px); gap: 6px; }
}
</style>
