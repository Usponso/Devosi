<template>
  <div class="page fantasy-page">
    <header class="container page-head">
      <nav class="subnav" :aria-label="$t('predictions.subnav')">
        <router-link to="/pronostics" class="subnav-link">{{ $t('nav.predictions') }}</router-link>
        <router-link to="/pronostics/ecurie" class="subnav-link">
          {{ $t('predictions.fantasy') }} <span v-if="col.fantasyReady" class="subnav-dot" :aria-label="$t('predictions.rewardReady')"></span>
        </router-link>
      </nav>
      <div class="eyebrow">{{ $t('home.season', { year: data?.season ?? '' }) }}</div>
      <h1 class="title-lg">{{ $t('predictions.fantasy') }}</h1>
      <p class="dim">{{ $t('fantasy.intro') }}</p>
    </header>

    <div class="container body">
      <p v-if="!col.configured" class="card empty">{{ $t('common.notConfigured') }}</p>
      <p v-else-if="error && !data" class="card empty">
        {{ $t('fantasy.loadError') }} <button class="link-arrow" @click="load">{{ $t('common.retry') }}</button>
      </p>
      <p v-else-if="!data" class="card empty muted">{{ $t('common.loading') }}</p>

      <template v-else>
        <!-- Prochaine course : composition -->
        <section v-if="next" class="card next">
          <div class="next-head">
            <div>
              <div class="eyebrow">{{ $t('common.round', { n: next.round }) }}</div>
              <h2 class="title-md">{{ gpLabel(next.name) }}</h2>
              <p class="muted small">{{ $t('fantasy.entered', next.players) }}</p>
            </div>
            <div class="lock" :class="{ closed: !next.open }">
              <Icon :name="next.open ? 'clock' : 'lock'" :size="16" />
              <span v-if="next.open"><i18n-t keypath="fantasy.locksIn" scope="global"><template #time><b class="mono">{{ closesIn }}</b></template></i18n-t></span>
              <span v-else>{{ $t('fantasy.locked') }}</span>
            </div>
          </div>

          <div class="slots">
            <div v-for="slot in SLOTS" :key="slot.key" class="slot" :class="{ active: picking === slot.key }">
              <div class="slot-label">
                <span>{{ slot.label }}</span>
                <span v-if="slot.captain && form.captain === slot.captain" class="captain-tag">{{ $t('fantasy.captainX2') }}</span>
              </div>
              <button
                class="slot-body"
                :disabled="!next.open"
                :aria-label="form[slot.key] ? $t('fantasy.change', { name: col.byId.get(form[slot.key])?.name }) : $t('fantasy.choose', { slot: slot.label })"
                @click="togglePicker(slot.key)"
              >
                <F1Card
                  v-if="form[slot.key] && col.byId.get(form[slot.key])"
                  :card="col.byId.get(form[slot.key])"
                  :finish="col.finishes.get(form[slot.key]) ?? 0"
                  :interactive="false"
                  :zoomable="false"
                />
                <span v-else class="slot-empty"><Icon name="plus" :size="22" />{{ slot.hint }}</span>
                <span v-if="form[slot.key] && !col.owned.has(form[slot.key])" class="slot-warn">{{ $t('fantasy.notOwned') }}</span>
              </button>
              <button
                v-if="slot.captain"
                class="captain-btn"
                :class="{ on: form.captain === slot.captain }"
                :disabled="!next.open"
                @click="form.captain = slot.captain"
              >
                <Icon name="star" :size="13" /> {{ form.captain === slot.captain ? $t('fantasy.captain') : $t('fantasy.makeCaptain') }}
              </button>
              <p v-else class="slot-note muted">{{ slot.note }}</p>
            </div>
          </div>

          <!-- Sélecteur de carte -->
          <transition name="pop">
            <div v-if="picking && next.open" ref="pickerEl" class="picker">
              <div class="picker-head">
                <b>{{ SLOTS.find((s) => s.key === picking).pickTitle }}</b>
                <input v-model="query" class="search" type="search" :placeholder="$t('fantasy.searchPlaceholder')" :aria-label="$t('common.searchCard')" />
                <button class="link-arrow" @click="picking = null">{{ $t('common.close') }}</button>
              </div>
              <p v-if="!choices.length" class="muted small">
                {{ query ? $t('atelier.noMatch') : picking === 'team' ? $t('fantasy.noTeam') : $t('fantasy.noCard') }}
              </p>
              <div v-else class="picker-grid">
                <button v-for="c in choices.slice(0, PICK_LIMIT)" :key="c.id" class="pick" :class="{ sel: form[picking] === c.id }" @click="choose(c.id)">
                  <F1Card :card="c" :finish="col.finishes.get(c.id) ?? 0" :interactive="false" :zoomable="false" />
                  <span class="pick-meta muted small">
                    <span v-if="col.finishes.get(c.id)" class="pick-finish">{{ FINISH_LABEL[col.finishes.get(c.id)] }}</span>
                    <span v-else>{{ RARITY_LABEL[c.rarity] }}</span>
                    <span v-if="picking === 'legend'" class="mono">+{{ legendBase(c) }}</span>
                  </span>
                </button>
              </div>
              <p v-if="choices.length > PICK_LIMIT" class="muted small">{{ $t('atelier.more', { n: choices.length - PICK_LIMIT }) }}</p>
            </div>
          </transition>

          <div v-if="next.open" class="actions">
            <p class="muted small">
              <template v-if="next.mine">{{ $t('fantasy.saved') }}</template>
              <template v-else>{{ $t('fantasy.gridOnly') }}</template>
            </p>
            <div class="actions-btns">
              <button v-if="previous && !next.mine" class="btn btn-ghost" :disabled="saving" @click="reusePrevious">{{ $t('fantasy.reuse') }}</button>
              <button class="btn" :disabled="!complete || !dirty || saving" @click="save">
                {{ next.mine ? $t('fantasy.update') : $t('fantasy.submit') }}
              </button>
            </div>
          </div>
          <p v-if="message" class="small" :class="messageError ? 'error' : 'success'">{{ message }}</p>
        </section>
        <section v-else class="card empty muted">{{ $t('fantasy.seasonOver') }}</section>

        <!-- Barème -->
        <section class="card rules">
          <h2 class="title-md">{{ $t('fantasy.scale') }}</h2>
          <div class="rules-grid">
            <div class="rule"><b>{{ $t('nav.drivers') }}</b>{{ $t('fantasy.ruleDrivers') }}</div>
            <div class="rule"><b>{{ $t('cardType.team') }}</b>{{ $t('fantasy.ruleTeam') }}</div>
            <div class="rule"><b>{{ $t('fantasy.legend') }}</b>{{ $t('fantasy.ruleLegend') }}</div>
            <div class="rule"><b>{{ $t('fantasy.finishes') }}</b>{{ $t('fantasy.ruleFinishes') }}</div>
          </div>
          <p class="muted small rewards"><Icon name="gift" :size="14" /> {{ $t('fantasy.rewards') }}</p>
        </section>

        <!-- Récompense récupérée -->
        <transition name="pop">
          <section v-if="claimed" class="card claimed">
            <Icon name="gift" :size="22" class="coin" />
            <div class="title-md">+{{ $t('common.coins', claimed.coins) }}<template v-if="claimed.packs"> {{ $t('fantasy.andPacks', claimed.packs) }}</template></div>
          </section>
        </transition>

        <div class="cols">
          <!-- Mes résultats -->
          <section class="card history">
            <div class="section-head">
              <h2 class="title-md">{{ $t('predictions.myResults', { year: data.season }) }}</h2>
              <span class="total"><b class="mono">{{ fmt(data.total) }}</b> {{ $t('common.ptsUnit') }}<template v-if="data.rank"> · {{ $t('predictions.rank', { rank: data.rank, n: data.players }) }}</template></span>
            </div>
            <p v-if="!data.history.length" class="muted small">{{ $t('fantasy.noneYet') }}</p>
            <ol v-else class="races">
              <li v-for="race in data.history" :key="race.round" class="race" :class="{ ready: !race.mine.claimed }">
                <div class="race-head">
                  <span>{{ gpLabel(race.name) }}</span>
                  <span class="race-points mono">{{ $t('common.pts', { n: fmt(race.mine.points) }) }}</span>
                </div>
                <div class="muted small">{{ $t('predictions.rank', { rank: race.mine.rank, n: race.mine.players }) }} · {{ rewardLabel(race.mine.reward) }}</div>
                <ul class="lines">
                  <li v-for="line in race.mine.breakdown" :key="line.card" class="line">
                    <span class="line-name">
                      {{ col.byId.get(line.card)?.name ?? line.card }}
                      <span v-if="line.captain" class="captain-tag">C</span>
                    </span>
                    <span class="muted small line-detail">{{ lineDetail(line) }}</span>
                    <span class="mono line-pts">{{ fmt(line.points) }}</span>
                  </li>
                </ul>
                <button v-if="!race.mine.claimed" class="btn claim" :disabled="busy" @click="claim(race)">
                  <Icon name="gift" :size="15" /> {{ $t('common.claim') }} · {{ rewardLabel(race.mine.reward) }}
                </button>
              </li>
            </ol>
          </section>

          <!-- Classement -->
          <section class="card ranking">
            <div class="section-head">
              <h2 class="title-md">{{ $t('fantasy.ranking') }}</h2>
              <div class="tabs-row">
                <div v-if="lastRace" class="tabs" role="tablist">
                  <button role="tab" :aria-selected="scope === 'race'" :class="{ on: scope === 'race' }" @click="scope = 'race'">{{ gpShort(gpLabel(lastRace.name)) }}</button>
                  <button role="tab" :aria-selected="scope === 'season'" :class="{ on: scope === 'season' }" @click="scope = 'season'">{{ $t('fantasy.season') }}</button>
                </div>
                <div class="tabs" role="tablist">
                  <button role="tab" :aria-selected="!friendsTab" :class="{ on: !friendsTab }" @click="friendsTab = false">{{ $t('predictions.general') }}</button>
                  <button role="tab" :aria-selected="friendsTab" :class="{ on: friendsTab }" @click="friendsTab = true">{{ $t('account.friends') }}</button>
                </div>
              </div>
            </div>
            <p v-if="!col.isPlayer" class="muted small hint">{{ $t('predictions.needProfile') }}</p>
            <p v-if="rankingLoading && !ranking.length" class="muted small">{{ $t('common.loading') }}</p>
            <p v-else-if="!ranking.length" class="muted small">{{ $t('fantasy.noRanking') }}</p>
            <ol v-else class="rows">
              <li v-for="p in ranking" :key="p.username" class="row" :class="{ me: p.is_me }">
                <span class="rank mono">{{ p.rank }}</span>
                <router-link :to="`/joueurs/${p.username}`" class="who">
                  <PlayerAvatar :card-id="p.avatar" :finish="p.avatar_finish" :username="p.username" :team="p.team" :size="32" />
                  <span class="who-name">{{ p.username }}</span>
                </router-link>
                <span v-if="scope === 'season'" class="muted small">{{ p.races }} GP</span>
                <span class="pts mono">{{ fmt(p.points) }}</span>
              </li>
            </ol>
          </section>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { intlLocale } from '@/i18n'
