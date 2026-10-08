<template>
  <div ref="root" class="intro" :style="{ '--tc': winner.color }" role="presentation" @click="finish">
    <div ref="stage" class="stage">
      <!-- Ciel, soleil couchant, nuages et décor à l'horizon (SVG + filtres) -->
      <div ref="skyWrap" class="sky-wrap">
        <svg class="sky" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="f1i-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#05070f" />
              <stop offset="0.45" stop-color="#1b1633" />
              <stop offset="0.78" stop-color="#7a3b4a" />
              <stop offset="0.93" stop-color="#e98a55" />
              <stop offset="1" stop-color="#ffd2a1" />
            </linearGradient>
            <radialGradient id="f1i-sun" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stop-color="#fff6e0" />
              <stop offset="0.35" stop-color="#ffd08a" stop-opacity="0.9" />
              <stop offset="1" stop-color="#ff8a4c" stop-opacity="0" />
            </radialGradient>
            <filter id="f1i-clouds" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.011" numOctaves="4" seed="7" />
              <feColorMatrix
                values="0 0 0 0 0.95
                        0 0 0 0 0.62
                        0 0 0 0 0.55
                        0 0 0 1.6 -0.75"
              />
              <feGaussianBlur stdDeviation="6 1.5" />
            </filter>
            <filter id="f1i-haze" x="-5%" y="-50%" width="110%" height="200%">
              <feGaussianBlur stdDeviation="1.6" />
            </filter>
            <filter id="f1i-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="28" />
            </filter>
          </defs>

          <rect :width="W" :height="hy + 2" fill="url(#f1i-sky)" />
          <rect :width="W" :height="hy * 0.9" filter="url(#f1i-clouds)" opacity="0.55" />
          <circle :cx="W / 2" :cy="hy - H * 0.05" :r="H * 0.16" fill="url(#f1i-sun)" />
          <ellipse :cx="W / 2" :cy="hy" :rx="W * 0.22" :ry="H * 0.035" :fill="winner.color" opacity="0.55" filter="url(#f1i-glow)" />

          <!-- Collines lointaines -->
          <path :d="hills(0.055, 0.6, 3)" fill="#3a2a46" opacity="0.85" filter="url(#f1i-haze)" />
          <path :d="hills(0.03, 1.4, 11)" fill="#24192f" filter="url(#f1i-haze)" />
          <!-- Tribunes de part et d'autre -->
          <g filter="url(#f1i-haze)">
            <path :d="stand(-1)" fill="#16111d" />
            <path :d="stand(1)" fill="#16111d" />
          </g>
        </svg>
      </div>

      <!-- Route, vibreurs, grillages, panneaux (canvas, perspective calculée) -->
      <canvas ref="roadCanvas" class="layer" aria-hidden="true"></canvas>

      <!-- Lignes de vitesse (derrière la voiture) -->
      <canvas ref="fxCanvas" class="layer" aria-hidden="true"></canvas>

      <!-- La monoplace : modèle photo repeint aux couleurs de l'écurie, déplacé en transform CSS (GPU) -->
      <div ref="carLayer" class="layer car-layer" aria-hidden="true">
        <div ref="carEl" class="car-box" :style="{ width: MODEL_WIDTH + 'px', height: MODEL_HEIGHT + 'px' }">
          <div class="car-shadow" :style="{ top: MODEL_GROUND - 46 + 'px' }"></div>
          <canvas ref="carCanvas" class="car-canvas" :width="MODEL_WIDTH" :height="MODEL_HEIGHT"></canvas>
        </div>
      </div>

    </div>

    <!-- Habillage cinéma -->
    <div ref="barTop" class="bar bar-top"></div>
    <div ref="barBottom" class="bar bar-bottom"></div>

    <div ref="hud" class="hud">
      <div class="hud-race">
        <span class="hud-round mono">R{{ String(round).padStart(2, '0') }}</span>
        <span>{{ raceName }}</span>
      </div>
      <div class="hud-winner">
        <div class="eyebrow hud-label">Vainqueur</div>
        <div class="hud-name">{{ winner.driverName }}</div>
        <div class="hud-team">{{ winner.constructor }}</div>
      </div>
      <div class="hud-speed mono">
        <span ref="speedEl">0</span><small>km/h</small>
      </div>
    </div>

    <div ref="flash" class="flash" aria-hidden="true"></div>
    <div ref="blackout" class="blackout" aria-hidden="true"></div>

    <button class="skip" @click.stop="finish">Passer</button>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { paintCar, MODEL_WIDTH, MODEL_HEIGHT, MODEL_GROUND } from '@/utils/carLivery'
