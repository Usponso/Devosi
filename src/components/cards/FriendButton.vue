<template>
  <div v-if="status !== 'self'" class="friend-button">
    <template v-if="status === 'incoming'">
      <button class="btn" :disabled="busy" @click="act('accept')"><Icon name="user-check" :size="16" /> Accepter</button>
      <button class="btn btn-ghost" :disabled="busy" @click="act('decline')">Refuser</button>
    </template>
    <template v-else-if="status === 'friends'">
      <span class="state"><Icon name="user-check" :size="16" /> Ami</span>
      <button class="link-quiet" :disabled="busy" @click="act('remove')">Retirer</button>
    </template>
    <template v-else-if="status === 'outgoing'">
      <span class="state muted"><Icon name="clock" :size="16" /> Demande envoyée</span>
      <button class="link-quiet" :disabled="busy" @click="act('remove')">Annuler</button>
    </template>
    <button v-else class="btn" :disabled="busy" @click="act('add')"><Icon name="user-plus" :size="16" /> Ajouter en ami</button>
    <p v-if="error" class="error">
      {{ error }}
      <router-link v-if="needsProfile" to="/collection" class="link-arrow">Ma collection →</router-link>
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { economyMessage } from '@/utils/cards'

/** Relation avec un joueur (none, outgoing, incoming, friends, self) et actions associées */
const props = defineProps({
  username: { type: String, required: true },
  status: { type: String, default: 'none' },
})
const emit = defineEmits(['update:status'])

const col = useCollectionStore()
const busy = ref(false)
const error = ref('')
const needsProfile = ref(false)

async function act(action) {
  busy.value = true
  error.value = ''
  needsProfile.value = false
  try {
    emit('update:status', await col.friendAction(action, props.username))
  } catch (err) {
    needsProfile.value = err.code === 'PROFILE_REQUIRED'
    error.value = economyMessage(err)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.friend-button {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 14px;
}

.link-quiet {
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.link-quiet:hover { color: var(--text); }
.btn:disabled { opacity: 0.5; }

.error {
  flex-basis: 100%;
  font-size: 13px;
  color: var(--danger);
}
</style>
