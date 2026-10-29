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
          <router-link v-if="!self" to="/joueurs" class="back muted">← Joueurs</router-link>
          <div class="hero-row">
            <div class="identity">
              <button v-if="self" class="avatar-edit" aria-label="Changer mon avatar" @click="edit('avatar')">
                <PlayerAvatar
                  :card-id="player.avatar"
                  :finish="player.avatar_finish"
                  :username="player.username"
                  :team="player.team"
                  :size="96"
                  class="hero-avatar"
                />
                <span class="edit-pen"><Icon name="edit" :size="14" /></span>
              </button>
              <PlayerAvatar
                v-else
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
                <!-- Mon profil : chaque élément se modifie sur place -->
                <div v-if="self" class="tags">
                  <button class="title-badge editable" :class="{ empty: !playerTitle }" @click="edit('title')">
                    <Icon :name="playerTitle ? 'trophy' : 'plus'" :size="13" /> {{ playerTitle ?? 'Choisir un titre' }}
                    <Icon v-if="playerTitle" name="edit" :size="12" class="pen" />
                  </button>
                  <button class="team-tag editable" :class="{ empty: !team }" @click="edit('team')">
                    <span v-if="team" class="team-swatch"></span><Icon v-else name="plus" :size="13" />
                    {{ team?.name ?? 'Choisir une écurie' }}
                    <Icon v-if="team" name="edit" :size="12" class="pen" />
                  </button>
                </div>
                <div v-else class="tags">
                  <span v-if="playerTitle" class="title-badge"><Icon name="trophy" :size="13" /> {{ playerTitle }}</span>
                  <span v-if="team" class="team-tag"><span class="team-swatch"></span>{{ team.name }}</span>
                </div>

                <div v-if="self" class="badges">
                  <template v-for="i in 3" :key="i">
                    <button v-if="player.badges?.[i - 1]" class="badge-btn" :aria-label="`Changer mes badges (${player.badges[i - 1].title})`" @click="edit('badges')">
                      <AchievementBadge :achievement="player.badges[i - 1]" :size="34" />
                    </button>
                    <button v-else class="badge-slot" aria-label="Choisir un badge" @click="edit('badges')"><Icon name="plus" :size="14" /></button>
                  </template>
                  <span v-if="(player.badges?.length ?? 0) < 3" class="muted small">Choisis 3 badges parmi tes succès</span>
                  <router-link to="/succes" class="link-arrow small">Mes succès →</router-link>
                </div>
                <div v-else-if="player.badges?.length" class="badges">
                  <AchievementBadge v-for="b in player.badges" :key="b.id" :achievement="b" :size="34" />
                </div>

                <div v-if="!self" class="hero-actions">
                  <FriendButton v-model:status="player.friendship" :username="player.username" />
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
        <ProfileCompletion v-if="self" @edit="edit" />

        <!-- Vitrine -->
        <section>
          <div class="section-row">
            <h2 class="title-md section-title">Vitrine</h2>
            <button v-if="self" class="btn btn-ghost" @click="edit('showcase')">
              <Icon name="edit" :size="16" /> Modifier ma vitrine
            </button>
          </div>
          <!-- Ma vitrine : emplacements libres à remplir -->
          <div v-if="self" class="showcase">
            <template v-for="i in 5" :key="i">
              <div v-if="showcaseCards[i - 1]" class="showcase-card" :style="{ animationDelay: `${(i - 1) * 90}ms` }">
                <F1Card :card="showcaseCards[i - 1]" :finish="player.finishes?.[showcaseCards[i - 1].id] ?? 0" :zoom-list="showcaseCards" :zoom-finishes="player.finishes ?? {}" />
                <div class="caption"><span class="muted">{{ RARITY_LABEL[showcaseCards[i - 1].rarity] }}</span></div>
              </div>
              <button v-else class="showcase-slot" @click="edit('showcase')">
                <Icon name="plus" :size="20" />
                <span class="muted small">Ajouter une carte</span>
              </button>
            </template>
          </div>
          <div v-else-if="showcaseCards.length" class="showcase">
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

    <ProfileEditor :open="Boolean(editing)" :initial-tab="editing || 'showcase'" single @close="closeEditor" />
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
import AchievementBadge from '@/components/cards/AchievementBadge.vue'
import ProfileEditor from '@/components/cards/ProfileEditor.vue'
import ProfileCompletion from '@/components/cards/ProfileCompletion.vue'
import { PICKABLE_TEAMS, getTeamColor } from '@/data/teams'
import { albumTitle } from '@/utils/cards'
import { RARITIES, RARITY_LABEL, useCollectionStore } from '@/stores/collectionStore'
import { fetchPlayer } from '@/services/collection'
import { formatDate } from '@/utils/race'

/** `username` : profil affiché par /profil (le mien) ; sinon le pseudo de l'adresse */
const props = defineProps({ username: { type: String, default: null } })

const route = useRoute()
const col = useCollectionStore()

const player = ref(null)
const loading = ref(true)
// Zone en cours de modification (avatar, title, team, badges, showcase) ou null
const editing = ref(null)
const self = computed(() => player.value?.friendship === 'self')
const username = computed(() => props.username ?? route.params.username)

function edit(tab) {
  editing.value = tab
}

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

watch(username, (name) => name && load(name), { immediate: true })

/** Les changements de l'éditeur apparaissent sur le profil public */
function closeEditor() {
  editing.value = null
  load(username.value, true)
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

.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 12px;
  margin-bottom: 16px;
}

/* La marge est portée par la ligne : titre et bouton restent alignés */
.section-row .section-title { margin-bottom: 0; }

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
.badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.badges .small { font-size: 13px; margin-left: 4px; }
/* Mon profil : éléments modifiables */
.avatar-edit {
  position: relative;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: none;
  cursor: pointer;
}

.edit-pen {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--accent);
  border: 2px solid var(--bg);
}

.editable {
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color var(--t);
}

.editable .pen { opacity: 0.6; }
.editable:hover { border-color: var(--accent-line); }

.editable.empty {
  color: var(--accent);
  background: transparent;
  border: 1px dashed var(--accent-line);
}

.badge-btn {
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.badge-slot {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 28%;
  color: var(--text-muted);
  background: transparent;
  border: 1.5px dashed var(--line-strong);
  cursor: pointer;
}

.badge-slot:hover { color: var(--accent); border-color: var(--accent-line); }

.showcase-slot {
  aspect-ratio: 5 / 7;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  color: var(--text-muted);
  background: transparent;
  border: 1.5px dashed var(--line-strong);
  cursor: pointer;
}

.showcase-slot:hover { color: var(--accent); border-color: var(--accent-line); }
.showcase-slot .small { font-size: 12px; text-align: center; padding: 0 6px; }
</style>
