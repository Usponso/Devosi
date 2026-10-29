<template>
  <PlayerView v-if="col.isPlayer" :username="col.profile.username" />

  <div v-else class="page my-profile">
    <div class="container body">
      <p v-if="!col.configured" class="card empty">La collection n'est pas encore configurée.</p>
      <p v-else-if="!col.ready" class="card empty muted">Chargement…</p>

      <!-- Invité ou compte sans pseudo : ce que le profil public apporte -->
      <section v-else class="card invite">
        <div class="eyebrow">Mon profil</div>
        <h1 class="title-lg">Crée ton profil public</h1>
        <p class="dim">
          {{ col.isGuest ? 'Sauvegarde ta collection avec ton email, choisis un pseudo' : 'Choisis un pseudo' }}
          et ta page de joueur s'affiche dans le classement, visible par tes amis.
        </p>
        <ul class="perks">
          <li><Icon name="user" :size="18" /> Un avatar tiré de tes cartes, dans le cadre de sa rareté</li>
          <li><Icon name="star" :size="18" /> Ta vitrine : tes 5 plus belles cartes</li>
          <li><Icon name="trophy" :size="18" /> Un titre et 3 badges de succès sous ton pseudo</li>
          <li><Icon name="users" :size="18" /> Des amis et un classement entre vous</li>
          <li><Icon name="coin" :size="18" /> 200 Pièces quand ton profil est complet</li>
        </ul>
        <button class="btn" @click="accountOpen = true">
          <Icon name="save" :size="16" /> {{ col.isGuest ? 'Sauvegarder ma collection' : 'Choisir un pseudo' }}
        </button>
      </section>
    </div>

    <AccountDialog :open="accountOpen" @close="accountOpen = false" @done="accountOpen = false" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import AccountDialog from '@/components/cards/AccountDialog.vue'
import PlayerView from '@/views/PlayerView.vue'
import { useCollectionStore } from '@/stores/collectionStore'

// Racine unique (aucun commentaire au-dessus) : les transitions de page en ont besoin.
// Joueur avec un pseudo : sa page publique, modifiable sur place ; sinon l'invitation.
const col = useCollectionStore()
const accountOpen = ref(false)

onMounted(() => !col.ready && col.init())
</script>

<style scoped>
.body { padding-top: 32px; }
.empty { padding: 24px; }

.invite {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  max-width: 640px;
  padding: 28px;
}

.invite .title-lg { margin: 0; }
.invite p { margin: 0; }

.perks {
  margin: 4px 0 8px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.perks li { display: flex; align-items: center; gap: 10px; }
.perks .icon { color: var(--accent); flex-shrink: 0; }

@media (max-width: 640px) {
  .invite { padding: 20px 16px; }
}
</style>