import Icon from '@/components/Icon.vue'
import F1Card from '@/components/cards/F1Card.vue'
import PlayerAvatar from '@/components/cards/PlayerAvatar.vue'
import { RARITY_LABEL, RARITY_RANK, useCollectionStore } from '@/stores/collectionStore'
import { fetchFantasyLeaderboard } from '@/services/collection'
import { economyMessage, gpLabel, gpShort } from '@/utils/cards'

const { t } = useI18n()
const SLOTS = [
  { key: 'driver1', label: t('cardType.driver'), captain: 1, hint: t('fantasy.pickDriver'), pickTitle: t('fantasy.gridDriver') },
  { key: 'driver2', label: t('cardType.driver'), captain: 2, hint: t('fantasy.pickDriver'), pickTitle: t('fantasy.gridDriver') },
  { key: 'team', label: t('cardType.team'), hint: t('fantasy.pickTeam'), note: t('fantasy.teamNote'), pickTitle: t('fantasy.gridTeam') },
  { key: 'legend', label: t('fantasy.legend'), hint: t('fantasy.pickCard'), note: t('fantasy.legendNote'), pickTitle: t('fantasy.anyCard') },
]
const FINISH_LABEL = { 1: t('fantasy.chromeMult'), 2: t('fantasy.goldMult') }
const LEGEND_POINTS = { common: 3, rare: 5, epic: 8, legendary: 12, mythic: 20 }
const PICK_LIMIT = 48

