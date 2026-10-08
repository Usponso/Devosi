/**
 * Génère src/data/circuits.json (tracés SVG) à partir du GeoJSON de
 * https://github.com/bacinger/f1-circuits (licence MIT).
 *
 * Usage : node scripts/build-circuits.mjs <chemin/vers/f1-circuits.geojson>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// id GeoJSON → circuitId Ergast/Jolpica
const ID_MAP = {
  'au-1953': 'albert_park',
  'bh-2002': 'bahrain',
  'cn-2004': 'shanghai',
  'es-1991': 'catalunya',
  'mc-1929': 'monaco',
  'ca-1978': 'villeneuve',
  'fr-1969': 'ricard',
  'at-1969': 'red_bull_ring',
  'gb-1948': 'silverstone',
  'de-1932': 'hockenheimring',
  'hu-1986': 'hungaroring',
  'be-1925': 'spa',
  'it-1922': 'monza',
  'sg-2008': 'marina_bay',
  'ru-2014': 'sochi',
  'jp-1962': 'suzuka',
  'us-2012': 'americas',
  'mx-1962': 'rodriguez',
  'br-1940': 'interlagos',
  'ae-2009': 'yas_marina',
  'it-1953': 'imola',
  'de-1927': 'nurburgring',
  'pt-2008': 'portimao',
  'it-1914': 'mugello',
  'my-1999': 'sepang',
  'tr-2005': 'istanbul',
  'nl-1948': 'zandvoort',
  'fr-1960': 'magny_cours',
  'pt-1972': 'estoril',
  'br-1977': 'jacarepagua',
  'sa-2021': 'jeddah',
  'us-2022': 'miami',
  'qa-2004': 'losail',
  'es-2026': 'madring',
  'az-2016': 'baku',
  'us-2023': 'vegas',
  'us-1909': 'indianapolis',
  'ar-1952': 'galvez',
  'za-1961': 'kyalami',
  'us-1956': 'watkins_glen',
}

const SIZE = 1000
const PAD = 20

/** Douglas–Peucker pour alléger les tracés */
function simplify(points, tolerance) {
  if (points.length < 3) return points
  const [a, b] = [points[0], points[points.length - 1]]
  let maxDist = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = distToSegment(points[i], a, b)
    if (d > maxDist) {
      maxDist = d
      index = i
    }
  }
  if (maxDist <= tolerance) return [a, b]
  const left = simplify(points.slice(0, index + 1), tolerance)
  const right = simplify(points.slice(index), tolerance)
  return [...left.slice(0, -1), ...right]
}

function distToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function project(coords) {
  const meanLat = coords.reduce((s, [, lat]) => s + lat, 0) / coords.length
  const k = Math.cos((meanLat * Math.PI) / 180)
  const pts = coords.map(([lon, lat]) => [lon * k, -lat])
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const scale = (SIZE - PAD * 2) / Math.max(maxX - minX, maxY - minY)
  const w = (maxX - minX) * scale + PAD * 2
  const h = (maxY - minY) * scale + PAD * 2
  const scaled = pts.map(([x, y]) => [(x - minX) * scale + PAD, (y - minY) * scale + PAD])
  return { points: scaled, width: Math.round(w), height: Math.round(h) }
}

const input = process.argv[2]
if (!input) {
  console.error('Usage : node scripts/build-circuits.mjs <f1-circuits.geojson>')
  process.exit(1)
}

const geo = JSON.parse(readFileSync(input, 'utf8'))
const out = {}

for (const feature of geo.features) {
  const circuitId = ID_MAP[feature.properties.id]
  if (!circuitId || feature.geometry?.type !== 'LineString') continue
  const { points, width, height } = project(feature.geometry.coordinates)
  const simple = simplify(points, 1.2)
  const d = 'M' + simple.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z'
  out[circuitId] = {
    viewBox: `0 0 ${width} ${height}`,
    d,
    length: feature.properties.length,
  }
}

const target = fileURLToPath(new URL('../src/data/circuits.json', import.meta.url))
writeFileSync(target, JSON.stringify(out))
console.log(`${Object.keys(out).length} circuits → ${target}`)
