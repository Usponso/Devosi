<template>
  <div class="page quests-page">
    <header class="container page-head">
      <div class="eyebrow">Cartes</div>
      <h1 class="title-lg">Quêtes</h1>
      <p class="dim">4 quêtes par jour pour gagner des Pièces et des packs bonus. Termine-les toutes pour faire grandir ta série.</p>
    </header>

    <div class="container">
      <p v-if="!col.configured" class="card empty">La collection n'est pas encore configurée.</p>
      <section v-else class="card panel">
        <QuestsPanel v-if="col.ready" />
        <p v-else class="muted">Chargement…</p>
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
