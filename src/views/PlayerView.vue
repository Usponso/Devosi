<template>
  <div class="page player">
    <div v-if="loading" class="container empty">Chargement…</div>

    <div v-else-if="!player" class="container empty">
      Aucun joueur public avec ce pseudo.
      <router-link to="/joueurs" class="link-arrow">Voir tous les joueurs →</router-link>
    </div>

    <template v-else>
      <header class="hero">
        <div class="hero-glow" aria-hidden="true"></div>
        <div class="container hero-inner">
          <router-link to="/joueurs" class="back muted">← Joueurs</router-link>
          <div class="hero-row">
            <div>
              <div class="eyebrow">Rang {{ player.rank }} sur {{ player.players }} · membre depuis {{ formatDate(player.member_since, { month: 'long', year: 'numeric' }) }}</div>
              <h1 class="title-xl name">{{ player.username }}</h1>
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
              <F1Card :card="card" :finish="player.finishes?.[card.id] ?? 0" />
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
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '@/components/Icon.vue'
import F1Card from '@/components/cards/F1Card.vue'
import StatTile from '@/components/StatTile.vue'
import { RARITIES, RARITY_LABEL, useCollectionStore } from '@/stores/collectionStore'
import { fetchPlayer } from '@/services/collection'
import { formatDate } from '@/utils/race'

const route = useRoute()
const col = useCollectionStore()

const player = ref(null)
const loading = ref(true)

watch(
  () => route.params.username,
  async (username) => {
    if (!username) return
    loading.value = true
    try {
      const [data] = await Promise.all([fetchPlayer(username), col.loadCatalog()])
      player.value = data
    } catch (err) {
      console.error('[Joueur]', err)
      player.value = null
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

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
  .score { text-align: left; }
  .score-num { font-size: 44px; }
}
</style>