const col = useCollectionStore()
const data = computed(() => col.fantasy)
const next = computed(() => data.value?.next ?? null)
const lastRace = computed(() => data.value?.history?.[0] ?? null)
const previous = computed(() => lastRace.value?.mine ?? null)
const error = ref(false)

const fmt = (n) => Number(n ?? 0).toLocaleString(intlLocale(), { maximumFractionDigits: 1 })
const legendBase = (card) => LEGEND_POINTS[card.rarity] + (card.printRun ? 5 : 0)
const rewardLabel = (r) => (r ? `${t('common.coins', r.coins)}${r.packs ? ` + ${t('fantasy.packs', r.packs)}` : ''}` : '')

/** Détail d'une ligne de score (même barème que public._fantasy_score) */
function lineDetail(line) {
  const MULT = { 1.25: t('fantasy.multChrome'), 1.5: t('fantasy.multGold') }
  const mult = Number(line.mult) === 0 ? t('fantasy.noLonger') : MULT[Number(line.mult)] ?? ''
  let base = ''
  if (line.slot === 'driver') {
    const d = line.detail
    const parts = [d.pos ? `P${d.pos} (${fmt(d.race)})` : t('fantasy.unclassified')]
    if (d.pole) parts.push(t('fantasy.pole'))
    if (d.gained) parts.push(t('fantasy.gained', d.gained))
    base = parts.join(' + ')
    if (line.captain) base += t('fantasy.captainBonus')
  } else if (line.slot === 'team') {
    base = `${t('common.pts', { n: fmt(line.base) })}${line.detail.scorers >= 2 ? t('fantasy.bothScored') : ''}`
  } else {
    base = `${RARITY_LABEL[line.detail.rarity]}${line.detail.numbered ? t('fantasy.numbered') : ''} (${fmt(line.base)})`
  }
  return [base, mult].filter(Boolean).join(' ')
}

