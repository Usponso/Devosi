/**
 * Service OpenF1 (https://openf1.org) – données de séance détaillées, disponibles depuis 2023 :
 * relais pneus, arrêts aux stands, positions tour par tour, photos des pilotes.
 */
import { getJSON, TTL } from './http'

const BASE_URL = 'https://api.openf1.org/v1'

export const OPENF1_FIRST_SEASON = 2023

function fetchOpenF1(path, params, ttl = 30 * TTL.DAY) {
  const url = new URL(`${BASE_URL}/${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return getJSON(url.toString(), { ttl })
}

/**
 * Retrouve la séance OpenF1 correspondant à une course Jolpica (correspondance sur la date).
 * @param {object} race - course au format interne (season, date)
 * @param {'Race'|'Sprint'} sessionName
 */
export async function findSession(race, sessionName = 'Race') {
  if (race.season < OPENF1_FIRST_SEASON) return null
  const sessions = await fetchOpenF1('sessions', { year: race.season, session_name: sessionName }, TTL.DAY)
  const target = sessionName === 'Sprint' ? race.sprint?.date : race.date
  return sessions.find((s) => s.date_start?.slice(0, 10) === target) ?? null
}

/** Pilotes de la séance : numéro → { code, color, headshot } */
export async function fetchSessionDrivers(sessionKey, ttl = 30 * TTL.DAY) {
  const drivers = await fetchOpenF1('drivers', { session_key: sessionKey }, ttl)
  return new Map(
    drivers.map((d) => [
      d.driver_number,
      {
        number: d.driver_number,
        code: d.name_acronym,
        color: d.team_colour ? `#${d.team_colour}` : null,
        headshot: d.headshot_url ?? null,
        team: d.team_name,
      },
    ]),
  )
}

/** Relais pneus : [{ driverNumber, stint, compound, lapStart, lapEnd, tyreAge }] */
export async function fetchStints(sessionKey) {
  const stints = await fetchOpenF1('stints', { session_key: sessionKey })
  return stints.map((s) => ({
    driverNumber: s.driver_number,
    stint: s.stint_number,
    compound: s.compound ?? 'UNKNOWN',
    lapStart: s.lap_start,
    lapEnd: s.lap_end,
    tyreAge: s.tyre_age_at_start ?? 0,
  }))
}

/** Arrêts aux stands : [{ driverNumber, lap, duration }] */
export async function fetchPits(sessionKey) {
  const pits = await fetchOpenF1('pit', { session_key: sessionKey })
  return pits.map((p) => ({
    driverNumber: p.driver_number,
    lap: p.lap_number,
    duration: p.stop_duration ?? p.pit_duration ?? null,
  }))
}

/**
 * Positions tour par tour.
 * OpenF1 fournit des changements de position horodatés : on les échantillonne au début
 * de chaque tour du leader (tours de la voiture classée 1re).
 * @returns {{ laps: number, series: Map<number, number[]> }} numéro → positions (index = tour, 0 = départ)
 */
export async function fetchLapPositions(sessionKey, winnerNumber) {
  const [positions, leaderLaps] = await Promise.all([
    fetchOpenF1('position', { session_key: sessionKey }),
    fetchOpenF1('laps', { session_key: sessionKey, driver_number: winnerNumber }),
  ])

  const events = positions
    .map((p) => ({ t: Date.parse(p.date), n: p.driver_number, pos: p.position }))
    .sort((a, b) => a.t - b.t)

  // Bornes temporelles : fin de chaque tour = début du suivant
  const lapStarts = leaderLaps
    .filter((l) => l.date_start)
    .sort((a, b) => a.lap_number - b.lap_number)
    .map((l) => Date.parse(l.date_start))
  const boundaries = [...lapStarts.slice(1), Infinity]

  const current = new Map()
  const series = new Map()
  let i = 0

  // Position sur la grille = premiers événements avant le début du 1er tour
  const firstLapStart = lapStarts[0] ?? Infinity
  while (i < events.length && events[i].t <= firstLapStart) {
    current.set(events[i].n, events[i].pos)
    i++
  }
  for (const [n, pos] of current) series.set(n, [pos])

  boundaries.forEach((limit, lapIndex) => {
    while (i < events.length && events[i].t <= limit) {
      current.set(events[i].n, events[i].pos)
      i++
    }
    for (const [n, pos] of current) {
      if (!series.has(n)) series.set(n, new Array(lapIndex + 1).fill(null))
      series.get(n)[lapIndex + 1] = pos
    }
  })

  return { laps: boundaries.length, series }
}

/** Photos officielles des pilotes de la dernière séance : code pilote → URL */
export async function fetchLatestHeadshots() {
  const drivers = await fetchOpenF1('drivers', { session_key: 'latest' }, TTL.DAY)
  return new Map(drivers.filter((d) => d.headshot_url).map((d) => [d.name_acronym, d.headshot_url]))
}

// ---------------------------------------------------------------------------
// Séances du week-end (essais libres, qualifs, sprint…)
// ---------------------------------------------------------------------------

/** Nom de séance OpenF1 → clé de séance interne (cf. utils/race.js) */
const SESSION_NAME_TO_KEY = {
  'Practice 1': 'fp1',
  'Practice 2': 'fp2',
  'Practice 3': 'fp3',
  'Sprint Shootout': 'sprintQualifying',
  'Sprint Qualifying': 'sprintQualifying',
  Sprint: 'sprint',
  Qualifying: 'qualifying',
  Race: 'race',
}

/**
 * Séances OpenF1 du week-end d'une course : [{ key, sessionKey, start, end }]
 * Le meeting est retrouvé via la séance « Race » (même date que Jolpica).
 */
export async function findWeekendSessions(race) {
  if (race.season < OPENF1_FIRST_SEASON) return []
  const sessions = await fetchOpenF1('sessions', { year: race.season }, TTL.HOUR)
  const raceSession = sessions.find((s) => s.session_name === 'Race' && s.date_start?.slice(0, 10) === race.date)
  if (!raceSession) return []
  return sessions
    .filter((s) => s.meeting_key === raceSession.meeting_key && !s.is_cancelled && SESSION_NAME_TO_KEY[s.session_name])
    .map((s) => ({
      key: SESSION_NAME_TO_KEY[s.session_name],
      sessionKey: s.session_key,
      start: new Date(s.date_start),
      end: new Date(s.date_end),
    }))
}

/** Valeur finale d'un champ qui peut être un tableau (qualifs : [Q1, Q2, Q3]) */
const lastValue = (v) => (Array.isArray(v) ? [...v].reverse().find((x) => x != null) ?? null : v ?? null)

/**
 * Classement d'une séance : [{ pos, number, laps, best, gap, dnf, dns }]
 * Tableau vide tant qu'OpenF1 n'a pas publié les résultats.
 */
export async function fetchSessionResult(session) {
  // Séance terminée depuis longtemps : figée. Sinon cache court, les données arrivent.
  const settled = Date.now() - session.end.getTime() > 6 * TTL.HOUR
  try {
    const rows = await fetchOpenF1('session_result', { session_key: session.sessionKey }, settled ? 30 * TTL.DAY : TTL.MINUTE)
    return rows
      .filter((r) => r.position != null || r.dnf || r.dns)
      .map((r) => ({
        pos: r.position,
        number: r.driver_number,
        laps: r.number_of_laps ?? 0,
        best: lastValue(r.duration),
        gap: lastValue(r.gap_to_leader),
        dnf: Boolean(r.dnf),
        dns: Boolean(r.dns),
      }))
      .sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99))
  } catch {
    // 404 « No results found » : séance pas encore publiée
    return []
  }
}
