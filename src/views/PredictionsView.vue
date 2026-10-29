<template>
  <div class="page predictions-page">
    <header class="container page-head">
      <div class="eyebrow">Saison {{ data?.season ?? '' }}</div>
      <h1 class="title-lg">Pronostics</h1>
      <p class="dim">Avant chaque Grand Prix, pronostique le podium et la pole. Tes points te rapportent des Pièces, des packs et peut-être l'édition vainqueur.</p>
    </header>

    <div class="container body">
      <p v-if="!col.configured" class="card empty">La collection n'est pas encore configurée.</p>
      <p v-else-if="error && !data" class="card empty">
        Impossible de charger les pronostics. <button class="link-arrow" @click="load">Réessayer</button>
      </p>
      <p v-else-if="!data" class="card empty muted">Chargement…</p>

      <template v-else>
        <!-- Prochaine course -->
        <section v-if="next" class="card next">
          <div class="next-head">
            <div class="next-title">
              <div class="eyebrow">Manche {{ next.round }} · {{ next.open ? 'Pronostics ouverts' : 'Pronostics fermés' }}</div>
              <h2 class="title-md">{{ next.name }}</h2>
              <p class="muted small">
                Qualifs {{ formatDate(next.quali_at) }} · Course {{ formatDate(next.race_at) }}
              </p>
            </div>
            <CircuitMap :circuit-id="next.circuit" small class="next-map" />
          </div>

          <p v-if="next.open" class="closing">
            <Icon name="clock" :size="14" /> Fermeture dans <b class="mono">{{ closesIn }}</b> · au début des qualifs
          </p>

          <!-- Récompense du bon vainqueur -->
          <div class="edition-promo">
            <Icon name="star" :size="18" />
            <p>
              <b>Trouve le vainqueur, reçois sa carte en édition limitée.</b>
              Si ton P1 gagne la course, tu reçois sa carte avec un tampon doré « Vainqueur », en récupérant tes gains après la course.
              Les autres joueurs ne peuvent la trouver que dans les packs, pendant 7 jours.
            </p>
          </div>

          <!-- Formulaire -->
          <form v-if="next.open" class="picks" @submit.prevent="save">
            <div class="pick-group">
              <div class="pick-label">Podium (ordre exact)</div>
              <label v-for="(slot, i) in PODIUM" :key="slot" class="pick">
                <span class="pos mono">P{{ i + 1 }}</span>
                <span class="dot" :style="{ background: driverColor(form[slot]) }"></span>
                <select v-model="form[slot]" :aria-label="`Pilote en P${i + 1}`">
                  <option value="" disabled>Choisir un pilote</option>
                  <option v-for="d in drivers" :key="d.id" :value="d.id" :disabled="takenElsewhere(slot, d.id)">
                    {{ d.name }}{{ d.team ? ` · ${d.team}` : '' }}
                  </option>
                </select>
              </label>
            </div>
            <div class="pick-group">
              <div class="pick-label">Pole position</div>
              <label class="pick">
                <span class="pos mono"><Icon name="timer" :size="14" /></span>
                <span class="dot" :style="{ background: driverColor(form.pole) }"></span>
                <select v-model="form.pole" aria-label="Poleman">
                  <option value="" disabled>Choisir un pilote</option>
                  <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}{{ d.team ? ` · ${d.team}` : '' }}</option>
                </select>
              </label>
              <ul class="scale muted small">
                <li>Pilote à la bonne place : <b>10 pts</b></li>
                <li>Sur le podium, mauvaise place : <b>4 pts</b></li>
                <li>Pole exacte : <b>10 pts</b> · Podium parfait : <b>+15</b></li>
                <li>1 pt = 5 Pièces · podium parfait = 1 pack</li>
                <li>Bon vainqueur = sa carte en édition vainqueur</li>
              </ul>
            </div>
            <div class="picks-foot">
              <span class="muted small">
                <template v-if="next.mine">Pronostic enregistré, modifiable jusqu'à la fermeture.</template>
                <template v-else>{{ next.players }} joueur{{ next.players > 1 ? 's ont' : ' a' }} déjà pronostiqué.</template>
              </span>
              <button class="btn" :disabled="saving || !complete || !dirty">
                {{ saving ? 'Enregistrement…' : next.mine ? 'Modifier mon pronostic' : 'Valider mon pronostic' }}
              </button>
            </div>
            <p v-if="message" class="small" :class="messageError ? 'error' : 'success'">{{ message }}</p>
          </form>

          <!-- Fermé : en attente des résultats -->
          <div v-else class="closed">
            <template v-if="next.mine">
              <div class="pick-label">Ton pronostic</div>
              <ul class="lines">
                <li v-for="(slot, i) in PODIUM" :key="slot"><span class="pos mono">P{{ i + 1 }}</span>{{ driverName(next.mine[slot]) }}</li>
                <li><span class="pos mono">Pole</span>{{ driverName(next.mine.pole) }}</li>
              </ul>
              <p class="muted small">Résultats et points dans l'heure qui suit l'arrivée.</p>
            </template>
            <p v-else class="muted">Tu n'as pas pronostiqué cette course. Rendez-vous au prochain Grand Prix !</p>
          </div>
        </section>
        <section v-else class="card empty muted">La saison est terminée : rendez-vous l'an prochain pour de nouveaux pronostics.</section>

        <!-- Gains récupérés -->
        <transition name="pop">
          <section v-if="claimed" class="card claimed">
            <div class="claimed-text">
              <div class="title-md">+{{ formatCoins(claimed.coins) }} Pièces<template v-if="claimed.packs"> et +{{ claimed.packs }} pack bonus</template></div>
              <p v-if="claimed.edition" class="muted">Tu avais trouvé le vainqueur : l'édition vainqueur rejoint ta collection.</p>
            </div>
            <F1Card v-if="claimed.edition" :card="claimed.edition" :is-new="claimed.edition.isNew" class="claimed-card" />
            <button class="link-arrow" @click="claimed = null">Fermer</button>
          </section>
        </transition>

        <div class="columns">
          <!-- Mes résultats -->
          <section class="card history">
            <div class="section-head">
              <h2 class="title-md">Mes résultats {{ data.season }}</h2>
              <span class="total"><b class="mono">{{ data.total }}</b> pts<template v-if="data.rank"> · {{ data.rank }}<sup>e</sup> / {{ data.players }}</template></span>
            </div>
            <p v-if="!played.length" class="muted small">Tes courses pronostiquées apparaîtront ici avec tes points.</p>
            <ul v-else class="races">
              <li v-for="race in played" :key="race.round" class="race" :class="{ ready: race.mine.points != null && !race.mine.claimed }">
                <div class="race-head">
                  <span class="race-name">{{ race.name }}</span>
                  <span class="race-points mono">{{ race.mine.points }} pts</span>
                </div>
                <ul class="lines compact">
                  <li v-for="line in breakdown(race)" :key="line.label" :class="{ hit: line.points > 0 }">
                    <span class="pos mono">{{ line.label }}</span>
                    <span v-if="line.pick" class="line-name">{{ driverName(line.pick) }}</span>
                    <span v-if="line.actual" class="muted small">{{ line.pick ? '→ ' : '' }}{{ line.actual }}</span>
                    <span class="line-pts mono">{{ line.points ? `+${line.points}` : '0' }}</span>
                  </li>
                </ul>
                <button v-if="!race.mine.claimed && !race.mine.points" class="btn btn-ghost claim" :disabled="busy" @click="claim(race)">
                  Pas de point cette fois · OK
                </button>
                <button v-else-if="!race.mine.claimed" class="btn claim" :disabled="busy" @click="claim(race)">
                  Récupérer {{ formatCoins(race.mine.points * 5) }} <Icon name="coin" :size="14" class="coin" />
                  <template v-if="isPerfect(race)"> + 1 pack</template>
                </button>
              </li>
            </ul>
          </section>

          <!-- Classement -->
          <section class="card ranking">
            <div class="section-head">
              <h2 class="title-md">Classement de la saison</h2>
              <div class="tabs" role="tablist">
                <button role="tab" :aria-selected="!friendsTab" :class="{ on: !friendsTab }" @click="friendsTab = false">Général</button>
                <button role="tab" :aria-selected="friendsTab" :class="{ on: friendsTab }" @click="friendsTab = true">Amis</button>
              </div>
            </div>
            <p v-if="!col.isPlayer" class="muted small hint">Sauvegarde ta collection et choisis un pseudo pour apparaître au classement.</p>
            <p v-if="rankingLoading && !ranking.length" class="muted small">Chargement…</p>
            <p v-else-if="!ranking.length" class="muted small">Aucun point marqué pour l'instant.</p>
            <ol v-else class="rows">
              <li v-for="p in ranking" :key="p.username" class="row" :class="{ me: p.is_me }">
                <span class="rank mono">{{ p.rank }}</span>
                <router-link :to="`/joueurs/${p.username}`" class="who">
                  <PlayerAvatar :card-id="p.avatar" :finish="p.avatar_finish" :username="p.username" :team="p.team" :size="32" />
                  <span class="who-name">{{ p.username }}</span>
                </router-link>
                <span class="muted small perfect" :title="'Podiums parfaits'">{{ p.perfect ? `${p.perfect} parfait${p.perfect > 1 ? 's' : ''}` : '' }}</span>
                <span class="pts mono">{{ p.points }}</span>
              </li>
            </ol>
            <p class="muted small rewards"><Icon name="gift" :size="14" /> Fin de saison : 10, 6 et 3 packs pour le top 3.</p>
          </section>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import CircuitMap from '@/components/CircuitMap.vue'
