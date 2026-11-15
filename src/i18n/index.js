import { createI18n } from 'vue-i18n'
import fr from './locales/fr'
import en from './locales/en'

const STORAGE_KEY = 'devosi.lang'
export const LOCALES = ['fr', 'en']

/** Langue de départ : le choix enregistré, sinon celle du navigateur (français par défaut) */
function initialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (LOCALES.includes(saved)) return saved
  } catch {
    // stockage indisponible (navigation privée) : on suit le navigateur
  }
  const nav = (navigator.languages?.[0] || navigator.language || 'fr').toLowerCase()
  return nav.startsWith('fr') ? 'fr' : 'en'
}

/**
 * Pluriels : en français, 0 et 1 sont au singulier (« 0 carte », « 1 carte », « 2 cartes »).
 * Deux formes « singulier | pluriel », ou trois « zéro | singulier | pluriel ».
 */
function frPlural(choice, choicesLength) {
  const n = Math.abs(choice)
  if (choicesLength === 2) return n > 1 ? 1 : 0
  return n === 0 ? 0 : n === 1 ? 1 : 2
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale(),
  fallbackLocale: 'fr',
  messages: { fr, en },
  pluralRules: { fr: frPlural },
  missingWarn: false,
  fallbackWarn: false,
})

document.documentElement.lang = i18n.global.locale.value
document.title = i18n.global.t('app.title')

/** Traduction hors composants (stores, services, utilitaires) */
export const t = (...args) => i18n.global.t(...args)

/** Langue courante ('fr' ou 'en') */
export const locale = () => i18n.global.locale.value

/** Locale à passer à Intl / toLocaleString pour les dates et nombres */
export const intlLocale = () => (locale() === 'en' ? 'en-GB' : 'fr-FR')

/** Change la langue de l'app et la mémorise sur cet appareil */
export function setLocale(lang) {
  if (!LOCALES.includes(lang)) return
  i18n.global.locale.value = lang
  document.documentElement.lang = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // tant pis : la langue revient à celle du navigateur au prochain chargement
  }
}
