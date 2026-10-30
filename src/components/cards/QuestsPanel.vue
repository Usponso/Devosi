<template>
  <section class="quests" aria-labelledby="quests-title">
    <header class="q-head">
      <div>
        <h2 id="quests-title" class="title-md">Quêtes du jour</h2>
        <p class="muted small q-sub">
          <Icon name="clock" :size="13" /> Nouvelles quêtes dans <span class="mono">{{ resetIn }}</span>
          <template v-if="data?.reroll_available"> · 1 relance disponible</template>
        </p>
      </div>
      <div class="streak" :aria-label="`Série de ${streak} jour${streak > 1 ? 's' : ''} sur 7`">
        <span class="muted small">Série : {{ streak }} jour{{ streak > 1 ? 's' : '' }}</span>
        <span class="days">
          <span v-for="d in 7" :key="d" class="day" :class="{ on: d <= streak, gift: d === 7 }">
            <Icon v-if="d === 7" name="gift" :size="12" />
            <template v-else>{{ d }}</template>
          </span>
        </span>
      </div>
    </header>

    <p v-if="error" class="error small">{{ error }}</p>
    <p v-else-if="!data" class="muted small">Chargement des quêtes…</p>

    <template v-else>
      <ul class="q-list">
        <li v-for="q in data.quests" :key="`${q.slot}-${q.id}`" class="quest" :class="[`tier-${q.tier}`, { done: q.progress >= q.target, claimed: q.claimed }]">
          <span class="q-icon"><Icon :name="questIcon(q)" :size="18" /></span>
          <div class="q-body">
            <div class="q-tier">{{ TIERS[q.tier] }}</div>
            <div class="q-name">
              {{ questLabel(q) }}
              <router-link v-if="ATELIER_KINDS.includes(q.kind) && !q.claimed && q.progress < q.target" to="/atelier" class="q-link">Atelier →</router-link>
            </div>
            <div v-if="questHint(q)" class="q-hint">{{ questHint(q) }}</div>
            <span class="q-bar"><span :style="{ width: `${Math.min(1, q.progress / q.target) * 100}%` }"></span></span>
          </div>
          <div class="q-side">
            <span class="q-reward">
              <template v-if="q.packs"><Icon name="package" :size="14" /> {{ q.packs }} pack bonus</template>
              <template v-else><span class="mono">{{ q.coins }}</span> <Icon name="coin" :size="14" class="coin" /></template>
            </span>
            <span v-if="q.claimed" class="q-claimed"><Icon name="check" :size="14" /> Récupéré</span>
            <button v-else-if="q.progress >= q.target" class="btn q-claim" :disabled="busy" @click="claim(q)">Récupérer</button>
            <span v-else class="q-progress">
              <span class="mono muted">{{ q.progress }} / {{ q.target }}</span>
              <button
                v-if="data.reroll_available"
                class="q-reroll"
                :disabled="busy"
                :title="'Remplacer cette quête (1 fois par jour)'"
                :aria-label="`Remplacer la quête : ${questLabel(q)}`"
                @click="reroll(q)"
              >
                <Icon name="rotate" :size="14" />
              </button>
            </span>
          </div>
          <transition name="pop">
            <span v-if="flash[q.slot]" class="q-flash">{{ flash[q.slot] }}</span>
          </transition>
        </li>
      </ul>

      <div class="bonus" :class="{ done: data.bonus_claimed }">
        <Icon name="gift" :size="22" />
        <div>
          <div class="bonus-title">{{ data.bonus_claimed ? 'Bonus du jour récupéré' : 'Les 4 quêtes terminées' }}</div>
          <div class="muted small">
            <template v-if="bonusMessage">{{ bonusMessage }}</template>
            <template v-else>+1 pack bonus et un jour de série en plus · {{ claimedCount }} / 4</template>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { PICKABLE_TEAMS } from '@/data/teams'
import { RARITY_LABEL, useCollectionStore } from '@/stores/collectionStore'
import { economyMessage } from '@/utils/cards'

