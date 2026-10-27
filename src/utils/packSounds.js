/**
 * Sons de l'ouverture des packs, synthétisés à la volée (Web Audio API) :
 * aucun fichier audio, donc aucune question de droits ni de poids à charger.
 * Le contexte audio n'est créé qu'au premier son, toujours déclenché par un clic.
 *
 * - Ouverture : déchirure nette d'un papier (centaines de micro-craquements de fibres)
 * - Carte retournée : souffle d'une page qui tourne, puis marimba feutrée selon la rareté
 */

let ctx = null
let master = null
let noiseBuffer = null

function audio() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return null
    ctx = new AudioContext()
    // Compresseur : les nombreux grains de la déchirure ne saturent pas
    master = ctx.createDynamicsCompressor()
    const volume = ctx.createGain()
    volume.gain.value = 0.8
    master.connect(volume).connect(ctx.destination)
    // 2 s de bruit blanc, réutilisé pour la déchirure et les souffles
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

const rand = (a, b) => a + Math.random() * (b - a)

/** Enveloppe : montée rapide puis extinction exponentielle */
function envelope(gain, start, peak, attack, release) {
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release)
}

/** Source de bruit filtré, démarrée à un endroit aléatoire du tampon */
function noiseSource(t, duration, filter, gain) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  src.connect(filter).connect(gain).connect(master)
  src.start(t, rand(0, 1.5))
  src.stop(t + duration + 0.02)
}

/** Micro-craquement : une fibre de papier qui cède */
function grain(t, { freq, q, length, amp }) {
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = q
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(amp, t + length * 0.15)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  noiseSource(t, length, filter, gain)
}

/** Frottement de fond qui suit l'enveloppe de la déchirure, avec de petites irrégularités */
function rub(t, duration, freq, amp, shape) {
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = 0.7
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  for (let i = 1; i <= 40; i++) {
    const x = i / 40
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, amp * shape(x) * rand(0.5, 1)), t + duration * x)
  }
  noiseSource(t, duration, filter, gain)
}

/** Souffle d'une page qui tourne : bruit dont le filtre monte puis redescend */
function pageTurn(t) {
  const duration = 0.32
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 0.7
  filter.frequency.setValueAtTime(300, t)
  filter.frequency.exponentialRampToValueAtTime(1400, t + duration * 0.55)
  filter.frequency.exponentialRampToValueAtTime(500, t + duration)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.22, t + duration * 0.5)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  noiseSource(t, duration, filter, gain)
  return duration
}

/** Note de marimba : fondamentale douce et attaque boisée (harmonique 4 très courte) */
function marimba(t, freq, peak = 0.13) {
  tone(t, freq, 0.45, peak)
  tone(t, freq * 4, 0.05, peak * 0.23)
}

function tone(t, freq, duration, peak) {
  const osc = ctx.createOscillator()
  osc.frequency.value = freq
  const gain = ctx.createGain()
  envelope(gain, t, peak, 0.008, duration)
  osc.connect(gain).connect(master)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

// Gamme de la marimba (Hz) et nombre de notes par rareté : plus rare, plus haut et plus long
const SCALE = [523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5]
const NOTES = { common: 1, rare: 2, epic: 3, legendary: 5, mythic: 7 }
const LEVEL = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 }

export const packSounds = {
  /** Le pack se déchire d'un coup sec */
  rip() {
    if (!audio()) return
    const t = ctx.currentTime + 0.02
    const duration = 0.38
    const shape = (x) => Math.min(1, x * 4) * Math.pow(1 - x, 0.6)
    for (let i = 0; i < 160; i++) {
      const x = Math.random()
      const e = shape(x)
      if (e < 0.02) continue
      grain(t + x * duration, { freq: rand(1500, 6500), q: rand(0.8, 3), length: rand(0.003, 0.012), amp: 0.6 * e * rand(0.3, 1) })
    }
    rub(t, duration, 2600, 0.12, shape)
  },

  /** Une carte est retournée : page qui tourne, puis marimba selon la rareté */
  flip(rarity) {
    if (!audio()) return
    const t = ctx.currentTime + 0.02
    const start = t + pageTurn(t)
    const level = LEVEL[rarity] ?? 0
    for (let i = 0; i < (NOTES[rarity] ?? 1); i++) {
      marimba(start + i * 0.1, SCALE[Math.min(i + level, SCALE.length - 1)])
    }
    // Légendaire et Mythique : une note grave tenue sous l'arpège
    if (level >= 3) tone(start, 130.8, 0.8, 0.18)
  },
}
