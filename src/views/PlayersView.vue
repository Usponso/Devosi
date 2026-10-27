<template>
  <div class="page players">
    <header class="container page-head">
      <div class="eyebrow">Collection</div>
      <div class="head-row">
        <h1 class="title-lg">Joueurs</h1>
        <router-link to="/collection" class="btn btn-ghost"><Icon name="album" :size="16" /> Ma collection</router-link>
      </div>
      <p class="dim">
        Classement par score de collection : chaque carte distincte rapporte des points selon sa rareté
        (Commune 1, Rare 3, Épique 10, Légendaire 25, Mythique 100).
      </p>
    </header>

    <div class="container">
      <p v-if="!col.configured" class="card empty">La collection n'est pas encore configurée.</p>

      <template v-else>
        <div class="view-tabs" role="tablist">
          <button role="tab" class="view-tab" :class="{ active: tab === 'all' }" :aria-selected="tab === 'all'" @click="tab = 'all'">
            <Icon name="trophy" :size="16" /> Classement général
          </button>
          <button role="tab" class="view-tab" :class="{ active: tab === 'friends' }" :aria-selected="tab === 'friends'" @click="tab = 'friends'">
            <Icon name="users" :size="16" /> Amis
            <span v-if="col.friendRequests" class="badge mono">{{ col.friendRequests }}</span>
          </button>
        </div>

        <!-- Amis : demandes reçues et envoyées -->
        <template v-if="tab === 'friends'">
          <p v-if="!col.isPlayer" class="card empty">
            Sauvegarde ta collection et choisis un pseudo pour ajouter des amis.
            <router-link to="/collection" class="link-arrow">Ma collection →</router-link>
          </p>
          <template v-else>
            <section v-if="col.friends?.incoming.length" class="card requests">
              <h2 class="title-sm">Demandes reçues</h2>
              <div v-for="p in col.friends.incoming" :key="p.username" class="request">
                <router-link :to="`/joueurs/${p.username}`" class="request-player">
                  <PlayerAvatar :card-id="p.avatar" :finish="p.avatar_finish" :username="p.username" :team="p.team" :size="40" />
                  <span class="c-name">{{ p.username }}</span>
                </router-link>
                <FriendButton :username="p.username" status="incoming" />
              </div>
            </section>
            <section v-if="col.friends?.outgoing.length" class="card requests">
              <h2 class="title-sm">Demandes envoyées</h2>
              <div v-for="p in col.friends.outgoing" :key="p.username" class="request">
                <router-link :to="`/joueurs/${p.username}`" class="request-player">
                  <PlayerAvatar :card-id="p.avatar" :finish="p.avatar_finish" :username="p.username" :team="p.team" :size="40" />
                  <span class="c-name">{{ p.username }}</span>
                </router-link>
                <FriendButton :username="p.username" status="outgoing" />
              </div>
            </section>
            <p v-if="col.friends && !col.friends.friends.length" class="muted hint">
              Tu n'as pas encore d'amis : recherche un pseudo dans le classement général et ouvre son profil pour l'ajouter.
            </p>
          </template>
        </template>

        <div v-if="tab === 'all' || col.isPlayer" class="toolbar">
          <input
            v-model.trim="query"
            class="search"
            type="search"
            placeholder="Rechercher un pseudo"
            aria-label="Rechercher un pseudo"
          />
          <p v-if="tab === 'all' && !col.isPlayer" class="muted small">
            Pour apparaître ici, sauvegarde ta collection et choisis un pseudo depuis
            <router-link to="/collection" class="link-arrow">ta collection</router-link>.
          </p>
        </div>

        <section v-if="tab === 'all' || col.isPlayer" class="card board">
          <div class="board-head">
            <span>Rang</span><span>Joueur</span><span class="c-showcase">Vitrine</span><span class="c-num">Cartes</span><span class="c-num">Score</span>
          </div>
          <ol class="board-list">
            <li v-for="p in players" :key="p.username">
              <router-link
                :to="`/joueurs/${p.username}`"
                class="board-row"
                :class="{ me: p.username === col.profile?.username }"
              >
                <span class="mono c-rank" :class="`pos-${p.rank}`">{{ p.rank }}</span>
                <span class="c-player">
                  <PlayerAvatar :card-id="p.avatar" :finish="p.avatar_finish" :username="p.username" :team="p.team" :size="40" />
                  <span class="c-id">
                    <span class="c-name">{{ p.username }}</span>
                    <span v-if="p.title" class="c-title">{{ albumTitle(p.title, col.albums) }}</span>
                  </span>
                </span>
                <span class="c-showcase">
                  <span v-for="id in p.showcase.slice(0, 5)" :key="id" class="mini">
                    <F1Card v-if="col.byId.get(id)" :card="col.byId.get(id)" :interactive="false" />
                  </span>
                </span>
                <span class="mono c-num">{{ p.owned }}</span>
                <span class="mono c-num score">{{ p.score.toLocaleString('fr-FR') }}</span>
              </router-link>
            </li>
          </ol>
          <p v-if="!players.length && !loading" class="empty">
            {{ query ? 'Aucun joueur ne correspond à cette recherche.' : tab === 'friends' ? 'Aucun ami pour le moment.' : 'Aucun joueur public pour le moment.' }}
          </p>
          <div v-if="hasMore" class="more">
            <button class="btn btn-ghost" :disabled="loading" @click="load(true)">Afficher plus</button>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import F1Card from '@/components/cards/F1Card.vue'