import { getLivery } from '@/data/teams'

const props = defineProps({
  /** Résultat du vainqueur : { driverName, driver, number, constructor, constructorId, color } */
  winner: { type: Object, required: true },
  raceName: { type: String, default: '' },
  round: { type: Number, default: 0 },
})

const emit = defineEmits(['done'])

const livery = computed(() => getLivery(props.winner.constructorId))
const teamLabel = computed(() => (props.winner.constructor ?? '').replace(/ F1 Team$/i, '').toUpperCase())

// ---------------------------------------------------------------------------
// Monde 3D simplifié (mètres) → écran (projection perspective)
// ---------------------------------------------------------------------------
const HORIZON = 0.47 // position de l'horizon (fraction de la hauteur)

const ROAD_W = 6 // demi-largeur de piste
const KERB_W = 1.3
const CAR_W = 2.0 // largeur de la voiture (aileron avant) = largeur du modèle

const W = ref(window.innerWidth)
const H = ref(window.innerHeight)
const hy = computed(() => H.value * HORIZON)

const root = ref(null)
const stage = ref(null)
const skyWrap = ref(null)
const roadCanvas = ref(null)
const fxCanvas = ref(null)
const carEl = ref(null)
const carLayer = ref(null)
const carCanvas = ref(null)
const barTop = ref(null)
const barBottom = ref(null)
const hud = ref(null)
const speedEl = ref(null)
const flash = ref(null)
const blackout = ref(null)

/** Paramètres pilotés par la timeline GSAP */
const s = {
  carZ: 520, // distance voiture ↔ caméra (m)
  camH: 1.75, // hauteur de caméra (m) : plan large puis caméra au ras de la piste
  speed: 55, // vitesse de défilement de la piste (m/s)
  shake: 0, // amplitude du tremblement caméra (px)
  blur: 0, // flou de mouvement de la voiture
  lines: 0, // intensité des lignes de vitesse
  kmh: 0,
  render: 1, // 0 une fois l'écran au noir
}

let roadCtx = null
let fxCtx = null
let dpr = 1
let focal = 1
let offset = 0
let elapsed = 0
let timeline = null
let finished = false
let lastBlur = null
let lastKmh = -1
let teamRgb = [255, 255, 255]
const particles = []

