<template>
  <section v-if="daily" class="daily">
    <!-- Série de connexion -->
    <div class="card streak">
      <div class="head">
        <Icon name="flame" :size="24" class="flame" :class="{ lit: daily.streak > 0 }" />
        <div class="title">
          <b>{{ daily.streak > 0 ? `${daily.streak} jour${daily.streak > 1 ? 's' : ''} d'affilée` : 'Lance ta série' }}</b>
          <span class="muted small">Série de connexion<template v-if="daily.best > 1"> · record {{ daily.best }} jours</template></span>
        </div>
        <span v-if="daily.jokers" class="joker" :title="`${daily.jokers} joker${daily.jokers > 1 ? 's' : ''} : protège${daily.jokers > 1 ? 'nt' : ''} ta série si tu rates un jour`">
          <Icon name="shield" :size="14" /> {{ daily.jokers }}
        </span>
      </div>

      <ol class="week">
        <li v-for="(reward, i) in REWARDS" :key="i" :class="dayClass(i + 1)">
          <span class="d">J{{ i + 1 }}</span>
          <b v-if="reward"><span class="mono">{{ reward }}</span></b>
          <b v-else><Icon name="package" :size="14" /></b>
        </li>
      </ol>

      <button v-if="!daily.claimed" class="btn" :disabled="busy" @click="claim">
        <Icon :name="daily.day === 7 ? 'package' : 'coin'" :size="16" />
        {{ daily.day === 7 ? 'Récupérer mon pack' : `Récupérer ${REWARDS[daily.day - 1]} Pièces` }}
      </button>
      <p v-else class="small done-line"><Icon name="check" :size="14" /> {{ claimedLine }}</p>
      <p v-if="streakMessage" class="small" :class="streakError ? 'error' : 'accent'">{{ streakMessage }}</p>
    </div>

    <!-- Carte mystère -->
    <div class="card mystery">
      <div class="head">
        <Icon name="cards" :size="22" class="muted" />
        <div class="title">
          <b>Carte mystère du jour</b>
          <span class="muted small">{{ mysteryHint }}</span>
        </div>
      </div>

      <div class="slots">
        <template v-if="reveal">
          <div v-for="(card, i) in reveal.cards" :key="i" class="slot" :class="{ won: i === reveal.slot, other: i !== reveal.slot }">
            <F1Card :card="card" :is-new="i === reveal.slot && card.isNew" :zoomable="i === reveal.slot" :interactive="i === reveal.slot" />
          </div>
        </template>
        <template v-else>
          <button
            v-for="i in 3"
            :key="i"
            class="slot face"
            :class="{ spent: !daily.mystery }"
            :disabled="!daily.mystery || busy"
            :aria-label="`Retourner la carte ${i}`"
            @click="flip(i - 1)"
          >
            <span class="back-logo"><span>D</span>EVOSI</span>
            <span class="q">?</span>
          </button>
        </template>
      </div>
      <p class="muted small odds">Commune 78 % · Rare 18 % · Épique 3,5 % · Légendaire 0,5 %</p>
      <p v-if="mysteryError" class="small error">{{ mysteryError }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import F1Card from './F1Card.vue'
import { RARITY_LABEL, useCollectionStore } from '@/stores/collectionStore'
import { economyMessage } from '@/utils/cards'

// Récompenses de la semaine (Pièces) ; le 7e jour donne un pack bonus
const REWARDS = [20, 30, 40, 50, 60, 80, 0]

const col = useCollectionStore()
const daily = computed(() => col.status?.daily ?? null)
const busy = ref(false)
const streakMessage = ref('')
const streakError = ref(false)
const mysteryError = ref('')
const reveal = ref(null)

/** Jour de la semaine : déjà récupéré, celui d'aujourd'hui, ou à venir */
function dayClass(n) {
  const d = daily.value
  if (n < d.day || (n === d.day && d.claimed)) return 'done'
  return n === d.day ? 'today' : ''
}

const claimedLine = computed(() => {
  const d = daily.value
  if (d.day === 6) return 'Récupéré. Demain : un pack offert.'
  if (d.day === 7) return 'Semaine complète ! Une nouvelle commence demain.'
  return `Récupéré. Demain : ${REWARDS[d.day]} Pièces.`
})

async function claim() {
  busy.value = true
  streakMessage.value = ''
  streakError.value = false
  try {
    const r = await col.claimLoginStreak()
    const parts = [r.pack ? '+1 pack bonus' : `+${r.coins} Pièces`]
    if (r.pack) parts.push('et 1 joker')
    if (r.jokers_used) parts.push(`(${r.jokers_used} joker${r.jokers_used > 1 ? 's' : ''} utilisé${r.jokers_used > 1 ? 's' : ''} pour sauver ta série)`)
    streakMessage.value = parts.join(' ')
  } catch (err) {
    streakError.value = true
    streakMessage.value = economyMessage(err)
  } finally {
    busy.value = false
  }
}

async function flip(slot) {
  busy.value = true
  mysteryError.value = ''
  try {
    reveal.value = await col.openMystery(slot)
  } catch (err) {
    mysteryError.value = economyMessage(err)
  } finally {
    busy.value = false
  }
}

const mysteryHint = computed(() => {
  if (reveal.value) {
    const won = reveal.value.cards[reveal.value.slot]
    return `${won.name} (${RARITY_LABEL[won.rarity]}) rejoint ta collection. Les deux autres : ce que tu aurais pu avoir.`
  }
  return daily.value.mystery ? 'Retourne une carte : elle rejoint ta collection.' : `Déjà retournée aujourd’hui · nouvelle dans ${resetsIn.value}`
})

// Compte à rebours jusqu'à minuit (heure du serveur)
const now = ref(Date.now())
let timer = null
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 30000)))
onBeforeUnmount(() => clearInterval(timer))
const resetsIn = computed(() => {
  const min = Math.max(0, Math.round((new Date(daily.value.resets_at).getTime() - (now.value + col.clockOffset)) / 60000))
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`
})
</script>

<style scoped>
.daily {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.daily .card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
}

.head { display: flex; align-items: center; gap: 10px; }
.title { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.title b { font-size: 16px; }

.flame { color: var(--text-muted); }
.flame.lit { color: #ff9a3c; filter: drop-shadow(0 0 6px rgb(255 154 60 / 0.5)); }

.joker {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  color: #9cc8ff;
  background: rgb(46 139 255 / 0.14);
}

.week {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.week li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 7px 0;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
}

.week .d { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; }
.week b { font-size: 13px; color: var(--text-dim); display: flex; }
.week li:last-child { border-style: dashed; border-color: var(--gold); }
.week li:last-child b { color: var(--gold); }

.week li.done { background: rgb(61 220 132 / 0.12); border-color: rgb(61 220 132 / 0.5); border-style: solid; color: var(--success); }
.week li.done b { color: var(--success); }
.week li.today { background: rgb(255 154 60 / 0.14); border: 2px solid #ff9a3c; color: #ff9a3c; }
.week li.today b { color: #ffb370; }

.done-line { display: flex; align-items: center; gap: 6px; color: var(--success); }
.accent { color: var(--gold); }
.error { color: var(--danger); }

.slots {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.slot { aspect-ratio: 5 / 7; min-width: 0; }

.slot.face {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  border: 1px solid var(--line-strong);
  background:
    repeating-linear-gradient(135deg, rgb(255 255 255 / 0.04) 0 6px, transparent 6px 14px),
    radial-gradient(circle at 50% 40%, #2a0a0d, #0b0c0f 70%);
  color: var(--text);
  cursor: pointer;
  transition: transform var(--t), border-color var(--t);
}

.slot.face:hover:not(:disabled) { transform: translateY(-4px); border-color: var(--accent-line); }
.slot.face.spent { opacity: 0.4; cursor: default; }
.back-logo { font-size: 13px; font-weight: 900; }
.back-logo span { color: var(--accent); }
.q { font-size: 26px; font-weight: 900; color: var(--text-muted); }

.slot.won { animation: pop 0.5s var(--ease); }
.slot.other { opacity: 0.4; filter: grayscale(0.6); }

@keyframes pop {
  0% { transform: rotateY(90deg) scale(0.9); }
  100% { transform: none; }
}

.odds { margin-top: -4px; }

@media (prefers-reduced-motion: reduce) {
  .slot.won { animation: none; }
}
</style>
