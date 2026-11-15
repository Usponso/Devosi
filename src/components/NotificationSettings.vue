<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="open" class="backdrop" @click.self="$emit('close')">
        <div class="dialog card" role="dialog" aria-modal="true" aria-labelledby="notif-title">
          <button class="close" :aria-label="$t('common.close')" @click="$emit('close')"><Icon name="x" /></button>
          <h2 id="notif-title" class="title-md">{{ $t('notif.title') }}</h2>

          <!-- iPhone dans Safari : installer l'appli d'abord -->
          <div v-if="install" class="install">
            <p class="dim">{{ $t('notif.iosIntro') }}</p>
            <ol class="steps">
              <li><span class="num">1</span> <i18n-t keypath="notif.iosStep1" scope="global"><template #share><b>{{ $t('notif.share') }}</b></template></i18n-t></li>
              <li><span class="num">2</span> <i18n-t keypath="notif.iosStep2" scope="global"><template #home><b>{{ $t('notif.homeScreen') }}</b></template></i18n-t></li>
              <li><span class="num">3</span> {{ $t('notif.iosStep3') }}</li>
            </ol>
            <p class="muted small">{{ $t('notif.iosBonus') }}</p>
          </div>

          <template v-else>
            <!-- État sur cet appareil -->
            <div class="device" :class="{ on: subscribed }">
              <Icon :name="subscribed ? 'check' : 'bell'" :size="18" />
              <span>{{ deviceLabel }}</span>
              <button v-if="!supported" class="hidden" disabled></button>
              <button v-else-if="subscribed" class="link-arrow" :disabled="busy" @click="disable">{{ $t('notif.disable') }}</button>
              <button v-else-if="perm !== 'denied'" class="btn" :disabled="busy" @click="enable">{{ $t('notif.enable') }}</button>
            </div>
            <p v-if="perm === 'denied'" class="muted small">
              {{ $t('notif.denied') }}
            </p>

            <!-- Sujets -->
            <ul class="prefs">
              <li v-for="p in PREFS" :key="p.id">
                <span class="ico"><Icon :name="p.icon" :size="16" /></span>
                <span class="pref-text">
                  <span>{{ $t(`notif.prefs.${p.id}.label`) }}</span>
                  <span class="muted small">{{ $t(`notif.prefs.${p.id}.hint`) }}</span>
                </span>
                <button
                  class="switch"
                  role="switch"
                  :aria-checked="prefs[p.id]"
                  :aria-label="$t(`notif.prefs.${p.id}.label`)"
                  :disabled="busy || !settings"
                  @click="toggle(p.id)"
                ></button>
              </li>
            </ul>

            <div class="foot">
              <span class="muted small">{{ $t('notif.max') }}</span>
              <button v-if="subscribed" class="btn btn-ghost small-btn" :disabled="busy" @click="test">{{ $t('notif.test') }}</button>
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
import { useI18n } from 'vue-i18n'
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
const { t } = useI18n()

const PREFS = [
  // Libellés : notif.prefs.<id>.label / .hint
  { id: 'packs', icon: 'package' },
  { id: 'predictions', icon: 'flag' },
  { id: 'quests', icon: 'trophy' },
  { id: 'social', icon: 'swap' },
  { id: 'quiet', icon: 'clock' },
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
  if (!supported) return t('notif.unsupported')
  if (subscribed.value) return t('notif.on')
  if (perm.value === 'denied') return t('notif.blocked')
  return t('notif.off')
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
        ? t('notif.errDenied')
        : err.code === 'PUSH_BRAVE'
          ? t('notif.errBrave')
          : err.code === 'PUSH_SERVICE'
            ? t('notif.errService')
            : err.hint === 'PUSH_NO_DEVICE'
              ? t('notif.errNoDevice')
              : t('notif.errOther', { message: err.message ?? t('notif.unknown') })
  } finally {
    busy.value = false
    perm.value = permission()
  }
}

const enable = () =>
  run(async () => {
    settings.value = await enablePush()
    subscribed.value = true
  }, t('notif.enabled'))

const disable = () =>
  run(async () => {
    await disablePush()
    subscribed.value = false
  }, t('notif.disabled'))

const toggle = (id) =>
  run(async () => {
    prefs[id] = !prefs[id]
    settings.value = await saveNotifyPrefs({ [id]: prefs[id] })
  }, '')

const test = () => run(() => sendTestNotification(), t('notif.testSent'))
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
