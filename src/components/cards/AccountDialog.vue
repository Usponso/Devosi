<template>
  <transition name="fade">
    <div v-if="open" class="backdrop" @click.self="close">
      <div class="dialog card" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <button class="close" :aria-label="$t('common.close')" @click="close"><Icon name="x" /></button>

        <!-- Compte relié à un email -->
        <template v-if="!col.isGuest">
          <div class="eyebrow">{{ $t('account.account') }}</div>
          <h2 id="account-title" class="title-md">{{ col.profile?.username ?? $t('accountDialog.pickUsername') }}</h2>
          <p class="muted small">{{ col.email }}</p>

          <form class="form" @submit.prevent="submitUsername">
            <label class="label" for="username">{{ $t('accountDialog.username') }}</label>
            <div class="row">
              <input id="username" v-model.trim="username" class="input" maxlength="20" :placeholder="$t('accountDialog.usernamePlaceholder')" autocomplete="nickname" />
              <button class="btn" :disabled="busy || !username || username === col.profile?.username">{{ $t('common.save') }}</button>
            </div>
            <p class="hint muted">{{ $t('accountDialog.usernameHint') }}</p>
          </form>

          <div class="links">
            <router-link v-if="col.profile?.username" :to="`/joueurs/${col.profile.username}`" class="link-arrow" @click="close">
              {{ $t('accountDialog.publicProfile') }}
            </router-link>
            <button class="link-quiet" :disabled="busy" @click="logout">{{ $t('account.logout') }}</button>
          </div>
        </template>

        <!-- Session invité : sauvegarder ou se connecter -->
        <template v-else>
          <div class="eyebrow">{{ $t('accountDialog.guest') }}</div>
          <h2 id="account-title" class="title-md">{{ mode === 'login' ? $t('account.login') : $t('accountDialog.saveTitle') }}</h2>
          <p class="dim small">
            <template v-if="mode === 'login'">{{ $t('accountDialog.loginText') }}</template>
            <template v-else>{{ $t('accountDialog.saveText', { n: col.ownedCount }) }}</template>
          </p>

          <form v-if="step === 'email'" class="form" @submit.prevent="sendCode">
            <label class="label" for="email">{{ $t('accountDialog.email') }}</label>
            <div class="row">
              <input id="email" v-model.trim="email" class="input" type="email" required :placeholder="$t('accountDialog.emailPlaceholder')" autocomplete="email" />
              <button class="btn" :disabled="busy || !email">{{ $t('accountDialog.sendCode') }}</button>
            </div>
            <p v-if="mode === 'login' && col.ownedCount" class="warning small">
              {{ $t('accountDialog.guestLost', { n: col.ownedCount }) }}
            </p>
          </form>

          <form v-else class="form" @submit.prevent="verifyCode">
            <label class="label" for="code">{{ $t('accountDialog.codeFor', { email }) }}</label>
            <div class="row">
              <input
                id="code"
                v-model.trim="code"
                class="input mono code"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                placeholder="123456"
                required
              />
              <button class="btn" :disabled="busy || code.length !== 6">{{ $t('common.validate') }}</button>
            </div>
            <button type="button" class="link-quiet" @click="step = 'email'">{{ $t('accountDialog.changeEmail') }}</button>
          </form>

          <button class="link-quiet switch" @click="switchMode">
            {{ mode === 'login' ? $t('accountDialog.noAccount') : $t('accountDialog.haveAccount') }}
          </button>
        </template>

        <p v-if="error" class="error small">{{ error }}</p>
        <p v-if="info" class="info small">{{ info }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/Icon.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { linkEmail, sendLoginCode, signOut, verifyLinkCode, verifyLoginCode } from '@/services/collection'

const props = defineProps({
  open: { type: Boolean, default: false },
  // login : visiteur sans session (rien à sauvegarder), on propose directement la connexion
  startMode: { type: String, default: 'link' },
})
// done : action terminée avec succès, la fenêtre se ferme et la page affiche le message
const emit = defineEmits(['close', 'done'])

const col = useCollectionStore()
const { t, te } = useI18n()

const mode = ref('link') // link : relier la session invité ; login : compte existant
const step = ref('email')
const email = ref('')
const code = ref('')
const username = ref('')
const busy = ref(false)
const error = ref('')
const info = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    mode.value = props.startMode
    step.value = 'email'
    code.value = ''
    error.value = ''
    info.value = ''
    username.value = col.profile?.username ?? ''
  },
)

// Messages des erreurs connues (pseudo, codes Supabase Auth) : accountDialog.errors.<code>
function fail(err) {
  const key = `accountDialog.errors.${err.code}`
  error.value = err.code && te(key) ? t(key) : err.message
}

async function run(task) {
  busy.value = true
  error.value = ''
  info.value = ''
  try {
    await task()
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

function switchMode() {
  mode.value = mode.value === 'login' ? 'link' : 'login'
  step.value = 'email'
  error.value = ''
}

const sendCode = () =>
  run(async () => {
    await (mode.value === 'login' ? sendLoginCode(email.value) : linkEmail(email.value))
    step.value = 'code'
    info.value = t('accountDialog.codeSent')
  })

const verifyCode = () =>
  run(async () => {
    await (mode.value === 'login' ? verifyLoginCode(email.value, code.value) : verifyLinkCode(email.value, code.value))
    await col.reload()
    username.value = col.profile?.username ?? ''
    // Compte qui a déjà un pseudo : plus rien à faire ici
    if (col.profile?.username) return finish(t('accountDialog.loggedIn', { user: `@${col.profile.username}` }))
    info.value = mode.value === 'login' ? t('accountDialog.loggedInPick') : t('accountDialog.savedPick')
  })

const submitUsername = () =>
  run(async () => {
    const first = !col.profile?.username
    await col.setUsername(username.value)
    finish(first ? t('accountDialog.welcome', { user: `@${username.value}` }) : t('accountDialog.renamed', { user: `@${username.value}` }))
  })

const logout = () =>
  run(async () => {
    await signOut()
    await col.reload()
    mode.value = 'login'
  })

function close() {
  emit('close')
}

function finish(message) {
  emit('done', message)
  close()
}
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 210;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(5, 6, 8, 0.88);
}

.dialog {
  position: relative;
  width: min(460px, 100%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 28px;
}

.close {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 6px;
  color: var(--text-muted);
}

.small { font-size: 13px; }

.form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-dim);
  /* Email long : passe à la ligne au lieu de déborder */
  overflow-wrap: anywhere;
}

.row {
  display: flex;
  gap: 8px;
}

.input {
  flex: 1;
  min-width: 0;
  padding: 10px 14px;
  border-radius: 10px;
  font: inherit;
  font-size: 14px;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.input:focus { outline: none; border-color: var(--accent-line); }
.code { letter-spacing: 0.4em; font-size: 18px; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

.hint { font-size: 12px; }

.links {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.link-quiet {
  align-self: flex-start;
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.link-quiet:hover { color: var(--text); }
.switch { margin-top: 6px; }
.warning { color: var(--gold); }
.error { color: var(--danger); }
.info { color: var(--success); }

@media (max-width: 640px) {
  .dialog { padding: 24px 18px; }
  /* 16 px au moins : en dessous, Safari (iPhone) zoome sur le champ et décale la fenêtre */
  .input { font-size: 16px; }
  /* Champ puis bouton, l'un sous l'autre, chacun sur toute la largeur */
  .row { flex-direction: column; }
  .row .btn { justify-content: center; }
  .links { flex-wrap: wrap; }
  .link-quiet { white-space: nowrap; }
}
</style>
