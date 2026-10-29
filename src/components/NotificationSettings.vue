<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="open" class="backdrop" @click.self="$emit('close')">
        <div class="dialog card" role="dialog" aria-modal="true" aria-labelledby="notif-title">
          <button class="close" aria-label="Fermer" @click="$emit('close')"><Icon name="x" /></button>
          <h2 id="notif-title" class="title-md">Notifications</h2>

          <!-- iPhone dans Safari : installer l'appli d'abord -->
          <div v-if="install" class="install">
            <p class="dim">Sur iPhone, Apple n'autorise les notifications que pour une appli installée sur l'écran d'accueil.</p>
            <ol class="steps">
              <li><span class="num">1</span> Touche <b>Partager</b> en bas de Safari</li>
              <li><span class="num">2</span> Choisis <b>Sur l'écran d'accueil</b></li>
              <li><span class="num">3</span> Ouvre Devosi depuis l'icône, puis reviens ici pour activer les notifications</li>
            </ol>
            <p class="muted small">Bonus : plein écran, sans barre d'adresse, comme une vraie appli.</p>
          </div>

          <template v-else>
            <!-- État sur cet appareil -->
            <div class="device" :class="{ on: subscribed }">
              <Icon :name="subscribed ? 'check' : 'bell'" :size="18" />
              <span>{{ deviceLabel }}</span>
              <button v-if="!supported" class="hidden" disabled></button>
              <button v-else-if="subscribed" class="link-arrow" :disabled="busy" @click="disable">Désactiver</button>
              <button v-else-if="perm !== 'denied'" class="btn" :disabled="busy" @click="enable">Activer</button>
            </div>
            <p v-if="perm === 'denied'" class="muted small">
              Ton navigateur bloque les notifications de Devosi : autorise-les dans les réglages du site (icône à gauche de l'adresse), puis recharge la page.
            </p>

            <!-- Sujets -->
            <ul class="prefs">
              <li v-for="p in PREFS" :key="p.id">
                <span class="ico"><Icon :name="p.icon" :size="16" /></span>
                <span class="pref-text">
                  <span>{{ p.label }}</span>
                  <span class="muted small">{{ p.hint }}</span>
                </span>
                <button
                  class="switch"
                  role="switch"
                  :aria-checked="prefs[p.id]"
                  :aria-label="p.label"
                  :disabled="busy || !settings"
                  @click="toggle(p.id)"
                ></button>
              </li>
            </ul>

            <div class="foot">
              <span class="muted small">3 rappels par jour au maximum (les échanges et les amis ne comptent pas).</span>
              <button v-if="subscribed" class="btn btn-ghost small-btn" :disabled="busy" @click="test">Envoyer un test</button>
            </div>
          </template>

          <p v-if="message" class="small" :class="messageError ? 'error' : 'success'">{{ message }}</p>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import {
  currentSubscription,
  disablePush,
  enablePush,
  fetchNotifySettings,
  needsInstall,
  permission,
  pushSupported,
  saveNotifyPrefs,
  sendTestNotification,
} from '@/services/push'

const props = defineProps({ open: { type: Boolean, default: false } })
defineEmits(['close'])

const PREFS = [
  { id: 'packs', icon: 'package', label: 'Packs', hint: 'Réserve pleine, pack GP du week-end disponible' },
  { id: 'predictions', icon: 'flag', label: 'Pronostics', hint: 'Fermeture dans 1 h, résultats et gains à récupérer' },
  { id: 'quests', icon: 'trophy', label: 'Quêtes', hint: 'À 20 h si ta série est en danger' },
  { id: 'social', icon: 'swap', label: 'Échanges et amis', hint: "Proposition reçue ou acceptée, demande d'ami" },
  { id: 'quiet', icon: 'clock', label: 'Heures calmes', hint: 'Rien entre 22 h et 8 h (envoyé au réveil)' },
]

const supported = pushSupported()
const install = needsInstall()
const perm = ref(permission())
const subscribed = ref(false)
const settings = ref(null)
const prefs = reactive({ packs: true, predictions: true, quests: true, social: true, quiet: true })
const busy = ref(false)
const message = ref('')
const messageError = ref(false)

const deviceLabel = computed(() => {
  if (!supported) return "Ce navigateur ne reçoit pas les notifications push"
  if (subscribed.value) return 'Activées sur cet appareil'
  if (perm.value === 'denied') return 'Bloquées par le navigateur'
  return 'Pas encore activées sur cet appareil'
})

async function refresh() {
  message.value = ''
  perm.value = permission()
  subscribed.value = Boolean(await currentSubscription().catch(() => null)) && perm.value === 'granted'
  try {
    settings.value = await fetchNotifySettings()
    Object.assign(prefs, settings.value.prefs)
  } catch {
    settings.value = null
  }
}

watch(() => props.open, (open) => open && !install && refresh())

async function run(action, success) {
  busy.value = true
  message.value = ''
  messageError.value = false
  try {
    await action()
    message.value = success
  } catch (err) {
    messageError.value = true
    console.error('[notifications]', err)
    message.value =
      err.code === 'PUSH_DENIED'
        ? 'Autorisation refusée : tu peux la changer dans les réglages du site.'
        : err.code === 'PUSH_BRAVE'
          ? 'Brave bloque les notifications push par défaut : active « Utiliser les services Google pour les messages push » dans brave://settings/privacy, redémarre Brave, puis réessaie.'
          : err.code === 'PUSH_SERVICE'
            ? "Le service de notifications du navigateur a refusé l'abonnement. Réessaie, ou essaie avec un autre navigateur."
            : err.hint === 'PUSH_NO_DEVICE'
              ? "Active d'abord les notifications sur cet appareil."
              : `Ça n'a pas marché (${err.message ?? 'erreur inconnue'}), réessaie.`
  } finally {
    busy.value = false
    perm.value = permission()
  }
}

const enable = () =>
  run(async () => {
    settings.value = await enablePush()
    subscribed.value = true
  }, 'Notifications activées sur cet appareil.')

const disable = () =>
  run(async () => {
    await disablePush()
    subscribed.value = false
  }, 'Notifications désactivées sur cet appareil.')

const toggle = (id) =>
  run(async () => {
    prefs[id] = !prefs[id]
    settings.value = await saveNotifyPrefs({ [id]: prefs[id] })
  }, '')

const test = () => run(() => sendTestNotification(), 'Notification de test envoyée : elle arrive dans quelques secondes.')
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 210;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(5 6 8 / 0.82);
}