import F1Card from '@/components/cards/F1Card.vue'
import PlayerAvatar from '@/components/cards/PlayerAvatar.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { fetchPredictionLeaderboard } from '@/services/collection'
import { fetchDriverStandings, fetchSeasonDrivers } from '@/services/jolpica'
import { economyMessage, formatCoins } from '@/utils/cards'

const PODIUM = ['p1', 'p2', 'p3']

const col = useCollectionStore()
const data = computed(() => col.predictions)
const next = computed(() => data.value?.next ?? null)
const played = computed(() => (data.value?.history ?? []).filter((r) => r.mine))
const error = ref(false)

// Pilotes de la saison (classement, sinon liste des engagés avant la 1re course)
const drivers = ref([])
const driverById = computed(() => new Map(drivers.value.map((d) => [d.id, d])))

async function loadDrivers() {
  try {
    const { standings } = await fetchDriverStandings('current')
    drivers.value = standings.length
      ? standings.map((d) => ({ id: d.id, name: d.name, team: d.team, color: d.color }))
      : (await fetchSeasonDrivers('current')).map((d) => ({ id: d.id, name: d.name }))
  } catch {
    drivers.value = []
  }
}

const driverName = (id) => driverById.value.get(id)?.name ?? col.byId.get(`d-${id}`)?.name ?? id ?? '—'
const driverColor = (id) => driverById.value.get(id)?.color ?? 'var(--line)'