// Composition
const form = reactive({ driver1: '', driver2: '', captain: 1, team: '', legend: '' })
const picking = ref(null)
const query = ref('')
const saving = ref(false)
const message = ref('')
const messageError = ref(false)

watch(
  () => next.value?.mine,
  (mine) =>
    Object.assign(form, mine
      ? { driver1: mine.driver1, driver2: mine.driver2, captain: mine.captain, team: mine.team, legend: mine.legend }
      : { driver1: '', driver2: '', captain: 1, team: '', legend: '' }),
  { immediate: true },
)

const complete = computed(() => SLOTS.every((s) => form[s.key]))
const dirty = computed(() => {
  const mine = next.value?.mine
  return !mine || ['driver1', 'driver2', 'captain', 'team', 'legend'].some((k) => mine[k] !== form[k])
})

/** Grille actuelle : pilotes et écuries de l'album de la saison */
const grid = computed(() => {
  const album = col.albums.find((a) => a.id === `grille-${data.value?.season}`)
  return new Set(album?.cards ?? [])
})

const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const choices = computed(() => {
  const slot = picking.value
  if (!slot) return []
  const others = new Set(SLOTS.filter((s) => s.key !== slot).map((s) => form[s.key]).filter(Boolean))
  const words = normalize(query.value).split(/\s+/).filter(Boolean)
  const value = (c) => (col.finishes.get(c.id) ?? 0) * 10 - RARITY_RANK[c.rarity]
  return [...col.owned.keys()]
    .map((id) => col.byId.get(id))
    .filter((c) => {
      if (!c || others.has(c.id)) return false
      if (slot === 'team' ? c.type !== 'team' || !grid.value.has(c.id) : slot !== 'legend' && (c.type !== 'driver' || !grid.value.has(c.id))) return false
      if (!words.length) return true
      const text = normalize(`${c.name} ${c.sub ?? ''}`)
      return words.every((w) => text.includes(w))
    })
    .sort((a, b) => (slot === 'legend' ? legendBase(b) - legendBase(a) : value(b) - value(a)) || a.name.localeCompare(b.name))
})

