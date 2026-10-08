/**
 * Client HTTP partagé :
 * - file d'attente par hôte (débit limité, remplace les setTimeout fixes)
 * - déduplication des requêtes en vol
 * - retry avec backoff sur 429 / 5xx
 * - cache localStorage stale-while-revalidate
 */

const CACHE_PREFIX = 'devosi:v2:'

export const TTL = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
}

// Débit max par hôte (requêtes / seconde)
const HOST_RATE = {
  'api.jolpi.ca': 4,
  'api.openf1.org': 3,
}

const queues = new Map()
const inflight = new Map()
const revalidateListeners = new Set()

/** Abonnement : appelé quand une donnée servie depuis un cache périmé a changé côté serveur */
export function onRevalidate(listener) {
  revalidateListeners.add(listener)
  return () => revalidateListeners.delete(listener)
}

function getQueue(host) {
  if (!queues.has(host)) {
    queues.set(host, { last: 0, chain: Promise.resolve() })
  }
  return queues.get(host)
}

/** Planifie l'appel en respectant l'intervalle minimal de l'hôte */
function schedule(host, task) {
  const rate = HOST_RATE[host]
  if (!rate) return task()
  const queue = getQueue(host)
  const interval = 1000 / rate
  const run = queue.chain.then(async () => {
    const wait = queue.last + interval - Date.now()
    if (wait > 0) await sleep(wait)
    queue.last = Date.now()
  })
  queue.chain = run.catch(() => {})
  return run.then(task)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchWithRetry(url, retries = 3) {
  const host = new URL(url).host
  for (let attempt = 0; ; attempt++) {
    const res = await schedule(host, () => fetch(url))
    if (res.ok) return res.json()
    const retriable = res.status === 429 || res.status >= 500
    if (!retriable || attempt >= retries) {
      throw new Error(`HTTP ${res.status} : ${url}`)
    }
    const retryAfter = Number(res.headers.get('retry-after'))
    await sleep(retryAfter ? retryAfter * 1000 : 500 * 2 ** attempt)
  }
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(key, data) {
  const entry = JSON.stringify({ t: Date.now(), data })
  try {
    localStorage.setItem(CACHE_PREFIX + key, entry)
  } catch {
    // Quota dépassé : on purge le cache de l'app puis on retente une fois
    purgeCache()
    try {
      localStorage.setItem(CACHE_PREFIX + key, entry)
    } catch {
      /* tant pis, pas de cache */
    }
  }
}

export function purgeCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('devosi:'))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* localStorage indisponible */
  }
}

/**
 * GET JSON avec cache.
 * @param {string} url
 * @param {object} opts
 * @param {number} opts.ttl - durée de fraîcheur ; 0 = pas de cache
 * @param {boolean} opts.swr - renvoie une donnée périmée immédiatement et rafraîchit en tâche de fond
 */
export async function getJSON(url, { ttl = 0, swr = true } = {}) {
  const cached = ttl ? readCache(url) : null
  const fresh = cached && Date.now() - cached.t < ttl

  if (fresh) return cached.data

  const load = () => {
    if (!inflight.has(url)) {
      const p = fetchWithRetry(url)
        .then((data) => {
          if (ttl) writeCache(url, data)
          return data
        })
        .finally(() => inflight.delete(url))
      inflight.set(url, p)
    }
    return inflight.get(url)
  }

  if (cached && swr) {
    load()
      .then((data) => {
        if (JSON.stringify(data) !== JSON.stringify(cached.data)) {
          revalidateListeners.forEach((listener) => listener(url))
        }
      })
      .catch(() => {})
    return cached.data
  }

  return load()
}
