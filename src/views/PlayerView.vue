<template>
  <div class="page player">
    <div v-if="loading" class="container empty">Chargement…</div>

    <div v-else-if="!player" class="container empty">
      Aucun joueur public avec ce pseudo.
      <router-link to="/joueurs" class="link-arrow">Voir tous les joueurs →</router-link>
    </div>

    <template v-else>
      <header class="hero" :style="teamColor ? { '--tc': teamColor } : null">
        <div class="hero-glow" aria-hidden="true"></div>
        <div class="container hero-inner">
          <router-link to="/joueurs" class="back muted">← Joueurs</router-link>
          <div class="hero-row">
            <div class="identity">
              <PlayerAvatar
                :card-id="player.avatar"
                :finish="player.avatar_finish"
                :username="player.username"
                :team="player.team"
                :size="96"
                class="hero-avatar"
              />
              <div class="identity-text">
                <div class="eyebrow">Rang {{ player.rank }} sur {{ player.players }} · membre depuis {{ formatDate(player.member_since, { month: 'long', year: 'numeric' }) }}</div>
                <h1 class="title-xl name">{{ player.username }}</h1>
                <div class="tags">
                  <span v-if="playerTitle" class="title-badge"><Icon name="trophy" :size="13" /> {{ playerTitle }}</span>
                  <span v-if="team" class="team-tag"><span class="team-swatch"></span>{{ team.name }}</span>
                </div>
                <div class="hero-actions">
                  <button v-if="player.friendship === 'self'" class="btn btn-ghost" @click="editing = true">
                    <Icon name="edit" :size="16" /> Personnaliser mon profil
                  </button>
                  <FriendButton v-else v-model:status="player.friendship" :username="player.username" />
                </div>
              </div>
            </div>
            <div class="score">
              <div class="mono score-num" v-countup="Number(player.score)"></div>
              <div class="eyebrow">Score de collection</div>
            </div>
          </div>
        </div>
      </header>

      <div class="container body">
        <!-- Vitrine -->
        <section>
          <h2 class="title-md section-title">Vitrine</h2>
          <div v-if="showcaseCards.length" class="showcase">
            <div v-for="(card, i) in showcaseCards" :key="card.id" class="showcase-card" :style="{ animationDelay: `${i * 90}ms` }">
              <F1Card :card="card" :finish="player.finishes?.[card.id] ?? 0" :zoom-list="showcaseCards" :zoom-finishes="player.finishes ?? {}" />
              <div class="caption">
                <span class="muted">{{ RARITY_LABEL[card.rarity] }}</span>
              </div>
            </div>
          </div>
          <p v-else class="muted">{{ player.username }} n'a pas encore choisi de cartes pour sa vitrine.</p>
        </section>

        <!-- Statistiques -->
        <section class="stats-grid">
          <StatTile label="Cartes" :value="Number(player.owned)" :sub="`${percent} % de la collection`" />
          <StatTile label="Packs ouverts" :value="Number(player.packs_opened)" />
          <StatTile label="Rang" :value="`#${player.rank}`" :sub="`sur ${player.players} joueurs`" />
          <StatTile label="Amis" :value="Number(player.friends ?? 0)" />
        </section>

        <section v-if="completedAlbums.length" class="card albums-done">
          <h2 class="title-md section-title">Albums complétés</h2>
          <div class="album-badges">
            <span v-for="a in completedAlbums" :key="a.id" class="album-badge">
              <Icon name="album" :size="14" /> {{ a.title }}
            </span>
          </div>
        </section>

        <section class="card rarities">
          <h2 class="title-md section-title">Par rareté</h2>
          <div v-for="r in RARITIES" :key="r.id" class="rarity-row" :class="`r-${r.id}`">
            <span class="r-label">{{ r.label }}</span>
            <span class="r-bar"><span :style="{ width: `${rarityShare(r.id)}%` }"></span></span>
            <span class="mono r-count">{{ player.by_rarity?.[r.id] ?? 0 }}</span>
          </div>
        </section>
      </div>
    </template>

    <ProfileEditor :open="editing" @close="closeEditor" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '@/components/Icon.vue'
import F1Card from '@/components/cards/F1Card.vue'
import StatTile from '@/components/StatTile.vue'
import FriendButton from '@/components/cards/FriendButton.vue'
import PlayerAvatar from '@/components/cards/PlayerAvatar.vue'
import ProfileEditor from '@/components/cards/ProfileEditor.vue'
import { PICKABLE_TEAMS, getTeamColor } from '@/data/teams'
import { albumTitle } from '@/utils/cards'
import { RARITIES, RARITY_LABEL, useCollectionStore } from '@/stores/collectionStore'
import { fetchPlayer } from '@/services/collection'
import { formatDate } from '@/utils/race'

