<template>
  <div class="news-page">
    <div class="page-hero container">
      <div class="page-hero-label badge badge-gray">Formule 1</div>
      <h1 class="page-hero-title font-display">Actualités</h1>
      <p class="page-hero-sub text-dim">Les dernières nouvelles du paddock</p>
    </div>

    <div class="container">
      <!-- Featured -->
      <div class="featured-grid" v-if="store.featuredNews.length">
        <div
          v-for="article in store.featuredNews"
          :key="article.id"
          class="featured-card card card-clickable"
        >
          <div class="fc-image-placeholder" :style="{ background: `linear-gradient(135deg, rgba(232,0,45,0.1), var(--surface2))` }">
            <div class="fcp-icon font-display">F1</div>
          </div>
          <div class="fc-body">
            <div class="fc-top">
              <span class="badge badge-red">{{ article.category }}</span>
              <span class="text-muted font-mono" style="font-size:11px">{{ article.readTime }}</span>
            </div>
            <div class="fc-title">{{ article.title }}</div>
            <div class="fc-summary text-dim">{{ article.summary }}</div>
            <div class="fc-footer">
              <span class="text-muted" style="font-size:12px">{{ formatDate(article.date) }}</span>
              <span class="text-red" style="font-size:13px;font-weight:600">Lire →</span>
            </div>
          </div>
        </div>
      </div>

      <!-- All news -->
      <div class="news-section">
        <h2 class="news-section-title font-display">Toutes les news</h2>
        <div class="news-list">
          <div
            v-for="article in store.news"
            :key="article.id"
            class="news-item card card-clickable"
          >
            <div class="ni-cat badge" :class="getCatBadge(article.category)">{{ article.category }}</div>
            <div class="ni-content">
              <div class="ni-title">{{ article.title }}</div>
              <div class="ni-summary text-dim">{{ article.summary }}</div>
            </div>
            <div class="ni-meta">
              <div class="ni-date font-mono text-muted">{{ formatDate(article.date) }}</div>
              <div class="ni-read text-dim">{{ article.readTime }}</div>
            </div>
            <div class="ni-arrow text-red">→</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useF1Store } from '@/stores/f1Store'

const store = useF1Store()

const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const getCatBadge = (cat) => {
  const map = { 'Course': 'badge-red', 'Technique': 'badge-gold', 'Interview': 'badge-gold', 'Preview': 'badge-gray', 'Championnat': 'badge-gray' }
  return map[cat] || 'badge-gray'
}
</script>

<style scoped>
/* Featured */
.featured-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
  margin-bottom: 48px;
}

.featured-card {
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.fc-image-placeholder {
  height: 180px;
  border-radius: 10px 10px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.fcp-icon {
  font-size: 64px;
  opacity: 0.15;
  color: var(--red);
}

.fc-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fc-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fc-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.fc-summary {
  font-size: 14px;
  line-height: 1.6;
  flex: 1;
}

.fc-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

/* News list */
.news-section { padding-bottom: 48px; }

.news-section-title {
  font-size: 32px;
  margin-bottom: 20px;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.news-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  cursor: pointer;
}

.ni-cat { flex-shrink: 0; }

.ni-content { flex: 1; min-width: 0; }

.ni-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ni-summary {
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ni-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.ni-date { font-size: 11px; }
.ni-read { font-size: 12px; }
.ni-arrow { font-size: 16px; flex-shrink: 0; }

@media (max-width: 768px) {
  .featured-grid { grid-template-columns: 1fr; }
  .ni-meta { display: none; }
}
</style>
