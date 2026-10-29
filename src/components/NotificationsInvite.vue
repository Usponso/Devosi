<template>
  <div v-if="visible" class="invite">
    <span class="bell"><Icon name="bell" :size="22" /></span>
    <span class="text">
      <b>Ne rate plus rien</b>
      <span class="muted">Réserve pleine, pronostics qui ferment, échanges reçus… On te prévient, et tu choisis quoi.</span>
    </span>
    <span class="actions">
      <button class="btn btn-ghost" @click="dismiss">Plus tard</button>
      <button class="btn" @click="settingsOpen = true">{{ installFirst ? "Installer l'appli" : 'Activer les notifications' }}</button>
    </span>
    <NotificationSettings :open="settingsOpen" @close="onClose" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import NotificationSettings from '@/components/NotificationSettings.vue'
import { currentSubscription, needsInstall, permission, pushSupported } from '@/services/push'

/**
 * Invitation à activer les notifications : une carte dans la page (jamais une demande
 * surprise du navigateur), masquée une fois activées, refusées ou repoussées.
 */
const KEY = 'devosi:push-invite'

const installFirst = needsInstall()
const settingsOpen = ref(false)
const subscribed = ref(true)
const dismissed = ref(true)

const visible = computed(
  () => !dismissed.value && !subscribed.value && (installFirst || (pushSupported() && permission() === 'default')),
)

onMounted(async () => {
  try {
    dismissed.value = Boolean(localStorage.getItem(KEY))
  } catch {
    dismissed.value = false
  }
  subscribed.value = Boolean(await currentSubscription().catch(() => null))
})

function dismiss() {
  dismissed.value = true
  try {
    localStorage.setItem(KEY, String(Date.now()))
  } catch {
    /* navigation privée : l'invitation reviendra */
  }
}

async function onClose() {
  settingsOpen.value = false
  subscribed.value = Boolean(await currentSubscription().catch(() => null))
}
</script>

<style scoped>
.invite {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
  padding: 14px 16px;
  border-radius: 14px;
  text-align: left;
  border: 1px solid rgb(225 6 0 / 0.4);
  background: linear-gradient(90deg, rgb(225 6 0 / 0.1), transparent 70%), var(--surface-2);
}

.bell {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #ff8a8a;
  background: rgb(225 6 0 / 0.16);
}

.text { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 2px; font-size: 14px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.actions .btn { padding: 8px 14px; font-size: 13px; }
</style>
