import { computed, ref } from 'vue'
import { isIos, isStandalone } from '@/services/push'

/**
 * Installation de l'appli (PWA). Chrome / Edge / Android envoient `beforeinstallprompt` :
 * on le garde pour proposer notre propre bouton « Installer ». Sur iPhone, aucun événement :
 * il faut passer par Partager → Sur l'écran d'accueil.
 */
const deferred = ref(null)
const installed = ref(isStandalone())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred.value = e
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    deferred.value = null
  })
}

export function useInstall() {
  /** Installation proposable : bouton natif (Android, ordinateur) ou étapes (iPhone) */
  const canInstall = computed(() => !installed.value && (Boolean(deferred.value) || isIos()))
  const iosSteps = computed(() => !installed.value && !deferred.value && isIos())

  /** Ouvre la fenêtre d'installation du navigateur ; renvoie true si acceptée */
  async function install() {
    const e = deferred.value
    if (!e) return false
    e.prompt()
    const { outcome } = await e.userChoice
    deferred.value = null
    if (outcome === 'accepted') installed.value = true
    return outcome === 'accepted'
  }

  return { canInstall, iosSteps, installed, install }
}