/** Collines : somme de sinusoïdes posée sur l'horizon */
function hills(amp, freq, seed) {
  const w = W.value
  const base = hy.value + 1
  let d = `M0 ${base}`
  for (let x = 0; x <= w; x += w / 60) {
    const t = x / w
    const y = base - H.value * amp * (0.6 + 0.4 * Math.sin(t * Math.PI * 2 * freq + seed) * Math.sin(t * 7.3 + seed))
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return `${d} L${w} ${base} Z`
}

/** Tribune en perspective près de l'horizon, côté -1 (gauche) ou 1 (droite) */
function stand(side) {
  const cx = W.value / 2
  const y = hy.value + 1
  const x0 = cx + side * W.value * 0.06
  const x1 = cx + side * W.value * 0.5
  return `M${x0} ${y} L${x0} ${y - H.value * 0.012} L${x1} ${y - H.value * 0.07} L${x1} ${y} Z`
}

// Résolution des calques canvas : au plus ~600 lignes, étirées en CSS (invisible en mouvement)
const MAX_ROWS = 600
let rq = 1 // pixels de canvas par pixel CSS
let bw = 0
let bh = 0
let roadImage = null
let road32 = null

function resize() {
  W.value = window.innerWidth
  H.value = window.innerHeight
  dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  focal = Math.max(H.value * 1.05, W.value * 0.62)
  rq = Math.min(dpr, MAX_ROWS / H.value)
  bw = Math.round(W.value * rq)
  bh = Math.round(H.value * rq)
  for (const c of [roadCanvas.value, fxCanvas.value]) {
    c.width = bw
    c.height = bh
  }
  roadCtx.setTransform(rq, 0, 0, rq, 0, 0)
  fxCtx.setTransform(rq, 0, 0, rq, 0, 0)
  roadImage = roadCtx.createImageData(bw, bh)
  road32 = new Uint32Array(roadImage.data.buffer)
}

// ---------------------------------------------------------------------------
// Rendu de la piste : écrit directement dans un tampon de pixels (Uint32), ligne par
// ligne en perspective (texture, vibreurs, marquages), puis un seul putImageData.
// ---------------------------------------------------------------------------
const FOG = [216, 150, 120] // couleur de la brume à l'horizon

/** Couleur CSS (objets de bord de piste) */
function mix(c, fog) {
  return `rgb(${Math.round(c[0] + (FOG[0] - c[0]) * fog)},${Math.round(c[1] + (FOG[1] - c[1]) * fog)},${Math.round(c[2] + (FOG[2] - c[2]) * fog)})`
}

/** Couleur empaquetée RGBA (little-endian) pour le tampon */
function packed(r, g, b, fog) {
  const R = (r + (FOG[0] - r) * fog) | 0
  const G = (g + (FOG[1] - g) * fog) | 0
  const B = (b + (FOG[2] - b) * fog) | 0
  return ((255 << 24) | (B << 16) | (G << 8) | R) >>> 0
}

const FOG_PACKED = packed(0, 0, 0, 1)

/** Bruit pseudo-aléatoire stable */
const hash = (n) => {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

function span(rowStart, x0, x1, color) {
  const a = x0 < 0 ? 0 : x0 | 0
  const b = x1 > bw ? bw : x1 | 0
  if (b > a) road32.fill(color, rowStart + a, rowStart + b)
}

function drawRoad() {
  const cx = bw / 2
  const horizon = hy.value * rq
  const f = focal * rq

  for (let py = Math.ceil(horizon) + 1; py < bh; py++) {
    const row = py * bw
    const z = (f * s.camH) / (py - horizon)
    if (z > 1800) {
      // Au ras de l'horizon : brume uniforme (et pas de reste de l'image précédente)
      span(row, 0, bw, FOG_PACKED)
      continue
    }
    const wz = z + offset
    const fog = 1 - Math.exp(-z / 420)
    const k = f / z

    // Bas-côtés : herbe en bandes
    span(row, 0, bw, Math.floor(wz / 7) % 2 ? packed(34, 52, 30, fog) : packed(40, 60, 34, fog))

    // Dégagement asphalté
    const runoff = k * (ROAD_W + KERB_W + 3.5)
    span(row, cx - runoff, cx + runoff, packed(58, 58, 62, fog))

    // Vibreurs rouge / blanc
    const kerbOuter = k * (ROAD_W + KERB_W)
    span(row, cx - kerbOuter, cx + kerbOuter, Math.floor(wz / 2.2) % 2 ? packed(205, 30, 36, fog) : packed(236, 236, 236, fog))

    // Asphalte avec grain et nuances
    const half = k * ROAD_W
    const base = 44 + hash(Math.floor(wz * 4)) * 10 + (Math.floor(wz / 30) % 2) * 3
    span(row, cx - half, cx + half, packed(base, base + 1, base + 4, fog))

    // Trajectoire gommée
    const rubber = k * 0.8
    const dark = packed(base - 14, base - 13, base - 11, fog)
    span(row, cx - k * 3.2 - rubber, cx - k * 3.2 + rubber, dark)
    span(row, cx + k * 3.2 - rubber, cx + k * 3.2 + rubber, dark)

    // Lignes blanches de bord de piste et pointillés centraux
    const white = packed(230, 230, 226, fog)
    const line = Math.max(1, k * 0.18)
    span(row, cx - half, cx - half + line, white)
    span(row, cx + half - line, cx + half, white)
    if (wz % 12 < 5) {
      const dash = Math.max(1, k * 0.07)
      span(row, cx - dash, cx + dash, white)
    }
  }

  roadCtx.putImageData(roadImage, 0, 0)
  drawTrackside(roadCtx, W.value / 2, hy.value)
}

/** Grillages, poteaux et panneaux publicitaires qui défilent de chaque côté */
function drawTrackside(ctx, cx, horizon) {
  const FAR = 700
  const NEAR = 1.2
  const fence = (side) => {
    // Bande de grillage continue
    ctx.beginPath()
    for (let z = FAR; z >= NEAR; z *= 0.85) {
      const k = focal / z
      ctx.lineTo(cx + side * k * 11, horizon + k * (s.camH - 3.4))
    }
    for (let z = NEAR; z <= FAR; z /= 0.85) {
      const k = focal / z
      ctx.lineTo(cx + side * k * 11, horizon + k * s.camH)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(190, 200, 210, 0.07)'
    ctx.fill()
  }
  fence(-1)
  fence(1)

  // Poteaux tous les 14 m, panneaux tous les 70 m
  const items = []
  const POLE = 14
  const first = POLE - (offset % POLE)
  for (let z = first; z < FAR; z += POLE) {
    if (z < NEAR) continue
    const index = Math.round((z + offset) / POLE)
    items.push({ z, type: index % 5 === 0 ? 'board' : 'pole', index })
  }
  items.sort((a, b) => b.z - a.z)

  for (const item of items) {
    const k = focal / item.z
    const fog = 1 - Math.exp(-item.z / 420)
    for (const side of [-1, 1]) {
      if (item.type === 'pole') {
        const x = cx + side * k * 11
        const top = horizon + k * (s.camH - 3.6)
        const bottom = horizon + k * s.camH
        ctx.fillStyle = mix([150, 156, 166], fog)
        ctx.fillRect(x - Math.max(0.6, k * 0.07), top, Math.max(1.2, k * 0.14), bottom - top)
      } else {
        const x0 = cx + side * k * 8.8
        const x1 = cx + side * k * 10.6
        const top = horizon + k * (s.camH - 1.4)
        const bottom = horizon + k * (s.camH - 0.2)
        const left = Math.min(x0, x1)
        const width = Math.abs(x1 - x0) * 1.0 + k * 3.2
        const bx = side < 0 ? left - k * 3.2 : left
        ctx.fillStyle = mix(item.index % 2 ? teamRgb : [18, 19, 22], fog * 0.9)
        ctx.fillRect(bx, top, width, bottom - top)
        if (k * 3 > 26) {
          ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - fog)})`
          ctx.font = `900 ${Math.round((bottom - top) * 0.55)}px 'Titillium Web', sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(item.index % 2 ? teamLabel.value : 'DEVOSI', bx + width / 2, (top + bottom) / 2)
        }
      }
    }
  }
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// ---------------------------------------------------------------------------
// Lignes de vitesse (particules radiales depuis le point de fuite)
// ---------------------------------------------------------------------------
function spawn(p) {
  p.a = Math.random() * Math.PI * 2
  p.r = Math.random() * 0.35 + 0.3
  p.len = Math.random() * 0.12 + 0.05
  p.white = Math.random() > 0.2
}

function drawFx(dt) {
  const ctx = fxCtx
  const w = W.value
  const h = H.value
  ctx.clearRect(0, 0, w, h)
  if (s.lines <= 0.01) return
  const cx = w / 2
  const cy = hy.value
  const R = Math.hypot(w, h) / 2
  ctx.lineCap = 'round'
  for (const p of particles) {
    p.r += p.r * dt * (2.2 + s.lines * 4)
    if (p.r > 1.2) spawn(p)
    const r0 = p.r * R
    const r1 = (p.r + p.len * (0.5 + s.lines)) * R
    const alpha = Math.min(1, (p.r - 0.3) * 2.5) * s.lines * 0.3
    ctx.strokeStyle = p.white ? `rgba(255,255,255,${alpha})` : `rgba(${teamRgb.join(',')},${alpha})`
    ctx.lineWidth = 0.6 + p.r * 1.6
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(p.a) * r0, cy + Math.sin(p.a) * r0 * 0.75)
    ctx.lineTo(cx + Math.cos(p.a) * r1, cy + Math.sin(p.a) * r1 * 0.75)
    ctx.stroke()
  }
}