const TIERS = { 1: 'Facile', 2: 'Moyenne', 3: 'Difficile' }
const TYPE_LABELS = { driver: ['carte Pilote', 'cartes Pilote'], team: ['carte Écurie', 'cartes Écurie'], gp: ['carte Grand Prix', 'cartes Grand Prix'], moment: ['carte Moment', 'cartes Moment'], masterpiece: ["carte Chef-d'œuvre", "cartes Chef-d'œuvre"], poster: ['Affiche', 'Affiches'] }
const ICONS = { open: 'package', recycle: 'recycle', new: 'cards', cards: 'cards', type: 'album', rarity: 'star', craft: 'hammer', trade_up: 'gauge', upgrade: 'star', team: 'flag', decade: 'calendar' }
const ATELIER_KINDS = ['recycle', 'craft', 'trade_up', 'upgrade']

const col = useCollectionStore()
const data = computed(() => col.quests)
const busy = ref(false)
const error = ref('')
const flash = reactive({})
const bonusMessage = ref('')

const streak = computed(() => data.value?.streak ?? 0)
const claimedCount = computed(() => data.value?.quests.filter((q) => q.claimed).length ?? 0)

const plural = (n, [one, many]) => `${n} ${n > 1 ? many : one}`

/** Nom d'écurie : la grille actuelle, sinon la carte Écurie du catalogue */
function teamName(id) {
  return PICKABLE_TEAMS.find((t) => t.id === id)?.name ?? col.byId.get(`t-${id}`)?.name ?? id
}

function questLabel(q) {
  const n = q.target
  switch (q.kind) {
    case 'open': return `Ouvrir ${plural(n, ['pack', 'packs'])}`
    case 'recycle': return `Recycler ${plural(n, ['doublon', 'doublons'])}`
    case 'new': return `Obtenir ${plural(n, ['nouvelle carte', 'nouvelles cartes'])}`
    case 'cards': return `Obtenir ${plural(n, ['carte', 'cartes'])}`
    case 'type': return `Obtenir ${n > 1 ? n : 'une'} ${TYPE_LABELS[q.param]?.[n > 1 ? 1 : 0] ?? 'carte'}`
    case 'rarity': return `Obtenir une ${RARITY_LABEL[q.param]} ou mieux`
    case 'craft': return 'Fabriquer une carte à l’Atelier'
    case 'trade_up': return 'Faire une « Vitesse supérieure »'
    case 'upgrade': return 'Débloquer une finition Chrome ou Or'
    case 'team': return q.param ? `Obtenir une carte ${teamName(q.param)}` : 'Obtenir une carte Écurie'
    case 'decade': {
      const y = Number(q.param)
      return `Obtenir une carte des années ${y < 2000 ? y % 100 : y}`
    }
    default: return q.id
  }
}

/** Précision sur les cartes qui comptent, pour les quêtes qui ne sont pas évidentes */
function questHint(q) {
  if (q.claimed || q.progress >= q.target) return ''
  if (q.kind === 'team' && q.param) return `Pilote (son écurie principale), carte Écurie ou Grand Prix gagné par ${teamName(q.param)}`
  if (q.kind === 'decade') return 'Pilote ou écurie qui y a débuté, Grand Prix ou Moment de cette décennie'
  return ''
}

const questIcon = (q) => ICONS[q.kind] ?? 'star'

