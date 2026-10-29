<template>
  <div class="page achievements-page">
    <header class="container page-head">
      <div class="eyebrow">Cartes</div>
      <h1 class="title-lg">Succès</h1>
      <p class="dim">Des objectifs à long terme : chaque succès débloqué rapporte des Pièces, et tu peux en afficher 3 en badges sur ton profil.</p>
    </header>

    <div class="container body">
      <p v-if="!col.configured" class="card empty">La collection n'est pas encore configurée.</p>
      <p v-else-if="error && !data" class="card empty">
        Impossible de charger les succès. <button class="link-arrow" @click="load">Réessayer</button>
      </p>
      <p v-else-if="!data" class="card empty muted">Chargement…</p>

      <template v-else>
        <!-- Résumé et badges du profil -->
        <section class="card summary">
          <div class="sum-count">
            <span class="mono big">{{ unlockedCount }}</span>
            <span class="muted">/ {{ list.length }} succès</span>
            <span v-if="col.achievementsReady" class="ready-chip">
              {{ col.achievementsReady }} récompense{{ col.achievementsReady > 1 ? 's' : '' }} à récupérer
            </span>
          </div>
          <div class="sum-badges">
            <span class="muted small">Sur ton profil :</span>
            <template v-for="i in 3" :key="i">
              <AchievementBadge v-if="badgeItems[i - 1]" :achievement="badgeItems[i - 1]" :size="36" />
              <span v-else class="badge-slot" title="Emplacement libre"></span>
            </template>
            <span class="muted small hint">
              <template v-if="col.isPlayer">Touche l'étoile d'un succès débloqué pour l'afficher.</template>
              <template v-else>Visible quand tu auras un pseudo.</template>
            </span>
          </div>
          <p v-if="message" class="small" :class="messageError ? 'error' : 'success'">
            {{ message }}
            <button v-if="suggest && !badges.includes(suggest.id) && badges.length < 3" class="link-arrow" :disabled="busy" @click="toggleBadge(suggest)">
              Afficher « {{ suggest.title }} » sur mon profil →
            </button>
          </p>
        </section>

        <!-- Filtres -->
        <div class="filters" role="tablist">
          <button
            v-for="f in [{ id: 'all', label: 'Tous' }, ...FAMILIES]"
            :key="f.id"
            role="tab"
            class="chip"
            :class="{ on: family === f.id }"
            :aria-selected="family === f.id"
            @click="family = f.id"
          >
            {{ f.label }}
            <span class="mono chip-count">{{ familyCount(f.id) }}</span>
          </button>
        </div>

        <!-- Succès -->
        <div class="grid">
          <article
            v-for="a in shown"
            :key="a.id"
            class="ach card"
            :class="{ unlocked: a.unlocked, ready: a.unlocked && !a.claimed_at, [`tier-${a.tier}`]: true }"
          >
            <div class="ach-top">
              <AchievementBadge :achievement="a" :locked="!a.unlocked" :size="42" />
              <span class="tier mono">{{ TIER_LABEL[a.tier] }}</span>
              <button
                v-if="a.unlocked"
                class="star"
                :class="{ on: badges.includes(a.id) }"
                :disabled="busy"
                :aria-pressed="badges.includes(a.id)"
                :title="badges.includes(a.id) ? 'Retirer de mon profil' : 'Afficher sur mon profil'"
                :aria-label="`${badges.includes(a.id) ? 'Retirer' : 'Afficher'} « ${a.title} » sur mon profil`"
                @click="toggleBadge(a)"
              >
                <Icon name="star" :size="16" />
              </button>
            </div>
            <div class="ach-title">{{ a.title }}</div>
            <div class="muted small">{{ a.description }}</div>

            <div class="ach-foot">
              <button v-if="a.unlocked && !a.claimed_at" class="btn claim" :disabled="busy" @click="claim(a)">
                Récupérer {{ formatCoins(a.coins) }} <Icon name="coin" :size="14" class="coin" />
              </button>
              <span v-else-if="a.claimed_at" class="done small"><Icon name="check" :size="14" /> Obtenu le {{ formatDate(a.claimed_at) }}</span>
              <template v-else>
                <span class="bar"><span :style="{ width: `${(a.progress / a.target) * 100}%` }"></span></span>
                <span class="muted small progress">
                  <span class="mono">{{ formatCoins(a.progress) }} / {{ formatCoins(a.target) }}</span>
                  · {{ formatCoins(a.coins) }} Pièces
                </span>
              </template>
            </div>
          </article>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import AchievementBadge from '@/components/cards/AchievementBadge.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { FAMILIES, TIER_LABEL } from '@/utils/achievements'
import { economyMessage, formatCoins } from '@/utils/cards'

