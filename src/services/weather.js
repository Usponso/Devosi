/**
 * Prévisions météo des séances via Open-Meteo (gratuit, sans clé).
 * Les prévisions ne sont disponibles que ~16 jours à l'avance.
 */
import { getJSON, TTL } from './http'

const BASE_URL = 'https://api.open-meteo.com/v1/forecast'
const FORECAST_DAYS = 16

/** Codes météo WMO → libellé FR + icône Tabler */
const WMO = [
  [[0], 'Ensoleillé', 'sun'],
  [[1, 2], 'Éclaircies', 'cloud-sun'],
  [[3], 'Couvert', 'cloud'],
  [[45, 48], 'Brouillard', 'mist'],
  [[51, 53, 55, 56, 57], 'Bruine', 'cloud-drizzle'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'Pluie', 'cloud-rain'],
  [[71, 73, 75, 77, 85, 86], 'Neige', 'snowflake'],
  [[95, 96, 99], 'Orage', 'cloud-storm'],
]

function describe(code) {
  const entry = WMO.find(([codes]) => codes.includes(code))
  return entry ? { label: entry[1], icon: entry[2] } : { label: '—', icon: 'cloud' }
}

/**
 * @param {{lat:number, long:number}} race
 * @param {{key:string, label:string, start:Date}[]} sessions
 * @returns {Promise<Array<{key, label, temp, rain, sky, icon}>|null>}
 */
export async function fetchSessionWeather(race, sessions) {
  if (!Number.isFinite(race.lat) || !sessions.length) return null

  const now = Date.now()
  const horizon = now + FORECAST_DAYS * TTL.DAY
  const inRange = sessions.filter((s) => s.start.getTime() > now - 3 * TTL.HOUR && s.start.getTime() < horizon)
  if (!inRange.length) return null

  const url = new URL(BASE_URL)
  url.searchParams.set('latitude', race.lat)
  url.searchParams.set('longitude', race.long)
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,weather_code')
  url.searchParams.set('timezone', 'UTC')
  url.searchParams.set('forecast_days', FORECAST_DAYS)

  const data = await getJSON(url.toString(), { ttl: TTL.HOUR })
  const times = data?.hourly?.time ?? []

  return inRange.map((s) => {
    const hourKey = s.start.toISOString().slice(0, 13) + ':00'
    const idx = times.indexOf(hourKey)
    if (idx === -1) return { key: s.key, label: s.label, temp: null, rain: null, sky: '—', icon: 'cloud' }
    const sky = describe(data.hourly.weather_code[idx])
    return {
      key: s.key,
      label: s.label,
      temp: Math.round(data.hourly.temperature_2m[idx]),
      rain: data.hourly.precipitation_probability[idx],
      sky: sky.label,
      icon: sky.icon,
    }
  })
}
