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
          :class="{ complete: album.stats.complete, claimed: album.stats.claimed }"
        >
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
            <span class="cover-reward small" :class="{ ready: album.stats.complete && !album.stats.claimed }">
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