const col = useCollectionStore()
const data = computed(() => col.achievements)
const list = computed(() => data.value?.achievements ?? [])
const badges = computed(() => data.value?.badges ?? [])
const badgeItems = computed(() => badges.value.map((id) => list.value.find((a) => a.id === id)).filter(Boolean))
const unlockedCount = computed(() => list.value.filter((a) => a.unlocked).length)
const error = ref(false)

// Filtre par famille ; récompenses à récupérer d'abord, puis les plus avancés
const family = ref('all')
const rank = (a) => (a.unlocked && !a.claimed_at ? 0 : !a.unlocked ? 1 : 2)
const shown = computed(() =>
  list.value
    .filter((a) => family.value === 'all' || a.family === family.value)
    .sort((a, b) => rank(a) - rank(b) || b.progress / b.target - a.progress / a.target || a.tier - b.tier),
)
const familyCount = (id) => {
  const items = id === 'all' ? list.value : list.value.filter((a) => a.family === id)
  return `${items.filter((a) => a.unlocked).length}/${items.length}`
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (iso) => dateFormat.format(new Date(iso))

const busy = ref(false)
const message = ref('')
const messageError = ref(false)

async function run(action, success) {
  busy.value = true
  message.value = ''
  messageError.value = false
  try {
    message.value = success(await action())
  } catch (err) {
    messageError.value = true
    message.value = economyMessage(err)
  } finally {
    busy.value = false
  }
}

// Après une récompense : proposer d'afficher le succès sur le profil
const suggest = ref(null)
const claim = async (a) => {
  await run(() => col.claimAchievement(a.id), (coins) => `« ${a.title} » : +${formatCoins(coins)} Pièces !`)
  suggest.value = messageError.value ? null : a
}

function toggleBadge(a) {
  const on = badges.value.includes(a.id)
  if (!on && badges.value.length >= 3) {
    messageError.value = true
    message.value = '3 badges maximum : retire-en un avant d’en ajouter un autre.'
    return
  }
  const next = on ? badges.value.filter((id) => id !== a.id) : [...badges.value, a.id]
  suggest.value = null
  run(() => col.setBadges(next), () => (on ? 'Badge retiré de ton profil.' : 'Badge ajouté à ton profil.'))
}

async function load() {
  error.value = false
  try {
    await col.loadAchievements()
  } catch {
    error.value = true
  }
}

onMounted(() => {
  if (!col.ready) col.init()
  load()
})
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
  gap: 18px;
}

.small { font-size: 13px; }
.error { color: var(--danger); }
.success { color: var(--success); }
.coin { color: #e8c15a; }
.empty { padding: 24px; }

.summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 24px;
  padding: 18px 22px;
}

.summary > p { flex-basis: 100%; margin: 0; }

.sum-count { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; }
.big { font-size: 34px; font-weight: 800; line-height: 1; }

.ready-chip {
  align-self: center;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  color: #ffe08a;
  background: rgb(232 193 90 / 0.14);
}

.sum-badges { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.hint { flex-basis: 100%; text-align: right; }

.badge-slot {
  width: 36px;
  height: 36px;
  border-radius: 28%;
  border: 1.5px dashed var(--line-strong);
}

.filters { display: flex; flex-wrap: wrap; gap: 8px; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 99px;
  border: 1px solid var(--line);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-dim);
  background: var(--surface);
  cursor: pointer;
}

.chip.on { color: var(--on-accent); background: var(--accent); border-color: var(--accent); }
.chip-count { font-size: 11px; opacity: 0.7; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr));
  gap: 12px;
}

.ach {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
}

.ach:not(.unlocked) .ach-title { color: var(--text-dim); }
.ach.ready { border-color: rgb(232 193 90 / 0.55); background: linear-gradient(160deg, rgb(232 193 90 / 0.08), transparent 60%), var(--surface); }

.ach-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.tier { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
.tier-3 .tier { color: #e8c15a; }
.tier-4 .tier { color: #ff9be8; }

.star {
  margin-left: auto;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--line);
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
}

.star.on { color: #ffd65a; border-color: rgb(232 193 90 / 0.6); background: rgb(232 193 90 / 0.12); }
.star:disabled { cursor: default; }

.ach-title { font-weight: 800; font-size: 15px; }

.ach-foot { margin-top: auto; padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }

.bar { display: block; height: 5px; border-radius: 9px; background: var(--surface-3); overflow: hidden; }
.bar span { display: block; height: 100%; background: var(--accent); }

.claim { align-self: flex-start; padding: 6px 12px; font-size: 13px; }
.btn:disabled { opacity: 0.55; cursor: default; }
.done { display: inline-flex; align-items: center; gap: 5px; color: var(--success); }

@media (max-width: 640px) {
  .summary { padding: 16px; }
  .hint { text-align: left; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .ach { padding: 12px; }
}
</style>