.dialog {
  position: relative;
  width: min(520px, 100%);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px;
}

.dialog .title-md { margin: 0; padding-right: 40px; }

.close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  color: var(--text-dim);
  background: var(--surface-2);
  cursor: pointer;
}

.device {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.device > span { flex: 1; font-weight: 600; }
.device > .icon { color: var(--text-muted); }
.device.on { border-color: color-mix(in srgb, var(--success) 40%, transparent); }
.device.on > .icon { color: var(--success); }
.hidden { display: none; }

.prefs { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; }

.prefs li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}

.prefs li:last-child { border-bottom: none; }

.ico {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: var(--accent);
  background: var(--accent-soft);
}

.pref-text { flex: 1; display: flex; flex-direction: column; gap: 1px; }

.switch {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 22px;
  border: none;
  border-radius: 99px;
  background: var(--surface-3);
  cursor: pointer;
  transition: background var(--t);
}

.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform var(--t);
}

.switch[aria-checked='true'] { background: var(--accent); }
.switch[aria-checked='true']::after { transform: translateX(18px); }
.switch:disabled { opacity: 0.5; cursor: default; }

.foot { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.small-btn { padding: 6px 12px; font-size: 13px; }

.install { display: flex; flex-direction: column; gap: 12px; }
.install p { margin: 0; }
.steps { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.steps li { display: flex; align-items: flex-start; gap: 10px; }

.num {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: var(--accent);
}

.small { font-size: 13px; }
.error { color: var(--danger); margin: 0; }
.success { color: var(--success); margin: 0; }
.btn:disabled { opacity: 0.55; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