// Compte à rebours jusqu'au renouvellement (heure du serveur)
const now = ref(Date.now())
const resetIn = computed(() => {
  if (!data.value) return '—'
  const ms = new Date(data.value.resets_at).getTime() - (now.value + col.clockOffset)
  const min = Math.max(0, Math.ceil(ms / 60000))
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`
})

let timer = null
let reloading = false
onMounted(() => {
  load()
  timer = setInterval(() => {
    now.value = Date.now()
    // Minuit UTC passé : nouvelles quêtes
    if (data.value && !reloading && new Date(data.value.resets_at).getTime() <= now.value + col.clockOffset) {
      reloading = true
      load().finally(() => (reloading = false))
    }
  }, 15_000)
})
onUnmounted(() => clearInterval(timer))

async function load() {
  error.value = ''
  try {
    await col.loadQuests()
  } catch (err) {
    console.error('[Quêtes]', err)
    error.value = 'Impossible de charger les quêtes pour le moment.'
  }
}

async function run(task) {
  busy.value = true
  error.value = ''
  try {
    await task()
  } catch (err) {
    error.value = economyMessage(err)
  } finally {
    busy.value = false
  }
}

const claim = (q) =>
  run(async () => {
    const { reward, bonus } = await col.claimQuest(q.slot)
    flash[q.slot] = reward.packs ? `+${reward.packs} pack bonus` : `+${reward.coins} Pièces`
    setTimeout(() => delete flash[q.slot], 1800)
    if (bonus) {
      bonusMessage.value = bonus.special
        ? `+1 pack bonus · 7 jours de série : un pack spécial avec une Épique garantie t’attend !`
        : `+1 pack bonus · série de ${bonus.streak} jour${bonus.streak > 1 ? 's' : ''}`
    }
  })

const reroll = (q) => run(() => col.rerollQuest(q.slot))
</script>

<style scoped>
.quests {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.q-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.small { font-size: 13px; }
.error { color: var(--danger); }

.q-sub {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
}

.streak {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.days { display: flex; gap: 4px; }

.day {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  border: 1px solid var(--line-strong);
}

.day.on {
  color: #2a1c00;
  background: #e8c15a;
  border-color: #e8c15a;
}

.day.gift { border-style: dashed; color: #e8c15a; }
.day.gift.on { color: #2a1c00; border-style: solid; }

.q-list { list-style: none; }

.quest {
  --tc: #7dd87d;
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-top: 1px solid var(--line);
}

.quest.tier-2 { --tc: #5aa9ff; }
.quest.tier-3 { --tc: #b48cff; }

.q-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  color: var(--tc);
  background: color-mix(in srgb, var(--tc) 14%, transparent);
}

.q-tier {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tc);
}

.q-name {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-weight: 700;
  font-size: 15px;
}

.q-link { font-size: 12px; font-weight: 600; color: var(--text-muted); }
.q-link:hover { color: var(--text); }

.q-bar {
  display: block;
  height: 6px;
  margin-top: 8px;
  border-radius: 3px;
  background: var(--surface-2);
  overflow: hidden;
}

.q-bar > span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--tc);
  transition: width 0.6s var(--ease);
}

.quest.claimed { opacity: 0.55; }

.q-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 110px;
}

.q-reward {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
}

.coin { color: #e8c15a; }
.q-claim { padding: 6px 14px; font-size: 13px; }
.q-claimed { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: var(--success); }
.q-progress { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }

.q-reroll {
  display: grid;
  place-items: center;
  padding: 4px;
  border-radius: 6px;
  color: var(--text-muted);
  transition: color var(--t), background var(--t);
}

.q-reroll:hover:not(:disabled) { color: var(--text); background: var(--surface-2); }

.q-flash {
  position: absolute;
  right: 0;
  top: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 800;
  color: #2a1c00;
  background: #e8c15a;
  pointer-events: none;
}

.pop-enter-active { animation: pop-in 0.35s var(--ease); }
.pop-leave-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.pop-leave-to { opacity: 0; transform: translateY(-12px); }

@keyframes pop-in {
  from { opacity: 0; transform: translateY(8px) scale(0.8); }
}

.bonus {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px dashed var(--line-strong);
  color: var(--text);
}

.bonus.done {
  border-style: solid;
  border-color: rgb(232 193 90 / 0.5);
  background: rgb(232 193 90 / 0.08);
}

.bonus > .icon { color: #e8c15a; flex-shrink: 0; }
.bonus-title { font-weight: 700; }

@media (max-width: 560px) {
  .quest { grid-template-columns: auto minmax(0, 1fr); }
  .q-side {
    grid-column: 2;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    min-width: 0;
  }
  .streak { align-items: flex-start; }
}
.q-hint { margin-top: 2px; font-size: 12px; color: var(--text-muted); }
</style>
