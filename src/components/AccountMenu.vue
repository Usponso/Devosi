<template>
  <div v-if="col.configured" ref="root" class="account-menu">
    <!-- Joueur avec pseudo : bulle avatar et menu -->
    <template v-if="col.isPlayer">
      <button
        class="bubble"
        :class="{ open }"
        aria-haspopup="menu"
        :aria-expanded="open"
        :aria-label="`Mon compte, @${col.profile.username}${col.friendRequests ? `, ${col.friendRequests} demandes d'amis` : ''}`"
        @click="open = !open"
      >
        <span class="bubble-avatar">
          <PlayerAvatar
            :card-id="col.profile.avatar"
            :finish="col.finishes.get(col.profile.avatar) ?? 0"
            :username="col.profile.username"
            :team="col.profile.team"
            :size="28"
          />
          <span v-if="col.friendRequests" class="bubble-badge mono">{{ col.friendRequests }}</span>
        </span>
        <span class="bubble-name">{{ col.profile.username }}</span>
        <Icon name="chevron-down" :size="14" class="bubble-chevron" />
      </button>

      <transition name="menu">
        <div v-if="open" class="menu" role="menu">
          <div class="menu-head">
            <PlayerAvatar
              :card-id="col.profile.avatar"
              :finish="col.finishes.get(col.profile.avatar) ?? 0"
              :username="col.profile.username"
              :team="col.profile.team"
              :size="44"
            />
            <div class="menu-id">
              <div class="menu-name">@{{ col.profile.username }}</div>
              <div v-if="title" class="menu-title">{{ title }}</div>
              <div v-if="col.status?.available" class="menu-packs muted">
                <Icon name="package" :size="13" /> {{ col.status.available }} pack{{ col.status.available > 1 ? 's' : '' }} à ouvrir
              </div>
            </div>
          </div>

          <router-link :to="`/joueurs/${col.profile.username}`" class="item" role="menuitem">
            <Icon name="user" :size="16" /> Mon profil
          </router-link>
          <button class="item" role="menuitem" @click="openEditor">
            <Icon name="edit" :size="16" /> Personnaliser
          </button>
          <router-link to="/joueurs?onglet=amis" class="item" role="menuitem">
            <Icon name="users" :size="16" /> Amis
            <span v-if="col.friendRequests" class="item-badge mono">{{ col.friendRequests }}</span>
          </router-link>
          <router-link to="/collection" class="item" role="menuitem">
            <Icon name="album" :size="16" /> Ma collection
          </router-link>
          <div class="sep"></div>
          <button class="item" role="menuitem" @click="openAccount('link')">
            <Icon name="save" :size="16" /> Mon compte
          </button>
          <button class="item quiet" role="menuitem" :disabled="busy" @click="logout">
            <Icon name="x" :size="16" /> Se déconnecter
          </button>
        </div>
      </transition>
    </template>

    <!-- Compte relié sans pseudo, invité ou visiteur : un bouton qui ouvre la fenêtre du compte -->
    <button v-else-if="col.status || col.noSession" class="bubble plain" @click="openAccount(col.noSession ? 'login' : 'link')">
      <Icon :name="col.profile?.permanent ? 'user' : col.noSession ? 'user' : 'save'" :size="16" />
      <span class="bubble-name">{{ guestLabel }}</span>
    </button>

    <!-- Hors de l'en-tête : son backdrop-filter piégerait les fenêtres en position fixed -->
    <Teleport to="body">
      <AccountDialog :open="accountOpen" :start-mode="accountMode" @close="accountOpen = false" />
      <ProfileEditor :open="editorOpen" @close="editorOpen = false" />
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './Icon.vue'
import AccountDialog from './cards/AccountDialog.vue'
import PlayerAvatar from './cards/PlayerAvatar.vue'
import ProfileEditor from './cards/ProfileEditor.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { signOut } from '@/services/collection'
import { albumTitle } from '@/utils/cards'

/** Accès au profil depuis l'en-tête : bulle avatar + menu, ou bouton de connexion */
const col = useCollectionStore()
const route = useRoute()

const root = ref(null)
const open = ref(false)
const busy = ref(false)
const accountOpen = ref(false)
const accountMode = ref('link')
const editorOpen = ref(false)

const title = computed(() => (col.profile?.title ? albumTitle(col.profile.title, col.albums) : null))
const guestLabel = computed(() => {
  if (col.profile?.permanent) return 'Choisir un pseudo'
  return col.noSession ? 'Se connecter' : 'Sauvegarder'
})

// L'avatar et le titre viennent du catalogue des cartes : chargé quand le joueur en a un
watch(
  () => col.profile?.avatar || col.profile?.title,
  (needed) => needed && col.loadCatalog(),
  { immediate: true },
)

function openAccount(mode) {
  open.value = false
  accountMode.value = mode
  accountOpen.value = true
}

function openEditor() {
  open.value = false
  // L'éditeur a besoin des cartes possédées et des albums complétés
  if (!col.ready) col.init()
  editorOpen.value = true
}

async function logout() {
  busy.value = true
  try {
    await signOut()
    await col.reload()
  } finally {
    busy.value = false
    open.value = false
  }
}

// Fermeture : clic ailleurs, Échap, changement de page
const onDocClick = (e) => open.value && root.value && !root.value.contains(e.target) && (open.value = false)
const onKey = (e) => e.key === 'Escape' && (open.value = false)
watch(() => route.fullPath, () => (open.value = false))
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.account-menu { position: relative; }

.bubble {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 10px 3px 3px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  background: var(--surface);
  border: 1px solid var(--line);
  transition: border-color var(--t), background var(--t);
}

.bubble:hover,
.bubble.open { border-color: var(--line-strong); background: var(--surface-2); }

.bubble.plain { padding: 7px 14px; }

.bubble-avatar { position: relative; display: inline-flex; }

.bubble-badge,
.item-badge {
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  border-radius: 99px;
  font-size: 10px;
  font-weight: 700;
  color: var(--on-accent);
  background: var(--accent);
}

.bubble-badge {
  position: absolute;
  top: -5px;
  right: -7px;
  box-shadow: 0 0 0 2px var(--bg);
}

.bubble-name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bubble-chevron { color: var(--text-muted); transition: transform var(--t); }
.bubble.open .bubble-chevron { transform: rotate(180deg); }

.menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 120;
  width: 260px;
  padding: 6px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid var(--line-strong);
  box-shadow: 0 18px 40px rgb(0 0 0 / 0.5);
}

.menu-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 10px 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--line);
}

.menu-id { min-width: 0; }
.menu-name { font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu-title { font-size: 12px; font-weight: 700; color: #ffe08a; }

.menu-packs {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 12px;
}

.item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  color: var(--text);
  transition: background var(--t);
}

.item:hover { background: var(--surface-3); }
.item .item-badge { margin-left: auto; }
.item.quiet { color: var(--text-muted); }
.item:disabled { opacity: 0.5; }

.sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--line);
}

.menu-enter-active,
.menu-leave-active { transition: opacity 0.15s ease, transform 0.2s var(--ease); }
.menu-enter-from,
.menu-leave-to { opacity: 0; transform: translateY(-6px); }

/* Mobile : l'avatar seul */
@media (max-width: 860px) {
  .bubble:not(.plain) { padding: 3px; }
  .bubble:not(.plain) .bubble-name,
  .bubble-chevron { display: none; }
}

@media (max-width: 420px) {
  .bubble.plain .bubble-name { display: none; }
  .bubble.plain { padding: 9px; }
}
</style>
