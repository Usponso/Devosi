<template>
  <transition name="fade">
    <div v-if="open" class="backdrop" @click.self="close">
      <div class="dialog card" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <button class="close" aria-label="Fermer" @click="close"><Icon name="x" /></button>

        <!-- Aperçu -->
        <div class="preview">
          <PlayerAvatar
            :card-id="profile.avatar"
            :finish="col.finishes.get(profile.avatar) ?? 0"
            :username="profile.username"
            :team="profile.team"
            :size="72"
          />
          <div class="preview-text">
            <div class="eyebrow">Mon profil</div>
            <h2 id="profile-title" class="title-md">@{{ profile.username }}</h2>
            <div v-if="currentTitle" class="title-badge">{{ currentTitle }}</div>
          </div>
        </div>

        <div class="tabs" role="tablist">
          <button v-for="t in TABS" :key="t.id" role="tab" class="tab" :class="{ active: tab === t.id }" :aria-selected="tab === t.id" @click="tab = t.id">
            <Icon :name="t.icon" :size="15" /> {{ t.label }}
          </button>
        </div>

        <!-- Avatar -->
        <section v-if="tab === 'avatar'" class="panel">
          <p class="muted small">La photo d'une de tes cartes, dans un cadre aux couleurs de sa rareté. Les finitions Chrome et Or brillent aussi.</p>
          <div class="filters">
            <div class="chips">
              <button v-for="t in CARD_TYPES" :key="t.id" class="chip" :class="{ active: type === t.id }" @click="type = t.id">{{ t.label }}</button>
            </div>
            <input v-model.trim="search" class="input" type="search" placeholder="Rechercher" aria-label="Rechercher une carte" />
          </div>
          <div class="avatar-grid">
            <button class="avatar-pick" :class="{ selected: !profile.avatar }" :disabled="busy" @click="save('avatar', null)">
              <PlayerAvatar :username="profile.username" :team="profile.team" :size="56" />
              <span class="pick-name">Initiale</span>
            </button>
            <button
              v-for="card in visibleCards"
              :key="card.id"
              class="avatar-pick"
              :class="{ selected: profile.avatar === card.id }"
              :disabled="busy"
              @click="save('avatar', card.id)"
            >
              <PlayerAvatar :card-id="card.id" :finish="col.finishes.get(card.id) ?? 0" :size="56" />
              <span class="pick-name">{{ card.name }}</span>
            </button>
          </div>
          <p v-if="!ownedOfType.length" class="muted small">Aucune carte de ce type pour l'instant.</p>
          <button v-if="ownedOfType.length > limit" class="btn btn-ghost more" @click="limit += 48">Afficher plus</button>
        </section>

        <!-- Titre -->
        <section v-else-if="tab === 'title'" class="panel">
          <p class="muted small">Chaque album complété débloque un titre affiché sous ton pseudo.</p>
          <div class="title-list">
            <button class="title-pick" :class="{ selected: !profile.title }" :disabled="busy" @click="save('title', null)">
              <span>Aucun titre</span>
            </button>
            <button
              v-for="t in titles"
              :key="t.id"
              class="title-pick"
              :class="{ selected: profile.title === t.id, locked: !t.unlocked }"
              :disabled="busy || !t.unlocked"
              @click="save('title', t.id)"
            >
              <span class="tp-name"><Icon v-if="!t.unlocked" name="lock" :size="13" /> {{ t.label }}</span>
              <span class="tp-album muted">
                {{ t.unlocked ? t.album : t.complete ? `Récupère la récompense de « ${t.album} »` : `Album « ${t.album} » · ${t.owned}/${t.total}` }}
              </span>
            </button>
          </div>
        </section>

        <!-- Écurie -->
        <section v-else class="panel">
          <p class="muted small">Ton profil public prend les couleurs de ton écurie.</p>
          <div class="team-grid">
            <button
              v-for="team in PICKABLE_TEAMS"
              :key="team.id"
              class="team-pick"
              :class="{ selected: profile.team === team.id }"
              :style="{ '--tc': team.color }"
              :disabled="busy"
              @click="save('team', team.id)"
            >
              <span class="swatch"></span> {{ team.name }}
            </button>
            <button class="team-pick" :class="{ selected: !profile.team }" :disabled="busy" @click="save('team', null)">
              <span class="swatch none"></span> Aucune
            </button>
          </div>
        </section>

        <p v-if="error" class="error small">{{ error }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import PlayerAvatar from '@/components/cards/PlayerAvatar.vue'
import { PICKABLE_TEAMS } from '@/data/teams'
import { CARD_TYPES, RARITY_RANK, useCollectionStore } from '@/stores/collectionStore'
import { usePrefsStore } from '@/stores/prefsStore'
import { albumTitle, economyMessage } from '@/utils/cards'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const TABS = [
  { id: 'avatar', label: 'Avatar', icon: 'user' },
  { id: 'title', label: 'Titre', icon: 'trophy' },
  { id: 'team', label: 'Écurie', icon: 'flag' },
]

const col = useCollectionStore()
const prefs = usePrefsStore()

const tab = ref('avatar')
const type = ref('driver')
const search = ref('')
const limit = ref(48)
const busy = ref(false)
const error = ref('')

const profile = computed(() => col.profile ?? {})
const currentTitle = computed(() => (profile.value.title ? albumTitle(profile.value.title, col.albums) : null))

/** Cartes possédées du type choisi, les plus rares d'abord */
const ownedOfType = computed(() => {
  const q = search.value.toLowerCase()
  return col.cards
    .filter((c) => c.type === type.value && col.owned.has(c.id) && (!q || c.name.toLowerCase().includes(q)))
    .sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || a.name.localeCompare(b.name))
})
const visibleCards = computed(() => ownedOfType.value.slice(0, limit.value))

