<template>
  <transition name="fade">
    <div v-if="open" class="backdrop" @click.self="close">
      <div class="dialog card" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <button class="close" aria-label="Fermer" @click="close"><Icon name="x" /></button>

        <!-- Compte relié à un email -->
        <template v-if="!col.isGuest">
          <div class="eyebrow">Mon compte</div>
          <h2 id="account-title" class="title-md">{{ col.profile?.username ?? 'Choisis ton pseudo' }}</h2>
          <p class="muted small">{{ col.email }}</p>

          <form class="form" @submit.prevent="submitUsername">
            <label class="label" for="username">Pseudo public</label>
            <div class="row">
              <input id="username" v-model.trim="username" class="input" maxlength="20" placeholder="Ton pseudo" autocomplete="nickname" />
              <button class="btn" :disabled="busy || !username || username === col.profile?.username">Enregistrer</button>
            </div>
            <p class="hint muted">3 à 20 caractères : lettres, chiffres ou _. Il apparaît dans le classement et sur ta vitrine.</p>
          </form>

          <div class="links">
            <router-link v-if="col.profile?.username" :to="`/joueurs/${col.profile.username}`" class="link-arrow" @click="close">
              Mon profil public : avatar, titre, amis →
            </router-link>
            <button class="link-quiet" :disabled="busy" @click="logout">Se déconnecter</button>
          </div>
        </template>

        <!-- Session invité : sauvegarder ou se connecter -->
        <template v-else>
          <div class="eyebrow">Collection invité</div>
          <h2 id="account-title" class="title-md">{{ mode === 'login' ? 'Se connecter' : 'Sauvegarde ta collection' }}</h2>
          <p class="dim small">
            <template v-if="mode === 'login'">Retrouve ta collection sur cet appareil avec le code reçu par email.</template>
            <template v-else>Relie tes {{ col.ownedCount }} cartes à ton email pour les retrouver sur tous tes appareils et apparaître dans le classement. Aucun mot de passe : un code te sera envoyé.</template>
          </p>

          <form v-if="step === 'email'" class="form" @submit.prevent="sendCode">
            <label class="label" for="email">Email</label>
            <div class="row">
              <input id="email" v-model.trim="email" class="input" type="email" required placeholder="nom@exemple.fr" autocomplete="email" />
              <button class="btn" :disabled="busy || !email">Recevoir le code</button>
            </div>
            <p v-if="mode === 'login' && col.ownedCount" class="warning small">
              Les {{ col.ownedCount }} cartes de cette session invité ne seront pas transférées sur ton compte.
            </p>
          </form>

          <form v-else class="form" @submit.prevent="verifyCode">
            <label class="label" for="code">Code reçu à {{ email }}</label>
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
              <button class="btn" :disabled="busy || code.length !== 6">Valider</button>
            </div>
            <button type="button" class="link-quiet" @click="step = 'email'">Changer d'email</button>
          </form>

          <button class="link-quiet switch" @click="switchMode">
            {{ mode === 'login' ? 'Pas encore de compte ? Sauvegarder cette collection' : "J'ai déjà un compte" }}
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
import Icon from '@/components/Icon.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { linkEmail, sendLoginCode, signOut, verifyLinkCode, verifyLoginCode } from '@/services/collection'

const props = defineProps({
  open: { type: Boolean, default: false },
})
// done : action terminée avec succès, la fenêtre se ferme et la page affiche le message
const emit = defineEmits(['close', 'done'])

const col = useCollectionStore()

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
    step.value = 'email'
    code.value = ''
    error.value = ''
    info.value = ''
    username.value = col.profile?.username ?? ''
  },
)

const MESSAGES = {
  USERNAME_TAKEN: 'Ce pseudo est déjà pris.',
  USERNAME_INVALID: 'Pseudo invalide : 3 à 20 lettres, chiffres ou _.',
  email_exists: 'Cet email a déjà un compte : utilise « J’ai déjà un compte ».',
  otp_expired: 'Code invalide ou expiré.',
  otp_disabled: 'Aucun compte avec cet email : sauvegarde d’abord une collection.',
  over_email_send_rate_limit: 'Trop de demandes, réessaie dans quelques minutes.',
}

function fail(err) {
  error.value = MESSAGES[err.code] ?? err.message
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
    info.value = 'Code envoyé, vérifie ta boîte mail.'
  })

const verifyCode = () =>
  run(async () => {
    await (mode.value === 'login' ? verifyLoginCode(email.value, code.value) : verifyLinkCode(email.value, code.value))
    await col.reload()
    username.value = col.profile?.username ?? ''
    // Compte qui a déjà un pseudo : plus rien à faire ici
    if (col.profile?.username) return finish(`Connecté en tant que @${col.profile.username} : ta collection est chargée.`)
    info.value = mode.value === 'login' ? 'Connecté ! Choisis maintenant ton pseudo.' : 'Collection sauvegardée ! Choisis maintenant ton pseudo.'
  })

const submitUsername = () =>
  run(async () => {
    const first = !col.profile?.username
    await col.setUsername(username.value)
    finish(first ? `Bienvenue @${username.value} ! Tu apparais maintenant dans le classement.` : `Pseudo changé : @${username.value}`)
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
</style>