// ---------------------------------------------------------------------------
// Voiture : projection, tangage de suspension, roues qui tournent
// ---------------------------------------------------------------------------
function placeCar(t) {
  const z = Math.max(0.35, s.carZ)
  const k = focal / z
  const scale = (k * CAR_W) / MODEL_WIDTH
  const groundY = hy.value + k * s.camH
  // Suspension : rebonds et roulis légers, plus marqués à haute vitesse
  const bounce = (Math.sin(t * 31) * 1.6 + Math.sin(t * 57) * 1.1) * (0.6 + s.lines)
  const roll = Math.sin(t * 19) * 0.35 + Math.sin(t * 43) * 0.15
  const x = W.value / 2 - (MODEL_WIDTH / 2) * scale
  const y = groundY - MODEL_GROUND * scale + bounce * scale
  const widthPx = MODEL_WIDTH * scale

  // Une fois la caméra dépassée, la voiture n'est plus dessinée (évite de rastériser
  // un calque plusieurs fois plus grand que l'écran)
  const passed = widthPx > W.value * 2.6
  carLayer.value.style.visibility = passed ? 'hidden' : 'visible'
  if (passed) return

  carEl.value.style.transform =
    `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(5)}) ` +
    `translate(${MODEL_WIDTH / 2}px, ${MODEL_GROUND}px) rotate(${roll.toFixed(3)}deg) ` +
    `translate(${-MODEL_WIDTH / 2}px, ${-MODEL_GROUND}px)`

  // Flou de mouvement en CSS (GPU, borné à la taille de l'écran) plutôt qu'en filtre SVG
  const blur = s.blur < 3 ? s.blur.toFixed(1) : String(Math.round(s.blur / 2) * 2)
  if (blur !== lastBlur) {
    carLayer.value.style.filter = s.blur > 0.2 ? `blur(${blur}px)` : 'none'
    lastBlur = blur
  }
}