import FriendButton from '@/components/cards/FriendButton.vue'
import PlayerAvatar from '@/components/cards/PlayerAvatar.vue'
import { albumTitle } from '@/utils/cards'
import { useCollectionStore } from '@/stores/collectionStore'
import { fetchLeaderboard } from '@/services/collection'

const PAGE = 50

const col = useCollectionStore()
const route = useRoute()
const router = useRouter()
// Onglet dans l'URL (?onglet=amis) pour pouvoir y revenir
const tab = ref(route.query.onglet === 'amis' ? 'friends' : 'all')
const query = ref('')
const players = ref([])
const loading = ref(false)
const hasMore = ref(false)

let requestId = 0

async function load(more = false) {
  const id = ++requestId
  loading.value = true
  try {
    const rows = await fetchLeaderboard(query.value, more ? players.value.length : 0, PAGE, tab.value === 'friends')
    if (id !== requestId) return
    players.value = more ? [...players.value, ...rows] : rows
    hasMore.value = rows.length === PAGE
  } catch (err) {
    console.error('[Joueurs]', err)
  } finally {
    if (id === requestId) loading.value = false
  }
}

// Recherche avec un léger délai pendant la frappe
let debounce = null
watch(query, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => load(), 250)
})

watch(tab, (value) => {
  router.replace({ query: value === 'friends' ? { onglet: 'amis' } : {} })
  load()
  if (value === 'friends') loadFriends()
})

// Une demande acceptée ou refusée change aussi le classement entre amis
watch(() => col.friends?.friends.length, () => tab.value === 'friends' && load())

async function loadFriends() {
  if (!col.ready) await col.init()
  if (col.isPlayer) col.loadFriends().catch((err) => console.error('[Amis]', err))
}

onMounted(async () => {
  if (!col.configured) return
  col.loadCatalog()
  load()
  await col.init()
  if (tab.value === 'friends') loadFriends()
})
</script>

<style scoped>
.page-head {
  padding-top: 40px;
  padding-bottom: 20px;
}

.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 6px 0 10px;
}

.small { font-size: 13px; }

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.search {
  min-width: 260px;
  padding: 10px 16px;
  border-radius: 99px;
  font: inherit;
  font-size: 14px;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--line);
}

.search:focus { outline: none; border-color: var(--accent-line); }

.view-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--line);
}

.view-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-weight: 700;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.view-tab.active { color: var(--text); border-bottom-color: var(--accent); }

.badge {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  color: var(--on-accent);
  background: var(--accent);
}

.requests {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
  padding: 16px 20px;
}

.requests .title-sm { margin-bottom: 6px; font-weight: 800; }

.request {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--line);
}

.request-player {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.hint { margin-bottom: 16px; }

.board { padding: 8px 0; }

.board-head,
.board-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 210px 70px 90px;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
}

.board-head {
  height: 36px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.board-list { list-style: none; }

.board-row {
  min-height: 64px;
  border-top: 1px solid var(--line);
  transition: background var(--t);
}

.board-row:hover { background: var(--surface-2); }
.board-row.me { background: var(--accent-soft); }

.c-rank { font-size: 18px; font-weight: 700; }
.c-player {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.c-id {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.c-name { font-weight: 700; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.c-title { font-size: 12px; font-weight: 600; color: #ffe08a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.c-num { text-align: right; }
.score { font-weight: 700; color: var(--accent); }

.c-showcase {
  display: flex;
  gap: 4px;
}

.mini { width: 36px; }

.more {
  display: flex;
  justify-content: center;
  padding: 16px;
}

@media (max-width: 640px) {
  .search { min-width: 0; width: 100%; }
  .board-head,
  .board-row { grid-template-columns: 36px minmax(0, 1fr) 52px 64px; padding: 0 12px; gap: 8px; }
  .c-showcase { display: none; }
}
</style>