// Formulaire
const form = reactive({ p1: '', p2: '', p3: '', pole: '' })
const saving = ref(false)
const message = ref('')
const messageError = ref(false)
const complete = computed(() => PODIUM.every((s) => form[s]) && form.pole)
const dirty = computed(() => {
  const mine = next.value?.mine
  return !mine || [...PODIUM, 'pole'].some((k) => mine[k] !== form[k])
})
const takenElsewhere = (slot, id) => PODIUM.some((s) => s !== slot && form[s] === id)

watch(
  () => next.value?.mine,
  (mine) => Object.assign(form, mine ? { p1: mine.p1, p2: mine.p2, p3: mine.p3, pole: mine.pole } : { p1: '', p2: '', p3: '', pole: '' }),
  { immediate: true },
)

async function save() {
  saving.value = true
  message.value = ''
  messageError.value = false
  try {
    await col.savePrediction(next.value.season, next.value.round, { ...form })
    message.value = 'Pronostic enregistré !'
  } catch (err) {
    messageError.value = true
    message.value = economyMessage(err)
  } finally {
    saving.value = false
  }
}

// Fermeture des pronostics (heure du serveur)
const now = ref(Date.now())
let timer = null
const closesIn = computed(() => {
  if (!next.value) return ''
  const min = Math.max(0, Math.ceil((new Date(next.value.quali_at).getTime() - (now.value + col.clockOffset)) / 60000))
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  return d ? `${d} j ${String(h).padStart(2, '0')} h` : `${h} h ${String(min % 60).padStart(2, '0')}`
})

const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const formatDate = (iso) => dateFormat.format(new Date(iso))

/** Détail des points d'une course (même barème que public._prediction_points) */
function breakdown(race) {
  const { mine, result } = race
  const podium = PODIUM.map((s) => result[s])
  const lines = PODIUM.map((slot, i) => {
    const pick = mine[slot]
    const actual = podium.indexOf(pick)
    return {
      label: `P${i + 1}`,
      pick,
      points: actual === i ? 10 : actual >= 0 ? 4 : 0,
      actual: actual === i ? '' : actual >= 0 ? `P${actual + 1}` : 'hors podium',
    }
  })
  lines.push({ label: 'Pole', pick: mine.pole, points: mine.pole === result.pole ? 10 : 0, actual: mine.pole === result.pole ? '' : driverName(result.pole) })
  if (isPerfect(race)) lines.push({ label: 'Bonus', pick: null, points: 15, actual: 'podium parfait' })
  return lines
}

const isPerfect = ({ mine, result }) => PODIUM.every((s) => mine[s] === result[s])

// Gains
const busy = ref(false)
const claimed = ref(null)

async function claim(race) {
  busy.value = true
  try {
    const res = await col.claimPrediction(race.season, race.round)
    claimed.value = res.coins || res.packs || res.edition ? res : null
  } catch (err) {
    message.value = economyMessage(err)
    messageError.value = true
  } finally {
    busy.value = false
  }
}

// Classement
const friendsTab = ref(false)
const ranking = ref([])
const rankingLoading = ref(false)

async function loadRanking() {
  rankingLoading.value = true
  try {
    ranking.value = await fetchPredictionLeaderboard(data.value?.season ?? null, friendsTab.value)
  } catch {
    ranking.value = []
  } finally {
    rankingLoading.value = false
  }
}
watch(friendsTab, loadRanking)
watch(() => data.value?.total, loadRanking)