const route = useRoute()
const col = useCollectionStore()

const player = ref(null)
const loading = ref(true)
const editing = ref(false)

const playerTitle = computed(() => (player.value?.title ? albumTitle(player.value.title, col.albums) : null))
const team = computed(() => PICKABLE_TEAMS.find((t) => t.id === player.value?.team) ?? null)
const teamColor = computed(() => (player.value?.team ? getTeamColor(player.value.team) : null))

async function load(username, quiet = false) {
  if (!quiet) loading.value = true
  try {
    const [data] = await Promise.all([fetchPlayer(username), col.loadCatalog()])
    player.value = data
    // Mon propre profil : collection nécessaire pour l'éditeur (avatar, titres)
    if (data?.friendship === 'self' && !col.ready) col.init()
  } catch (err) {
    console.error('[Joueur]', err)
    player.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.username,
  (username) => username && load(username),
  { immediate: true },
)

/** Les changements de l'éditeur apparaissent sur le profil public */
function closeEditor() {
  editing.value = false
  load(route.params.username, true)
}

const completedAlbums = computed(() =>
  (player.value?.albums ?? []).map((id) => col.albums.find((a) => a.id === id)).filter(Boolean),
)
const showcaseCards = computed(() => (player.value?.showcase ?? []).map((id) => col.byId.get(id)).filter(Boolean))
const percent = computed(() => (player.value?.total ? Math.round((player.value.owned / player.value.total) * 1000) / 10 : 0))

function rarityShare(rarity) {
  const n = player.value?.by_rarity?.[rarity] ?? 0
  const max = Math.max(1, ...Object.values(player.value?.by_rarity ?? {}))
  return (n / max) * 100
}
</script>

<style scoped>
.album-badges { display: flex; flex-wrap: wrap; gap: 8px; }

.album-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  color: #ffe08a;
  border: 1px solid rgb(232 193 90 / 0.4);
  background: rgb(232 193 90 / 0.1);
}

.hero {
  position: relative;
  padding: 32px 0 36px;
  border-bottom: 1px solid var(--line);
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 80% 40%, rgb(var(--accent-rgb) / 0.22), transparent 60%);
  pointer-events: none;
}

/* Écurie favorite du joueur : le halo prend sa couleur */
.hero[style] .hero-glow {
  background:
    radial-gradient(ellipse at 15% 60%, color-mix(in srgb, var(--tc) 30%, transparent), transparent 55%),
    radial-gradient(ellipse at 85% 30%, color-mix(in srgb, var(--tc) 16%, transparent), transparent 60%);
}

.identity {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}

.identity-text { min-width: 0; }

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.title-badge,
.team-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
}

.title-badge {
  color: #ffe08a;
  background: rgb(232 193 90 / 0.12);
  border: 1px solid rgb(232 193 90 / 0.35);
}

.team-tag {
  color: var(--text-dim);
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.team-swatch {
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: var(--tc);
}

.hero-actions { margin-top: 14px; }

.hero-inner { position: relative; }

.back {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 18px;
}

.hero-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 20px;
}

.name { margin-top: 8px; word-break: break-word; }

.score { text-align: right; }
.score-num { font-size: 56px; font-weight: 700; line-height: 1; color: var(--accent); }

.body {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding-top: 32px;
}

.section-title { margin-bottom: 16px; }

.showcase {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 18px;
}

.showcase-card { animation: rise 0.6s var(--ease) both; }

.caption {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: 12px;
}

.rarity-row {
  --c: #8a8f98;
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  font-size: 14px;
}

.rarity-row.r-rare { --c: #3b82f6; }
.rarity-row.r-epic { --c: #a855f7; }
.rarity-row.r-legendary { --c: #e8c15a; }
.rarity-row.r-mythic { --c: #ff4fd8; }

.r-label { font-weight: 700; color: var(--c); }
.r-bar { height: 8px; border-radius: 4px; background: var(--surface-2); overflow: hidden; }
.r-bar > span { display: block; height: 100%; background: var(--c); border-radius: 4px; transform-origin: left; animation: grow 0.9s var(--ease) both; }
.r-count { text-align: right; font-weight: 700; }

@media (max-width: 760px) {
  .showcase { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .identity { align-items: flex-start; gap: 14px; }
  .hero-avatar { --size: 64px !important; }
  .score { text-align: left; }
  .score-num { font-size: 44px; }
}
</style>