const titles = computed(() =>
  col.albums.map((album) => {
    const stats = col.albumStats.get(album.id)
    return {
      id: album.id,
      label: albumTitle(album.id, col.albums),
      album: album.title,
      unlocked: stats.claimed,
      complete: stats.complete,
      owned: stats.owned,
      total: stats.total,
    }
  }).sort((a, b) => b.unlocked - a.unlocked),
)

watch([type, search], () => (limit.value = 48))
watch(
  () => props.open,
  (open) => {
    document.documentElement.classList.toggle('modal-open', open)
    if (open) error.value = ''
  },
)
onUnmounted(() => document.documentElement.classList.remove('modal-open'))

const ACTIONS = { avatar: 'setAvatar', title: 'setTitle', team: 'setTeam' }

async function save(field, value) {
  if (profile.value[field] === value) return
  busy.value = true
  error.value = ''
  try {
    await col[ACTIONS[field]](value)
    // L'écurie du profil devient aussi celle de l'app
    if (field === 'team' && value) prefs.setFavoriteTeam(value)
  } catch (err) {
    error.value = economyMessage(err)
  } finally {
    busy.value = false
  }
}

function close() {
  emit('close')
}
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 210;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(5, 6, 8, 0.88);
}

.dialog {
  position: relative;
  width: min(620px, 100%);
  /* Hauteur fixe : la fenêtre ne saute pas en changeant d'onglet ou de filtre */
  height: min(640px, calc(100dvh - 32px));
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px;
  overflow: hidden;
}

.close {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 6px;
  color: var(--text-muted);
}

.small { font-size: 13px; }
.error { color: var(--danger); }

.preview {
  display: flex;
  align-items: center;
  gap: 16px;
}

.preview-text { min-width: 0; }
.preview-text .title-md { word-break: break-word; }

.title-badge {
  display: inline-block;
  margin-top: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  color: #ffe08a;
  background: rgb(232 193 90 / 0.12);
  border: 1px solid rgb(232 193 90 / 0.35);
}

.tabs {
  display: flex;
  gap: 6px;
  border-bottom: 1px solid var(--line);
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab.active { color: var(--text); border-bottom-color: var(--accent); }

.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.chips { display: flex; flex-wrap: wrap; gap: 6px; }

.chip {
  padding: 6px 12px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-dim);
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.chip.active { color: var(--on-accent); background: var(--accent); border-color: var(--accent); }

.input {
  flex: 1;
  min-width: 140px;
  padding: 8px 14px;
  border-radius: 99px;
  font: inherit;
  font-size: 14px;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.input:focus { outline: none; border-color: var(--accent-line); }

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 8px;
}

.avatar-pick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: background var(--t), border-color var(--t);
}

.avatar-pick:hover { background: var(--surface-2); }
.avatar-pick.selected { border-color: var(--accent); background: var(--accent-soft); }

.pick-name {
  width: 100%;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more { align-self: center; }

.title-list,
.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: 8px;
}

.title-pick,
.team-pick {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 14px;
  border-radius: 12px;
  text-align: left;
  background: var(--surface-2);
  border: 1px solid var(--line);
  transition: border-color var(--t);
}

.title-pick:not(:disabled):hover,
.team-pick:not(:disabled):hover { border-color: var(--accent-line); }
.title-pick.selected,
.team-pick.selected { border-color: var(--accent); background: var(--accent-soft); }

.tp-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 14px;
}

.tp-album { font-size: 12px; }
.title-pick.locked { opacity: 0.5; cursor: not-allowed; }

.team-pick {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 14px;
}

.swatch {
  width: 6px;
  height: 18px;
  border-radius: 3px;
  background: var(--tc);
}

.swatch.none { background: var(--line); }

@media (max-width: 520px) {
  .dialog { padding: 20px 16px; }
  .avatar-grid { grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); }
}
</style>
