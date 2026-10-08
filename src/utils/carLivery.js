/**
 * Repeint le modèle de F1 (rendu Ferrari, vue de face) aux couleurs d'une écurie.
 * Les pixels rouges de la carrosserie prennent la couleur principale (aileron avant :
 * couleur secondaire) en conservant l'ombrage et les reflets du rendu d'origine.
 * Les écussons Ferrari sont effacés pour les autres écuries et le numéro du pilote
 * est peint sur le nez.
 */
import modelUrl from '@/assets/intro/f1-front.webp'

export const MODEL_WIDTH = 1536
export const MODEL_HEIGHT = 1024
/** Ligne de sol du modèle (bas des pneus / de l'aileron), en pixels du modèle */
export const MODEL_GROUND = 930

// Zones repérées dans le modèle (pixels)
const SIDEPOD_BADGES = [
  [600, 408, 648, 504],
  [888, 408, 936, 504],
]
const NOSE_BADGE = [728, 728, 808, 792]
const NOSE_FLAG = [716, 812, 818, 842]
const NOSE_X = [684, 852] // le nez descend jusqu'à l'aileron
const WING_TOP = 700

const cache = new Map()
let modelPromise = null

function loadModel() {
  if (!modelPromise) {
    // onload plutôt que decode() : ne dépend pas d'une image affichée à l'écran
    modelPromise = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = modelUrl
    })
  }
  return modelPromise
}

const hexToRgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const inBox = (x, y, [x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1

/** Teinte une valeur d'ombrage (0..~1.2) avec une couleur cible, reflets compris */
function shade(target, light, gloss, out) {
  // Couleurs très sombres (Mercedes, Cadillac) : plancher pour garder le volume
  const lift = Math.max(0, 0.16 - (target[0] + target[1] + target[2]) / 765) * 255
  for (let c = 0; c < 3; c++) {
    let v = (target[c] + lift) * Math.min(light, 1)
    if (light > 1) v += (255 - v) * (light - 1) * 2.2
    out[c] = v + (255 * Math.min(1, light) - v) * gloss
  }
}

/**
 * @param {string} teamId
 * @param {{primary:string, secondary:string, accent:string}} livery
 * @param {{ number?: number|string, code?: string }} driver
 * @returns {Promise<HTMLCanvasElement>} modèle repeint (à recopier, ne pas insérer tel quel)
 */
export async function paintCar(teamId, livery, driver = {}) {
  const key = `${teamId}|${driver.number ?? ''}|${driver.code ?? ''}`
  if (cache.has(key)) return cache.get(key)

  const promise = (async () => {
    const img = await loadModel()
    const canvas = document.createElement('canvas')
    canvas.width = MODEL_WIDTH
    canvas.height = MODEL_HEIGHT
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)

    const isFerrari = teamId === 'ferrari'
    const primary = hexToRgb(livery.primary)
    const secondary = hexToRgb(livery.secondary)

    if (!isFerrari) {
      const image = ctx.getImageData(0, 0, MODEL_WIDTH, MODEL_HEIGHT)
      const d = image.data
      const out = [0, 0, 0]

      for (let y = 0; y < MODEL_HEIGHT; y++) {
        for (let x = 0; x < MODEL_WIDTH; x++) {
          const i = (y * MODEL_WIDTH + x) * 4
          if (d[i + 3] < 8) continue
          const r = d[i]
          const g = d[i + 1]
          const b = d[i + 2]
          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)

          const badge = SIDEPOD_BADGES.some((box) => inBox(x, y, box)) || inBox(x, y, NOSE_BADGE)
          const flag = inBox(x, y, NOSE_FLAG)

          // Rouge carrosserie : dominante rouge (ombres et reflets rosés compris)
          const sat = max ? (max - min) / max : 0
          const red = max === r && r > 38 && sat > 0.16 && g < r * 0.84 && b < r * 0.86 && Math.abs(g - b) < r * 0.22

          if (!red && !badge && !flag) continue

          const wing = y > WING_TOP && (x < NOSE_X[0] || x > NOSE_X[1])
          let target = wing ? secondary : primary
          if (flag) target = secondary

          let light
          let gloss
          if (red) {
            // Rouge de référence du rendu ≈ 222 : au-delà, reflet
            light = r / 222
            gloss = Math.max(0, Math.min(1, (g + b) / (2 * r) - 0.08)) * 0.9
          } else {
            // Écusson / drapeau : on repeint en aplat ombré de la carrosserie
            light = 0.92
            gloss = 0
          }
          shade(target, light, gloss, out)
          d[i] = out[0]
          d[i + 1] = out[1]
          d[i + 2] = out[2]
        }
      }
      ctx.putImageData(image, 0, 0)
    }

    // Numéro du pilote sur le nez (et code en dessous)
    if (driver.number) {
      const bodyLum = (primary[0] * 0.2126 + primary[1] * 0.7152 + primary[2] * 0.0722) / 255
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = bodyLum > 0.55 ? '#0b0c0f' : '#ffffff'
      ctx.shadowColor = 'rgba(0,0,0,0.35)'
      ctx.shadowBlur = 4
      ctx.font = "italic 900 74px 'Titillium Web', sans-serif"
      ctx.fillText(String(driver.number), 768, 620)
      if (driver.code) {
        ctx.font = "italic 900 24px 'Titillium Web', sans-serif"
        ctx.fillStyle = livery.accent
        ctx.fillText(driver.code, 768, 676)
      }
      ctx.restore()
    }

    return canvas
  })()

  cache.set(key, promise)
  promise.catch(() => cache.delete(key))
  return promise
}
