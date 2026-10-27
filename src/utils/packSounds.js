/**
 * Sons de l'ouverture des packs, synthétisés à la volée (Web Audio API) :
 * aucun fichier audio, donc aucune question de droits ni de poids à charger.
 * Le contexte audio n'est créé qu'au premier son, toujours déclenché par un clic.
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
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
    // 1 s de bruit blanc, réutilisé pour les froissements et les souffles
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

/** Enveloppe : montée rapide puis extinction exponentielle */
function envelope(gain, start, peak, attack, release) {
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release)
}

/** Bruit filtré (froissement, souffle) dont la fréquence glisse de `from` à `to` */
function noise({ at = 0, duration = 0.3, type = 'bandpass', from = 2000, to = 800, q = 1, peak = 0.4 }) {
  const t = ctx.currentTime + at
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.Q.value = q
  filter.frequency.setValueAtTime(from, t)
  filter.frequency.exponentialRampToValueAtTime(to, t + duration)
  const gain = ctx.createGain()
  envelope(gain, t, peak, 0.01, duration)
  src.connect(filter).connect(gain).connect(master)
  src.start(t, Math.random() * 0.5)
  src.stop(t + duration + 0.05)
}

/** Note simple (carillon, basse) */
function tone({ at = 0, freq = 440, duration = 0.4, type = 'sine', peak = 0.2, slideTo = null }) {
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration)
  const gain = ctx.createGain()
  envelope(gain, t, peak, 0.008, duration)
  osc.connect(gain).connect(master)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

/** Carillon : la note et son octave, légèrement désaccordée pour briller */
function chime(freq, at, peak = 0.12, duration = 0.9) {
  tone({ at, freq, duration, type: 'triangle', peak })
  tone({ at, freq: freq * 2.003, duration: duration * 0.6, type: 'sine', peak: peak * 0.4 })
}

// Gammes des carillons par rareté (Hz) : de plus en plus de notes, de plus en plus haut
const ARPEGGIOS = {
  rare: [659.3, 987.8],
  epic: [523.3, 659.3, 784, 1046.5],
  legendary: [523.3, 659.3, 784, 1046.5, 1318.5],
  mythic: [392, 523.3, 659.3, 784, 1046.5, 1318.5, 1568, 2093],
}

export const packSounds = {
  /** Le pack tremble pendant l'appel au serveur */
  shake() {
    if (!audio()) return
    for (let i = 0; i < 4; i++) noise({ at: i * 0.14, duration: 0.12, from: 900, to: 500, q: 2, peak: 0.12 })
  },

  /** Le pack se déchire */
  rip() {
    if (!audio()) return
    noise({ duration: 0.35, from: 5000, to: 900, q: 0.8, peak: 0.5 })
    noise({ at: 0.05, duration: 0.25, type: 'highpass', from: 3000, to: 6000, peak: 0.2 })
    tone({ freq: 120, slideTo: 45, duration: 0.3, peak: 0.35 })
  },

  /** Une carte est distribuée */
  deal() {
    if (!audio()) return
    noise({ duration: 0.16, type: 'highpass', from: 1500, to: 4000, peak: 0.15 })
  },

  /** Une carte est retournée : souffle, puis carillon selon la rareté */
  flip(rarity) {
    if (!audio()) return
    noise({ duration: 0.12, from: 3000, to: 1200, q: 1.5, peak: 0.2 })
    if (rarity === 'common') {
      tone({ at: 0.04, freq: 880, duration: 0.15, type: 'triangle', peak: 0.06 })
      return
    }
    const notes = ARPEGGIOS[rarity] ?? ARPEGGIOS.rare
    const step = rarity === 'mythic' ? 0.07 : 0.09
    notes.forEach((f, i) => chime(f, 0.05 + i * step, rarity === 'rare' ? 0.1 : 0.12))
    if (rarity === 'legendary' || rarity === 'mythic') {
      // Coup sourd et scintillement final
      tone({ at: 0.03, freq: 90, slideTo: 40, duration: 0.5, peak: 0.4 })
      noise({ at: 0.05 + notes.length * step, duration: 0.8, type: 'highpass', from: 6000, to: 9000, peak: 0.08 })
    }
    if (rarity === 'mythic') {
      // Accord tenu sous l'arpège
      ;[261.6, 329.6, 392].forEach((f) => tone({ at: 0.05, freq: f, duration: 1.6, type: 'sawtooth', peak: 0.025 }))
    }
  },
}