async function load() {
  error.value = false
  try {
    await col.loadPredictions()
  } catch {
    error.value = true
  }
}

onMounted(async () => {
  timer = setInterval(() => (now.value = Date.now()), 30000)
  loadDrivers()
  await col.loadCatalog()
  if (!col.ready) col.init()
  await load()
})

onUnmounted(() => clearInterval(timer))
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
  gap: 20px;
}

.small { font-size: 13px; }
.error { color: var(--danger); }
.success { color: var(--success); }
.coin { color: #e8c15a; }
.empty { padding: 24px; }

/* Prochaine course */
.next {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px 24px;
}

.next-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.next-title .title-md { margin: 4px 0 2px; }
.next-map { width: 120px; height: 84px; flex-shrink: 0; }

.closing {
  align-self: flex-start;
  margin: 0;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  color: var(--accent);
  background: var(--accent-soft);
}

.picks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 18px 24px;
}

.closing .icon { vertical-align: -2px; margin-right: 4px; }
.closing b { white-space: nowrap; }

.edition-promo {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-dim);
  border: 1px solid rgb(232 193 90 / 0.35);
  background: rgb(232 193 90 / 0.08);
}

.edition-promo .icon { flex-shrink: 0; margin-top: 2px; color: #e8c15a; }
.edition-promo p { margin: 0; }
.edition-promo b { color: #ffe08a; }

.pick-group { display: flex; flex-direction: column; gap: 8px; }

.pick-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.pick {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px 0 10px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.pick:focus-within { border-color: var(--accent-line); }

.pos {
  width: 30px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pick select {
  flex: 1;
  min-width: 0;
  padding: 11px 6px;
  border: none;
  font: inherit;
  font-size: 15px;
  color: var(--text);
  background: transparent;
  cursor: pointer;
}

.pick select:focus { outline: none; }
.pick option { color: #111; }

.scale {
  margin: 4px 0 0;
  padding-left: 18px;
  line-height: 1.7;
}

.scale b { color: var(--text-dim); }

.picks-foot {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.picks > p { grid-column: 1 / -1; margin: 0; }
.btn:disabled { opacity: 0.55; cursor: default; }

.closed { display: flex; flex-direction: column; gap: 8px; }

.lines {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lines li { display: flex; align-items: center; gap: 8px; }

.lines.compact { gap: 3px; font-size: 14px; }
.lines.compact li { color: var(--text-dim); }
.lines.compact .pos { width: 42px; }
.lines.compact li.hit { color: var(--text); }
.line-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.line-pts { margin-left: auto; font-weight: 700; color: var(--text-muted); }
.hit .line-pts { color: var(--success); }

/* Gains */
.claimed {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 18px 22px;
  border-color: rgb(232 193 90 / 0.4);
  background: linear-gradient(90deg, rgb(232 193 90 / 0.12), transparent 70%), var(--surface);
}

.claimed-text { flex: 1; min-width: 200px; }
.claimed-card { width: 130px; flex: none; }

/* Résultats et classement */
.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
  gap: 20px;
  align-items: start;
}

.history, .ranking { padding: 20px 22px; }

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 14px;
}

.total { color: var(--text-dim); font-size: 14px; }
.total b { font-size: 18px; color: var(--text); }

.races {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.race {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.race.ready { border-color: rgb(232 193 90 / 0.5); }

.race-head { display: flex; justify-content: space-between; gap: 8px; font-weight: 700; }
.race-points { color: var(--accent); }
.claim { align-self: flex-start; padding: 7px 14px; font-size: 14px; }

.tabs {
  display: inline-flex;
  padding: 3px;
  border-radius: 99px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.tabs button {
  padding: 5px 12px;
  border: none;
  border-radius: 99px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
}

.tabs button.on { color: var(--on-accent); background: var(--accent); }

.hint { margin: 0 0 10px; }

.rows {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px;
  border-bottom: 1px solid var(--line);
}

.row:last-child { border-bottom: none; }
.row.me { background: var(--accent-soft); border-radius: 8px; }

.rank { width: 28px; text-align: center; font-weight: 700; color: var(--text-muted); }
.who { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; color: var(--text); }
.who-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.perfect { white-space: nowrap; }
.pts { font-weight: 700; min-width: 40px; text-align: right; }

.rewards {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 14px 0 0;
}

.pop-enter-active { transition: opacity 0.3s, transform 0.3s; }
.pop-enter-from { opacity: 0; transform: translateY(8px); }

@media (max-width: 640px) {
  .next, .history, .ranking { padding: 18px 16px; }
  .next-map { width: 84px; height: 60px; }
  .perfect { display: none; }
}
</style>