const pickerEl = ref(null)

function togglePicker(key) {
  picking.value = picking.value === key ? null : key
  query.value = ''
  // Le sélecteur s'ouvre sous les emplacements : on l'amène à l'écran
  if (picking.value) nextTick(() => pickerEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
}

function choose(id) {
  form[picking.value] = id
  picking.value = null
}

function reusePrevious() {
  const p = previous.value
  Object.assign(form, { driver1: p.driver1, driver2: p.driver2, captain: p.captain, team: p.team, legend: p.legend })
}

async function save() {
  saving.value = true
  message.value = ''
  messageError.value = false
  try {
    await col.saveLineup(next.value.season, next.value.round, { ...form })
    message.value = t('fantasy.savedMsg')
  } catch (err) {
    messageError.value = true
    message.value = economyMessage(err)
  } finally {
    saving.value = false
  }
}

// Verrouillage (heure du serveur)
const now = ref(Date.now())
let timer = null
const closesIn = computed(() => {
  if (!next.value) return ''
  const min = Math.max(0, Math.ceil((new Date(next.value.quali_at).getTime() - (now.value + col.clockOffset)) / 60000))
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  return d ? t('packs.daysHours', { d, h: String(h).padStart(2, '0') }) : `${h} h ${String(min % 60).padStart(2, '0')}`
})

// Récompenses
const busy = ref(false)
const claimed = ref(null)

async function claim(race) {
  busy.value = true
  try {
    claimed.value = await col.claimFantasy(race.season, race.round)
  } catch (err) {
    message.value = economyMessage(err)
    messageError.value = true
  } finally {
    busy.value = false
  }
}

// Classement : dernière course notée ou saison
const scope = ref('race')
const friendsTab = ref(false)
const ranking = ref([])
const rankingLoading = ref(false)

async function loadRanking() {
  rankingLoading.value = true
  try {
    const round = scope.value === 'race' && lastRace.value ? lastRace.value.round : null
    ranking.value = await fetchFantasyLeaderboard(data.value?.season ?? null, round, friendsTab.value)
  } catch {
    ranking.value = []
  } finally {
    rankingLoading.value = false
  }
}
watch([scope, friendsTab, () => lastRace.value?.round, () => data.value?.total], loadRanking)

async function load() {
  error.value = false
  try {
    await col.loadFantasy()
  } catch {
    error.value = true
  }
}

onMounted(async () => {
  timer = setInterval(() => (now.value = Date.now()), 30000)
  await col.loadCatalog()
  if (!col.ready) await col.init()
  await load()
  loadRanking()
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.page-head { padding-top: 32px; padding-bottom: 20px; }
.page-head .title-lg { margin: 6px 0 6px; }

.subnav { display: flex; gap: 6px; margin-bottom: 18px; flex-wrap: wrap; }

.subnav-link {
  position: relative;
  padding: 7px 14px;
  border-radius: 99px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.subnav-link.router-link-exact-active { color: var(--on-accent); background: var(--accent); border-color: transparent; }

.subnav-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-left: 4px;
  border-radius: 50%;
  background: #e8c15a;
  vertical-align: middle;
}

.body { display: flex; flex-direction: column; gap: 20px; }
.small { font-size: 13px; }
.error { color: var(--danger); }
.success { color: var(--success); }
.coin { color: #e8c15a; }
.empty { padding: 24px; }

/* Composition */
.next { padding: 20px 22px; display: flex; flex-direction: column; gap: 18px; }
.next-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.next-head .title-md { margin: 2px 0; }

.lock {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 12px;
  font-size: 14px;
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
}

.lock b { font-size: 16px; }
.lock.closed { background: var(--surface-2); border-color: var(--line); color: var(--text-muted); }

.slots { display: grid; grid-template-columns: repeat(4, minmax(0, 190px)); gap: 16px; }

.slot { display: flex; flex-direction: column; gap: 8px; min-width: 0; }

.slot-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.captain-tag {
  padding: 1px 7px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.04em;
  color: #1a1206;
  background: #e8c15a;
}

.slot-body {
  position: relative;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 12px;
}

.slot-body:disabled { cursor: default; }
.slot.active .slot-body { outline: 3px solid #e8c15a; outline-offset: 3px; }

.slot-empty {
  aspect-ratio: 5 / 7;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 2px dashed var(--line);
  font-size: 13px;
  color: var(--text-muted);
}

.slot-body:not(:disabled):hover .slot-empty { border-color: var(--accent); color: var(--text); }

.slot-warn {
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--danger);
}

.captain-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 99px;
  border: 1px solid var(--line);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--surface-2);
  cursor: pointer;
}

.captain-btn.on { color: #1a1206; background: #e8c15a; border-color: transparent; }
.slot-note { margin: 0; font-size: 12px; text-align: center; }

.picker { display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line); }
.picker-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.search {
  flex: 1;
  min-width: 140px;
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  font: inherit;
  font-size: 14px;
  color: var(--text);
  background: var(--surface);
}

.picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 12px; }

.pick {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  color: inherit;
}

.pick.sel :deep(.f1card) { outline: 3px solid #e8c15a; outline-offset: 2px; border-radius: 8px; }
.pick-meta { display: flex; justify-content: space-between; gap: 4px; }
.pick-finish { color: #e8c15a; font-weight: 700; }

.actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.actions p { margin: 0; }
.actions-btns { display: flex; gap: 8px; flex-wrap: wrap; }

/* Barème */
.rules { padding: 20px 22px; }
.rules .title-md { margin: 0 0 12px; }
.rules-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.rule { padding: 12px 14px; border-radius: 12px; background: var(--surface-2); font-size: 14px; line-height: 1.45; color: var(--text-dim); }
.rule > b:first-child { display: block; margin-bottom: 4px; color: var(--text); }
.hl { color: #e8c15a; }
.rewards { display: flex; align-items: center; gap: 6px; margin: 14px 0 0; }

.claimed { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-color: rgb(232 193 90 / 0.5); }

/* Résultats et classement */
.cols { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; align-items: start; }
.history, .ranking { padding: 20px 22px; }

.section-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px 12px; margin-bottom: 14px; }
.total { color: var(--text-dim); font-size: 14px; }
.total b { font-size: 18px; color: var(--text); }

.races { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }

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

.lines { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.line { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 10px; font-size: 14px; }
.line-name { font-weight: 600; display: flex; align-items: center; gap: 6px; }
.line-detail { grid-column: 1; grid-row: 2; }
.line-pts { grid-column: 2; grid-row: 1 / 3; align-self: center; font-weight: 700; }
.claim { align-self: flex-start; padding: 7px 14px; font-size: 14px; }

.tabs-row { display: flex; gap: 8px; flex-wrap: wrap; }

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

.rows { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; }
.row { display: flex; align-items: center; gap: 10px; padding: 8px 6px; border-bottom: 1px solid var(--line); }
.row:last-child { border-bottom: none; }
.row.me { background: var(--accent-soft); border-radius: 8px; }
.rank { width: 28px; text-align: center; font-weight: 700; color: var(--text-muted); }
.who { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; color: var(--text); }
.who-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pts { font-weight: 700; min-width: 40px; text-align: right; }

.pop-enter-active { transition: opacity 0.3s, transform 0.3s; }
.pop-enter-from { opacity: 0; transform: translateY(8px); }

@media (max-width: 860px) {
  .cols { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .next, .rules, .history, .ranking { padding: 18px 16px; }
  .slots { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