function tick(time, deltaMs) {
  const dt = Math.min(0.05, deltaMs / 1000)
  elapsed += dt
  offset += s.speed * dt

  // Tremblement caméra
  const shakeX = (Math.random() - 0.5) * s.shake
  const shakeY = (Math.random() - 0.5) * s.shake * 0.7
  stage.value.style.transform = `translate3d(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px, 0)`

  // Écran au noir : plus rien à dessiner pendant la révélation de la page
  if (!s.render) return

  drawRoad()
  placeCar(elapsed)
  drawFx(dt)
  const kmh = Math.round(s.kmh)
  if (speedEl.value && kmh !== lastKmh) {
    speedEl.value.textContent = kmh
    lastKmh = kmh
  }
}

// ---------------------------------------------------------------------------
// Séquence
// ---------------------------------------------------------------------------
function build() {
  timeline = gsap.timeline({ onComplete: done })

  // Ouverture : fondu au noir, bandes cinéma, HUD
  timeline
    .fromTo(blackout.value, { opacity: 1 }, { opacity: 0, duration: 0.7, ease: 'power2.out' }, 0)
    .fromTo([barTop.value, barBottom.value], { scaleY: 0 }, { scaleY: 1, duration: 0.8, ease: 'power3.out' }, 0)
    .fromTo(hud.value, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.35)
    .fromTo(skyWrap.value, { scale: 1 }, { scale: 1.14, duration: 3.9, ease: 'power1.in' }, 0)

  // Phase 1 — approche : un point à l'horizon qui grossit
  timeline
    .to(s, { carZ: 60, duration: 2.0, ease: 'power1.in' }, 0)
    .to(s, { kmh: 262, duration: 2.0, ease: 'power1.out' }, 0)

  // Phase 2 — accélération : la caméra descend au ras de la piste, vitesse, tremblement
  timeline
    .to(s, { carZ: 4.2, duration: 1.25, ease: 'power1.in' }, 2.0)
    .to(s, { camH: 0.62, duration: 1.25, ease: 'power2.inOut' }, 2.0)
    .to(s, { speed: 95, lines: 1, blur: 1.5, shake: 6, kmh: 338, duration: 1.25, ease: 'power2.in' }, 2.0)

  // Phase 3 — traversée de la caméra : la F1 envahit l'écran puis la dépasse
  timeline
    .to(s, { carZ: 0.3, duration: 0.55, ease: 'none' }, 3.25)
    .to(s, { blur: 24, shake: 20, duration: 0.4, ease: 'power3.in' }, 3.4)
    .to(hud.value, { opacity: 0, duration: 0.25 }, 3.3)
    .fromTo(flash.value, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'power2.in' }, 3.66)
    .set(blackout.value, { opacity: 1 }, 3.8)
    .set(s, { render: 0 }, 3.82)
    .to(flash.value, { opacity: 0, duration: 0.35, ease: 'power2.out' }, 3.8)
    // Révélation de la page : le voile s'ouvre comme un sillage d'air
    .to(root.value, { clipPath: 'inset(50% 0% 50% 0%)', duration: 0.55, ease: 'power3.inOut' }, 3.88)
}

function done() {
  if (finished) return
  finished = true
  emit('done')
}

/** Passer l'intro : fondu rapide */
function finish() {
  if (finished) return
  timeline?.kill()
  gsap.to(root.value, { opacity: 0, duration: 0.3, ease: 'power2.out', onComplete: done })
}

