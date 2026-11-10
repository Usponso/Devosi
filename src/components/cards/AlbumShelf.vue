<template>
  <div class="shelf">
    <section v-for="section in sections" :key="section.title" class="shelf-section">
      <h2 class="eyebrow section-title">{{ section.title }}</h2>
      <div class="covers">
        <router-link
          v-for="album in section.albums"
          :key="album.id"
          :to="`/collection/album/${album.id}`"
          class="cover"
          :class="{ complete: album.stats.complete, claimed: album.stats.claimed, 'tier-chrome': tierOf(album) === 1, 'tier-gold': tierOf(album) === 2 }"
        >
          <span v-if="tierOf(album) === 2" class="ribbon gold">Master set</span>
          <span v-else-if="tierOf(album) === 1" class="ribbon chrome">Set Chrome</span>
          <span class="cover-art" :style="{ '--tc': coverCard(album)?.color ?? 'var(--accent)' }">
            <img v-if="coverCard(album)?.photo" :src="coverCard(album).photo.url" alt="" loading="lazy" />
            <span class="cover-band">
              <span class="cover-count mono">{{ album.stats.total }} cartes</span>
            </span>
          </span>
          <span class="cover-body">
            <span class="cover-title">{{ album.title }}</span>
            <span class="muted cover-sub">{{ album.subtitle }}</span>
            <span class="cover-progress">
              <span class="meter"><span :style="{ width: `${(album.stats.owned / album.stats.total) * 100}%` }"></span></span>
              <span class="mono small">{{ album.stats.owned }}/{{ album.stats.total }}</span>
            </span>
            <!-- Master set : paliers Chrome et Or, une fois l'album complété -->
            <template v-if="album.stats.claimed && album.stats.master">
              <span class="cover-progress tier chrome">
                <span class="tier-lbl">Chrome</span>
                <span class="meter"><span :style="{ width: `${(album.stats.master.chrome / album.stats.total) * 100}%` }"></span></span>
                <span class="mono small">{{ album.stats.master.chrome }}/{{ album.stats.total }}</span>
              </span>
              <span class="cover-progress tier gold">
                <span class="tier-lbl">Or</span>
                <span class="meter"><span :style="{ width: `${(album.stats.master.gold / album.stats.total) * 100}%` }"></span></span>
                <span class="mono small">{{ album.stats.master.gold }}/{{ album.stats.total }}</span>
              </span>
            </template>
            <span v-if="tierReady(album)" class="cover-reward small ready"><Icon name="coin" :size="14" /> Palier {{ tierReady(album) === 2 ? 'Or' : 'Chrome' }} à récupérer !</span>
            <span v-else class="cover-reward small" :class="{ ready: album.stats.complete && !album.stats.claimed }">
              <template v-if="album.stats.claimed"><Icon name="check" :size="14" /> Complété</template>
              <template v-else-if="album.stats.complete"><Icon name="coin" :size="14" /> {{ formatCoins(album.reward) }} Pièces à récupérer !</template>
              <template v-else><Icon name="coin" :size="14" /> {{ formatCoins(album.reward) }} Pièces</template>
            </span>
          </span>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { formatCoins } from '@/utils/cards'

const col = useCollectionStore()

const sections = computed(() => {
  const out = []
  for (const album of col.albums) {
    const stats = col.albumStats.get(album.id)
    let section = out.find((s) => s.title === album.section)
    if (!section) out.push((section = { title: album.section, albums: [] }))
    section.albums.push({ ...album, stats })
  }
  return out
})

const coverCard = (album) => col.byId.get(album.cover)
/** Palier Master set récupéré (0, 1 Chrome, 2 Or) */
const tierOf = (album) => album.stats.master?.tier ?? 0
/** Palier atteint mais pas encore récupéré (1 ou 2), sinon 0 */
function tierReady(album) {
  const m = album.stats.master
  if (!album.stats.claimed || !m) return 0
  if (m.tier < 1 && m.chrome === album.stats.total) return 1
  if (m.tier < 2 && m.gold === album.stats.total) return 2
  return 0
}
</script>

<style scoped>
.shelf { display: flex; flex-direction: column; gap: 28px; }
.section-title { margin-bottom: 12px; }

.covers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}

.cover {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--surface);
  transition: transform 0.25s var(--ease), border-color 0.25s var(--ease);
}

.cover:hover { transform: translateY(-3px); border-color: var(--line-strong); }
.cover.complete { border-color: rgb(232 193 90 / 0.55); }
.cover { position: relative; }
.cover.tier-chrome { border-color: #c9d1da; }

/* Master set Or : liseré doré */
.cover.tier-gold {
  border-color: transparent;
  background: linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(120deg, #a07414, #ffe9a0, #c8962c, #fff3c4, #a07414) border-box;
  box-shadow: 0 0 22px rgb(232 193 90 / 0.25);
}

.ribbon {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  padding: 2px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1a1206;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.5);
}

.ribbon.gold { background: linear-gradient(110deg, #c8962c, #ffe9a0 50%, #c8962c); }
.ribbon.chrome { background: linear-gradient(110deg, #9aa3ad, #f4f7fa 50%, #9aa3ad); }

.tier-lbl { flex: 0 0 46px; font-size: 11px; font-weight: 700; color: var(--text-muted); }
.cover-progress.tier.chrome .meter > span { background: linear-gradient(90deg, #8e98a3, #f4f7fa, #8e98a3); }
.cover-progress.tier.gold .meter > span { background: linear-gradient(90deg, #a07414, #ffe9a0, #c8962c); }

/* Couverture : photo de la carte phare, bandeau façon album Panini */
.cover-art {
  position: relative;
  height: 130px;
  overflow: hidden;
  background: radial-gradient(circle at 50% 90%, color-mix(in srgb, var(--tc) 55%, transparent), transparent 70%), #16181c;
}

.cover-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 25%;
  filter: saturate(0.9);
  transition: transform 0.5s var(--ease);
}

.cover:hover .cover-art img { transform: scale(1.05); }

.cover-art::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgb(16 17 20 / 0.9));
}

.cover-band {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px;
}

.cover-count {
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 11px;
  background: rgb(0 0 0 / 0.6);
}

.cover-body { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px 14px; }
.cover-title { font-size: 17px; font-weight: 900; line-height: 1.15; }
.cover-sub { font-size: 12px; }
.cover-progress { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
.cover-progress .meter { flex: 1; }
.cover-progress .meter > span { background: var(--accent); }
.cover.complete .meter > span { background: #e8c15a; }
.small { font-size: 12px; }

.cover-reward { display: inline-flex; align-items: center; gap: 5px; color: #e8c15a; font-weight: 700; }
.cover-reward.ready { animation: glow 1.6s ease-in-out infinite alternate; }
.cover.claimed .cover-reward { color: var(--success, #3ecf8e); }

@keyframes glow {
  to { text-shadow: 0 0 10px rgb(232 193 90 / 0.8); }
}

@media (prefers-reduced-motion: reduce) {
  .cover-reward.ready { animation: none; }
}
</style>
