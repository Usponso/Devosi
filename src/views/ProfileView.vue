<template>
  <PlayerView v-if="col.isPlayer" :username="col.profile.username" />

  <div v-else class="page my-profile">
    <div class="container body">
      <p v-if="!col.configured" class="card empty">{{ $t('common.notConfigured') }}</p>
      <p v-else-if="!col.ready" class="card empty muted">{{ $t('common.loading') }}</p>

      <!-- Invité ou compte sans pseudo : ce que le profil public apporte -->
      <section v-else class="card invite">
        <div class="eyebrow">{{ $t('account.profile') }}</div>
        <h1 class="title-lg">{{ $t('profileInvite.title') }}</h1>
        <p class="dim">
          {{ col.isGuest ? $t('profileInvite.textGuest') : $t('profileInvite.text') }}
        </p>
        <ul class="perks">
          <li><Icon name="user" :size="18" /> {{ $t('profileInvite.perk1') }}</li>
          <li><Icon name="star" :size="18" /> {{ $t('profileInvite.perk2') }}</li>
          <li><Icon name="trophy" :size="18" /> {{ $t('profileInvite.perk3') }}</li>
          <li><Icon name="users" :size="18" /> {{ $t('profileInvite.perk4') }}</li>
          <li><Icon name="coin" :size="18" /> {{ $t('profileInvite.perk5') }}</li>
        </ul>
        <button class="btn" @click="accountOpen = true">
          <Icon name="save" :size="16" /> {{ col.isGuest ? $t('profileInvite.saveBtn') : $t('account.pickUsername') }}
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