const onKey = () => finish()

onMounted(async () => {
  teamRgb = hexToRgb(props.winner.color)
  roadCtx = roadCanvas.value.getContext('2d', { alpha: true })
  fxCtx = fxCanvas.value.getContext('2d')
  resize()
  for (let i = 0; i < 90; i++) {
    const p = {}
    spawn(p)
    p.r = Math.random() * 1.1
    particles.push(p)
  }
  document.documentElement.style.overflow = 'hidden'
  window.addEventListener('resize', resize)
  window.addEventListener('keydown', onKey)
  gsap.ticker.add(tick)

  // Modèle repeint aux couleurs de l'écurie (≈ 50 ms, mis en cache) ; sans lui, pas d'intro
  try {
    const painted = await Promise.race([
      paintCar(props.winner.constructorId, livery.value, { number: props.winner.number, code: props.winner.driver }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ])
    carCanvas.value.getContext('2d').drawImage(painted, 0, 0)
  } catch {
    done()
    return
  }
  if (!finished) build()
})

onUnmounted(() => {
  gsap.ticker.remove(tick)
  timeline?.kill()
  document.documentElement.style.overflow = ''
  window.removeEventListener('resize', resize)
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.intro {
  position: fixed;
  inset: 0;
  z-index: 300;
  overflow: hidden;
  cursor: pointer;
  background: #050506;
  clip-path: inset(0% 0% 0% 0%);
}

.stage {
  position: absolute;
  inset: -20px;
  will-change: transform;
}

.sky-wrap {
  position: absolute;
  inset: 20px;
  transform-origin: 50% 47%;
  will-change: transform;
}

.sky,
.layer {
  position: absolute;
  inset: 20px;
  width: calc(100% - 40px);
  height: calc(100% - 40px);
}

.sky {
  inset: 0;
  width: 100%;
  height: 100%;
}

.car-layer {
  overflow: hidden;
  will-change: filter;
}

.car-box {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  will-change: transform;
}

.car-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.car-shadow {
  position: absolute;
  left: -2%;
  width: 104%;
  height: 92px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.35) 70%, transparent);
}

/* Bandes cinéma */
.bar {
  position: absolute;
  left: 0;
  right: 0;
  height: 9vh;
  background: #000;
  z-index: 2;
}

.bar-top { top: 0; transform-origin: top; }
.bar-bottom { bottom: 0; transform-origin: bottom; }

/* HUD */
.hud {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  color: #fff;
}

.hud-race {
  position: absolute;
  top: calc(9vh + 18px);
  left: 28px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
}

.hud-round {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--tc);
  color: #fff;
}

.hud-winner {
  position: absolute;
  left: 28px;
  bottom: calc(9vh + 22px);
  text-shadow: 0 4px 24px rgba(0, 0, 0, 0.7);
}

.hud-label { color: rgba(255, 255, 255, 0.7); }

.hud-name {
  font-size: clamp(32px, 6.5vw, 76px);
  font-weight: 900;
  line-height: 0.95;
  text-transform: uppercase;
  letter-spacing: -0.01em;
}

.hud-team {
  margin-top: 6px;
  display: inline-block;
  padding-left: 10px;
  border-left: 4px solid var(--tc);
  font-weight: 700;
  font-size: 16px;
}

.hud-speed {
  position: absolute;
  right: 28px;
  bottom: calc(9vh + 22px);
  font-size: clamp(34px, 5vw, 60px);
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 4px 24px rgba(0, 0, 0, 0.7);
}

.hud-speed small {
  margin-left: 6px;
  font-size: 0.3em;
  color: rgba(255, 255, 255, 0.7);
}

.flash {
  position: absolute;
  inset: 0;
  z-index: 4;
  opacity: 0;
  pointer-events: none;
  background: radial-gradient(circle at 50% 60%, #fff 0%, #fff 25%, var(--tc) 60%, #000 100%);
}

.blackout {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: #050506;
  pointer-events: none;
}

.skip {
  position: absolute;
  right: 20px;
  top: calc(9vh + 14px);
  z-index: 5;
  padding: 8px 16px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(6px);
}

.skip:hover { color: #fff; background: rgba(255, 255, 255, 0.18); }

@media (max-width: 640px) {
  .hud-race { left: 16px; font-size: 11px; }
  .hud-winner { left: 16px; }
  .hud-speed { right: 16px; }
  .skip { right: 12px; }
}
</style>
