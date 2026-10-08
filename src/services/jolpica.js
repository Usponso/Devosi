/**
 * Service F1 – API Jolpica (successeur d'Ergast)
 * Base URL : https://api.jolpi.ca/ergast/f1/
 *
 * Les résultats de saison sont récupérés en masse (pagination par 100)
 * plutôt que course par course.
 */
import { getJSON, TTL } from './http'
import { getTeamColor } from '@/data/teams'
import { getCountryFlag, getNationalityFlag, getNationalityLabel } from '@/data/nationalities'

const BASE_URL = 'https://api.jolpi.ca/ergast/f1'
const PAGE_SIZE = 100

const CURRENT_YEAR = new Date().getFullYear()

/** Durée de cache selon la saison : une saison terminée ne bouge plus */
function seasonTTL(season) {
  const year = season === 'current' ? CURRENT_YEAR : parseInt(season)
  return year < CURRENT_YEAR ? 30 * TTL.DAY : 10 * TTL.MINUTE
}

function buildUrl(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}.json`)
  Object.entries({ limit: PAGE_SIZE, ...params }).forEach(([k, v]) => url.searchParams.set(k, v))
  return url.toString()
}

function fetchErgast(path, params, opts) {
  return getJSON(buildUrl(path, params), opts)
}

/**
 * Récupère toutes les pages d'un endpoint « Races » et fusionne les courses
 * (une même course peut être coupée entre deux pages).
 */
async function fetchAllRaces(path, opts, resultsKey) {
  const first = await fetchErgast(path, { offset: 0 }, opts)
  const total = parseInt(first?.MRData?.total ?? 0)
  const pages = [first]

  if (total > PAGE_SIZE) {
    const offsets = []
    for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) offsets.push(offset)
    pages.push(...(await Promise.all(offsets.map((offset) => fetchErgast(path, { offset }, opts)))))
  }

  const byRace = new Map()
  for (const page of pages) {
    for (const race of page?.MRData?.RaceTable?.Races ?? []) {
      const key = `${race.season}-${race.round}`
      const existing = byRace.get(key)
      if (existing) {
        existing[resultsKey].push(...(race[resultsKey] ?? []))
      } else {
        byRace.set(key, { ...race, [resultsKey]: [...(race[resultsKey] ?? [])] })
      }
    }
  }
  return [...byRace.values()].sort((a, b) => a.season - b.season || a.round - b.round)
}

// ---------------------------------------------------------------------------
// CLASSEMENTS
// ---------------------------------------------------------------------------

export async function fetchDriverStandings(season = 'current') {
  const data = await fetchErgast(`/${season}/driverStandings`, {}, { ttl: seasonTTL(season) })
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]
  return {
    round: parseInt(list?.round ?? 0),
    standings: (list?.DriverStandings ?? []).map(mapDriverStanding),
  }
}

export async function fetchConstructorStandings(season = 'current') {
  const data = await fetchErgast(`/${season}/constructorStandings`, {}, { ttl: seasonTTL(season) })
  const standings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? []
  return standings.map(mapConstructorStanding)
}

// ---------------------------------------------------------------------------
// CALENDRIER & RÉSULTATS
// ---------------------------------------------------------------------------

export async function fetchSeasonSchedule(season = 'current') {
  const data = await fetchErgast(`/${season}`, {}, { ttl: season === 'current' ? 6 * TTL.HOUR : seasonTTL(season) })
  return (data?.MRData?.RaceTable?.Races ?? []).map(mapRace)
}

/** Tous les résultats de course de la saison, indexés par manche */
export async function fetchSeasonResults(season = 'current') {
  const races = await fetchAllRaces(`/${season}/results`, { ttl: seasonTTL(season) }, 'Results')
  return new Map(races.map((r) => [parseInt(r.round), r.Results.map(mapResult)]))
}

/** Tous les résultats de sprint de la saison, indexés par manche */
export async function fetchSeasonSprints(season = 'current') {
  const races = await fetchAllRaces(`/${season}/sprint`, { ttl: seasonTTL(season) }, 'SprintResults')
  return new Map(races.map((r) => [parseInt(r.round), r.SprintResults.map(mapResult)]))
}

/** Toutes les qualifications de la saison, indexées par manche */
export async function fetchSeasonQualifying(season = 'current') {
  const races = await fetchAllRaces(`/${season}/qualifying`, { ttl: seasonTTL(season) }, 'QualifyingResults')
  return new Map(races.map((r) => [parseInt(r.round), r.QualifyingResults.map(mapQualifying)]))
}

/** Les derniers vainqueurs sur un circuit (du plus récent au plus ancien) */
export async function fetchCircuitWinners(circuitId, count = 5) {
  const races = await fetchAllRaces(`/circuits/${circuitId}/results/1`, { ttl: TTL.DAY }, 'Results')
  return races
    .sort((a, b) => b.season - a.season || b.round - a.round)
    .slice(0, count)
    .map((r) => ({
      season: parseInt(r.season),
      driverId: r.Results[0]?.Driver?.driverId,
      driver: `${r.Results[0]?.Driver?.givenName} ${r.Results[0]?.Driver?.familyName}`,
      code: r.Results[0]?.Driver?.code,
      constructorId: r.Results[0]?.Constructor?.constructorId,
      constructor: r.Results[0]?.Constructor?.name,
      color: getTeamColor(r.Results[0]?.Constructor?.constructorId),
    }))
}

/** Arrêts aux stands d'une course (disponible depuis 2012) */
export async function fetchPitStops(season, round) {
  const races = await fetchAllRaces(`/${season}/${round}/pitstops`, { ttl: seasonTTL(season) }, 'PitStops')
  return (races[0]?.PitStops ?? []).map((p) => ({
    driverId: p.driverId,
    lap: parseInt(p.lap),
    stop: parseInt(p.stop),
    duration: parseFloat(p.duration) || null,
  }))
}

// ---------------------------------------------------------------------------
// STATS CARRIÈRE
// ---------------------------------------------------------------------------

async function countTotal(path) {
  const data = await fetchErgast(path, { limit: 1 }, { ttl: TTL.DAY })
  return parseInt(data?.MRData?.total ?? 0)
}

export async function fetchDriverCareerStats(driverId) {
  const base = `/drivers/${driverId}`
  const [wins, p2, p3, poles, fastestLaps, races, seasons] = await Promise.all([
    countTotal(`${base}/results/1`),
    countTotal(`${base}/results/2`),
    countTotal(`${base}/results/3`),
    countTotal(`${base}/grid/1/results`),
    countTotal(`${base}/fastest/1/results`),
    countTotal(`${base}/results`),
    countTotal(`${base}/seasons`),
  ])
  return { wins, podiums: wins + p2 + p3, poles, fastestLaps, races, seasons }
}

export async function fetchTeamCareerStats(teamId) {
  const base = `/constructors/${teamId}`
  const [wins, p2, p3, poles, races] = await Promise.all([
    countTotal(`${base}/results/1`),
    countTotal(`${base}/results/2`),
    countTotal(`${base}/results/3`),
    countTotal(`${base}/grid/1/results`),
    countTotal(`${base}/races`),
  ])
  return { wins, podiums: wins + p2 + p3, poles, races }
}

// ---------------------------------------------------------------------------
// MAPPERS – format Ergast → format interne de l'app
// ---------------------------------------------------------------------------

function mapDriverBase(d) {
  return {
    id: d.driverId,
    name: `${d.givenName} ${d.familyName}`,
    givenName: d.givenName,
    familyName: d.familyName,
    shortName: d.code ?? d.driverId.substring(0, 3).toUpperCase(),
    number: parseInt(d.permanentNumber) || 0,
    nationality: getNationalityLabel(d.nationality),
    flag: getNationalityFlag(d.nationality),
    dob: d.dateOfBirth ?? null,
    url: d.url,
  }
}

function mapDriverStanding(entry) {
  // Un pilote peut changer d'écurie en cours de saison : on prend la dernière
  const constructors = entry.Constructors ?? []
  const c = constructors[constructors.length - 1]
  return {
    ...mapDriverBase(entry.Driver),
    points: parseFloat(entry.points) || 0,
    wins: parseInt(entry.wins) || 0,
    position: parseInt(entry.position) || 0,
    team: c?.name ?? '',
    teamId: c?.constructorId ?? '',
    color: getTeamColor(c?.constructorId),
    podiums: 0,
    poles: 0,
  }
}

function mapConstructorStanding(entry) {
  const c = entry.Constructor
  return {
    id: c.constructorId,
    name: c.name,
    nationality: getNationalityLabel(c.nationality),
    flag: getNationalityFlag(c.nationality),
    points: parseFloat(entry.points) || 0,
    wins: parseInt(entry.wins) || 0,
    position: parseInt(entry.position) || 0,
    color: getTeamColor(c.constructorId),
    url: c.url,
    podiums: 0,
    poles: 0,
  }
}

function toSession(s) {
  return s ? { date: s.date, time: s.time ?? '' } : null
}

function mapRace(r) {
  const loc = r.Circuit?.Location ?? {}
  return {
    id: parseInt(r.round),
    round: parseInt(r.round),
    season: parseInt(r.season),
    name: r.raceName,
    circuit: r.Circuit?.circuitName ?? '',
    circuitId: r.Circuit?.circuitId ?? '',
    country: loc.country ?? '',
    locality: loc.locality ?? '',
    lat: parseFloat(loc.lat),
    long: parseFloat(loc.long),
    flag: getCountryFlag(loc.country, r.raceName),
    date: r.date,
    time: r.time ?? '',
    fp1: toSession(r.FirstPractice),
    fp2: toSession(r.SecondPractice),
    fp3: toSession(r.ThirdPractice),
    qualifying: toSession(r.Qualifying),
    sprint: toSession(r.Sprint),
    sprintQualifying: toSession(r.SprintQualifying ?? r.SprintShootout),
    results: [],
    sprintResults: [],
    qualifyingResults: [],
    completed: false,
  }
}

function mapResult(res) {
  const pos = parseInt(res.position)
  return {
    pos,
    positionText: res.positionText,
    classified: /^\d+$/.test(res.positionText),
    number: parseInt(res.number) || 0,
    driver: res.Driver?.code ?? res.Driver?.driverId?.substring(0, 3).toUpperCase(),
    driverId: res.Driver?.driverId,
    driverName: `${res.Driver?.givenName} ${res.Driver?.familyName}`,
    constructor: res.Constructor?.name,
    constructorId: res.Constructor?.constructorId,
    color: getTeamColor(res.Constructor?.constructorId),
    grid: parseInt(res.grid) || 0,
    laps: parseInt(res.laps) || 0,
    status: res.status,
    time: res.Time?.time ?? res.status,
    points: parseFloat(res.points) || 0,
    fastestLap: res.FastestLap
      ? { rank: parseInt(res.FastestLap.rank), lap: parseInt(res.FastestLap.lap), time: res.FastestLap.Time?.time }
      : null,
  }
}

function mapQualifying(q) {
  return {
    pos: parseInt(q.position),
    driver: q.Driver?.code ?? q.Driver?.driverId?.substring(0, 3).toUpperCase(),
    driverId: q.Driver?.driverId,
    driverName: `${q.Driver?.givenName} ${q.Driver?.familyName}`,
    constructorId: q.Constructor?.constructorId,
    constructor: q.Constructor?.name,
    color: getTeamColor(q.Constructor?.constructorId),
    q1: q.Q1 ?? '',
    q2: q.Q2 ?? '',
    q3: q.Q3 ?? '',
  }
}
