<template>
  <div class="page quests-page">
    <header class="container page-head">
      <div class="eyebrow">{{ $t('common.cardsSection') }}</div>
      <h1 class="title-lg">{{ $t('quests.page') }}</h1>
      <p class="dim">{{ $t('quests.pageText') }}</p>
    </header>

    <div class="container">
      <p v-if="!col.configured" class="card empty">{{ $t('common.notConfigured') }}</p>
      <section v-else class="card panel">
        <QuestsPanel v-if="col.ready" />
        <p v-else class="muted">{{ $t('common.loading') }}</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import QuestsPanel from '@/components/cards/QuestsPanel.vue'
import { useCollectionStore } from '@/stores/collectionStore'

const col = useCollectionStore()
onMounted(() => !col.ready && col.init())
</script>

<style scoped>
.page-head {
  padding-top: 32px;
  padding-bottom: 20px;
}

.page-head .title-lg { margin: 6px 0 6px; }
.panel { padding: 22px 24px; }

@media (max-width: 640px) {
  .panel { padding: 18px 16px; }
}
</style>
