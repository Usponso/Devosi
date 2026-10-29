/**
 * Notifications push : service worker, autorisation du navigateur et abonnement de
 * l'appareil (enregistré côté Supabase). L'envoi est fait par la fonction send-push.
 */
import { supabase } from '@/lib/supabase'
import { ensureSession } from '@/services/collection'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

/** Le navigateur sait recevoir des notifications push (et l'app est configurée) */
export const pushSupported = () =>
  Boolean(VAPID_PUBLIC_KEY) && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** iPhone / iPad : les notifications exigent l'appli installée sur l'écran d'accueil */
export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Ouverte depuis l'écran d'accueil (appli installée) */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

/** iPhone dans Safari : il faut d'abord installer l'appli */
export const needsInstall = () => isIos() && !isStandalone()

/** Brave : le service push (Google) y est désactivé par défaut */
export const isBrave = async () => Boolean(await navigator.brave?.isBrave?.().catch(() => false))

/** Autorisation actuelle : default, granted, denied (ou unsupported) */
export const permission = () => ('Notification' in window ? Notification.permission : 'unsupported')

let registration = null

/** Enregistre le service worker (au démarrage de l'app) */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  registration ??= await navigator.serviceWorker.register('/sw.js').catch(() => null)
  return registration
}

/** Clé VAPID publique (base64url) → octets, attendue par pushManager.subscribe */
function keyBytes(base64url) {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64url.length % 4)) % 4)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

/** Abonnement push actuel de cet appareil (ou null) */
export async function currentSubscription() {
  if (!pushSupported()) return null
  const reg = await registerServiceWorker()
  return reg ? reg.pushManager.getSubscription() : null
}

/**
 * Demande l'autorisation, abonne l'appareil et l'enregistre pour le joueur connecté.
 * Erreurs : `PUSH_DENIED` (refusé), `PUSH_UNSUPPORTED`.
 */
export async function enablePush() {
  if (!pushSupported()) throw Object.assign(new Error('Non pris en charge'), { code: 'PUSH_UNSUPPORTED' })
  const granted = await Notification.requestPermission()
  if (granted !== 'granted') throw Object.assign(new Error('Refusé'), { code: 'PUSH_DENIED' })

  const reg = await registerServiceWorker()
  await navigator.serviceWorker.ready
  let sub
  try {
    sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }))
  } catch (err) {
    // Le service push du navigateur refuse (Brave le désactive par défaut)
    console.error('[push] abonnement', err)
    throw Object.assign(new Error(err.message), { code: (await isBrave()) ? 'PUSH_BRAVE' : 'PUSH_SERVICE' })
  }
  const json = sub.toJSON()

  await ensureSession()
  const { data, error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
  })
  if (error) throw error
  return data
}

/** Désabonne cet appareil */
export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return null
  const { data } = await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint })
  await sub.unsubscribe()
  return data
}

/** Réglages : { prefs: { packs, predictions, quests, social, quiet }, devices } */
export async function fetchNotifySettings() {
  await ensureSession()
  const { data, error } = await supabase.rpc('my_notifications')
  if (error) throw error
  return data
}

export async function saveNotifyPrefs(prefs) {
  const { data, error } = await supabase.rpc('set_notify_prefs', { p_prefs: prefs })
  if (error) throw error
  return data
}

export async function sendTestNotification() {
  const { data, error } = await supabase.rpc('send_test_notification')
  if (error) throw error
  return data
}
