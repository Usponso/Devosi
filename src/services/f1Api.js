/**
 * Service F1 API – Ergast via jolpi.ca
 * Base URL: https://api.jolpi.ca/ergast/f1/
 * Toutes les réponses sont en JSON (suffixe .json implicite via Accept header)
 */

const BASE_URL = 'https://api.jolpi.ca/ergast/f1'

/**
 * Fonction utilitaire pour fetch JSON depuis l'API Ergast
 */
async function fetchErgast(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}.json`)
  // Pagination : on force un limit élevé pour récupérer tout
  if (!params.limit) params.limit = 100
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Ergast API error ${res.status}: ${url}`)
  return res.json()
}

// ---------------------------------------------------------------------------
// PILOTES
// ---------------------------------------------------------------------------

/**
 * Récupère le classement des pilotes pour une saison
 * GET /f1/{season}/driverStandings.json
 */
export async function fetchDriverStandings(season = 'current') {
  const data = await fetchErgast(`/${season}/driverStandings`)
  const standings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? []
  return standings.map((entry) => mapDriverStanding(entry))
}

/**
 * Récupère les infos détaillées d'un pilote
 * GET /f1/drivers/{driverId}.json
 */
export async function fetchDriverInfo(driverId) {
  const data = await fetchErgast(`/drivers/${driverId}`)
  const driver = data?.MRData?.DriverTable?.Drivers?.[0]
  return driver ? mapDriver(driver) : null
}

/**
 * Récupère tous les pilotes d'une saison
 * GET /f1/{season}/drivers.json
 */
export async function fetchDriversBySeason(season = 'current') {
  const data = await fetchErgast(`/${season}/drivers`)
  const drivers = data?.MRData?.DriverTable?.Drivers ?? []
  return drivers.map(mapDriver)
}

// ---------------------------------------------------------------------------
// CONSTRUCTEURS
// ---------------------------------------------------------------------------

/**
 * Récupère le classement des constructeurs pour une saison
 * GET /f1/{season}/constructorStandings.json
 */
export async function fetchConstructorStandings(season = 'current') {
  const data = await fetchErgast(`/${season}/constructorStandings`)
  const standings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? []
  return standings.map((entry) => mapConstructorStanding(entry))
}

// ---------------------------------------------------------------------------
// CALENDRIER & COURSES
// ---------------------------------------------------------------------------

/**
 * Récupère le calendrier complet d'une saison (sans résultats)
 * GET /f1/{season}.json
 */
export async function fetchSeasonSchedule(season = 'current') {
  const data = await fetchErgast(`/${season}`)
  const races = data?.MRData?.RaceTable?.Races ?? []
  return races.map(mapRace)
}

/**
 * Récupère les résultats d'un Grand Prix
 * GET /f1/{season}/{round}/results.json
 */
export async function fetchRaceResults(season = 'current', round) {
  const data = await fetchErgast(`/${season}/${round}/results`)
  const race = data?.MRData?.RaceTable?.Races?.[0]
  if (!race) return null
  return mapRaceWithResults(race)
}

/**
 * Récupère les résultats du dernier Grand Prix disputé
 * GET /f1/current/last/results.json
 */
export async function fetchLastRaceResults() {
  const data = await fetchErgast('/current/last/results')
  const race = data?.MRData?.RaceTable?.Races?.[0]
  return race ? mapRaceWithResults(race) : null
}

/**
 * Récupère toutes les courses avec résultats pour une saison
 * (appels multiples en parallèle pour les courses terminées)
 */
export async function fetchSeasonWithResults(season = 'current') {
  const schedule = await fetchSeasonSchedule(season)
  const today = new Date()

  // On enrichit les courses passées avec leurs résultats
  const racesWithResults = await Promise.all(
    schedule.map(async (race) => {
      const raceDate = new Date(race.date)
      if (raceDate < today) {
        try {
          const withResults = await fetchRaceResults(season, race.round)
          return withResults ?? race
        } catch {
          return race
        }
      }
      return race
    }),
  )

  return racesWithResults
}

// ---------------------------------------------------------------------------
// QUALIFICATIONS
// ---------------------------------------------------------------------------

/**
 * Récupère les résultats de qualifications d'un Grand Prix
 * GET /f1/{season}/{round}/qualifying.json
 */
export async function fetchQualifyingResults(season = 'current', round) {
  const data = await fetchErgast(`/${season}/${round}/qualifying`)
  const race = data?.MRData?.RaceTable?.Races?.[0]
  return race?.QualifyingResults ?? []
}

// ---------------------------------------------------------------------------
// STATS CARRIERE (PILOTES ET ECURIES)
// ---------------------------------------------------------------------------

export async function fetchDriverCareerStats(driverId) {
  try {
    const urls = [
      `/drivers/${driverId}/results/1`,
      `/drivers/${driverId}/results/2`,
      `/drivers/${driverId}/results/3`,
      `/drivers/${driverId}/grid/1/results`,
      `/drivers/${driverId}/fastest/1/results`,
      `/drivers/${driverId}/results`
    ];

    const results = [];
    for (const u of urls) {
      const d = await fetchErgast(u, { limit: 1 });
      results.push(parseInt(d?.MRData?.total || 0));
      // Délai pour ne pas saturer l'API Ergast
      await new Promise(r => setTimeout(r, 100));
    }

    const [wins, p2, p3, poles, fastestLaps, races] = results;
    return {
      wins,
      podiums: wins + p2 + p3,
      poles,
      fastestLaps,
      races
    };
  } catch (err) {
    console.error('Erreur fetchDriverCareerStats:', err);
    return null;
  }
}

export async function fetchTeamCareerStats(teamId) {
  try {
    const urls = [
      `/constructors/${teamId}/results/1`,
      `/constructors/${teamId}/results/2`,
      `/constructors/${teamId}/results/3`,
      `/constructors/${teamId}/grid/1/results`
    ];

    const results = [];
    for (const u of urls) {
      const d = await fetchErgast(u, { limit: 1 });
      results.push(parseInt(d?.MRData?.total || 0));
      await new Promise(r => setTimeout(r, 100));
    }

    const [wins, p2, p3, poles] = results;
    return {
      wins,
      podiums: wins + p2 + p3,
      poles
    };
  } catch (err) {
    console.error('Erreur fetchTeamCareerStats:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// MAPPERS – Transformation du format Ergast → format interne de l'app
// ---------------------------------------------------------------------------

/** Couleurs des équipes F1 2025 */
const TEAM_COLORS = {
  red_bull: '#3671C6',
  mclaren: '#FF8000',
  ferrari: '#E8002D',
  mercedes: '#27F4D2',
  aston_martin: '#358C75',
  alpine: '#FF87BC',
  williams: '#64C4FF',
  rb: '#6692FF',
  sauber: '#52E252',
  kick_sauber: '#52E252', // alias legacy
  haas: '#B6BABD',
}

/** Drapeaux par nationalité */
const NATIONALITY_CODES = {
  Dutch: 'nl',
  British: 'gb',
  Monegasque: 'mc',
  Australian: 'au',
  Spanish: 'es',
  Mexican: 'mx',
  German: 'de',
  Finnish: 'fi',
  Canadian: 'ca',
  Danish: 'dk',
  Japanese: 'jp',
  Chinese: 'cn',
  American: 'us',
  Brazilian: 'br',
  French: 'fr',
  Italian: 'it',
  Thai: 'th',
  Russian: 'ru',
  Polish: 'pl',
  Argentine: 'ar',
  Swiss: 'ch',
  Austrian: 'at',
  'New Zealander': 'nz',
  Portuguese: 'pt',
  'South African': 'za',
  Bahraini: 'bh',
  Andorran: 'ad',
  Swedish: 'se',
  Belgian: 'be',
  Venezuelan: 've',
  Indonesian: 'id',
  Korean: 'kr',
  Indian: 'in',
  Argentinian: 'ar'
}

/** Noms FR des nationalités */
const NATIONALITY_FR = {
  Dutch: 'Néerlandais',
  British: 'Britannique',
  Monegasque: 'Monégasque',
  Australian: 'Australien',
  Spanish: 'Espagnol',
  Mexican: 'Mexicain',
  German: 'Allemand',
  Finnish: 'Finlandais',
  Canadian: 'Canadien',
  Danish: 'Danois',
  Japanese: 'Japonais',
  Chinese: 'Chinois',
  American: 'Américain',
  Brazilian: 'Brésilien',
  French: 'Français',
  Italian: 'Italien',
  Thai: 'Thaïlandais',
  Russian: 'Russe',
  Polish: 'Polonais',
  Argentine: 'Argentin',
  Swiss: 'Suisse',
  Austrian: 'Autrichien',
  'New Zealander': 'Néo-Zélandais',
  Portuguese: 'Portugais',
  'South African': 'Sud-Africain',
  Bahraini: 'Bahreïni',
  Swedish: 'Suédois',
  Venezuelan: 'Vénézuélien',
  Indonesian: 'Indonésien',
  Korean: 'Coréen',
  Indian: 'Indien',
  Argentinian: 'Argentin'
}

/** Drapeaux des pays (courses) */
const COUNTRY_CODES = {
  Australia: 'au',
  Bahrain: 'bh',
  China: 'cn',
  Japan: 'jp',
  'Saudi Arabia': 'sa',
  USA: 'us',
  'United States': 'us',
  Italy: 'it',
  Monaco: 'mc',
  Spain: 'es',
  Canada: 'ca',
  Austria: 'at',
  UK: 'gb',
  'United Kingdom': 'gb',
  Belgium: 'be',
  Hungary: 'hu',
  Netherlands: 'nl',
  Azerbaijan: 'az',
  Singapore: 'sg',
  Mexico: 'mx',
  Brazil: 'br',
  Qatar: 'qa',
  UAE: 'ae',
  France: 'fr',
  'Las Vegas': 'us',
  Miami: 'us',
  Russia: 'ru',
  Turkey: 'tr',
  Indonesia: 'id',
  Germany: 'de',
  Malaysia: 'my',
  Korea: 'kr',
  India: 'in',
  Argentina: 'ar',
  Portugal: 'pt',
  'South Africa': 'za',
  Sweden: 'se'
}

function getNationalityFlag(nationality) {
  const code = NATIONALITY_CODES[nationality]
  return code ? `https://flagcdn.com/${code}.svg` : '🏁'
}

function getCountryFlag(country, raceName) {
  let code = COUNTRY_CODES[country]
  if (!code && raceName) {
    code = COUNTRY_CODES[raceName.split(' ').pop()]
  }
  return code ? `https://flagcdn.com/${code}.svg` : '🏁'
}

function getTeamColor(constructorId) {
  return TEAM_COLORS[constructorId] ?? '#FFFFFF'
}

function mapDriver(d) {
  return {
    id: d.driverId,
    name: `${d.givenName} ${d.familyName}`,
    shortName: d.code ?? d.driverId.substring(0, 3).toUpperCase(),
    number: parseInt(d.permanentNumber) || 0,
    nationality: NATIONALITY_FR[d.nationality] ?? d.nationality,
    flag: getNationalityFlag(d.nationality),
    dob: d.dateOfBirth
      ? new Date(d.dateOfBirth).toLocaleDateString('fr-FR')
      : '—',
    url: d.url,
    // Ces champs seront enrichis par le classement
    points: 0,
    wins: 0,
    team: '',
    teamId: '',
    color: '#FFFFFF',
    podiums: 0,
    poles: 0,
    fastestLaps: 0,
    bio: '',
    stats: { races: 0, dnf: 0, avgFinish: 0, avgStart: 0 },
  }
}

function mapDriverStanding(entry) {
  const d = entry.Driver
  // Certains pilotes ont plusieurs constructeurs (changement d'équipe en cours de saison)
  // On prend le dernier constructeur comme équipe actuelle
  const constructors = entry.Constructors ?? []
  const c = constructors[constructors.length - 1]
  return {
    id: d.driverId,
    name: `${d.givenName} ${d.familyName}`,
    shortName: d.code ?? d.driverId.substring(0, 3).toUpperCase(),
    number: parseInt(d.permanentNumber) || 0,
    nationality: NATIONALITY_FR[d.nationality] ?? d.nationality,
    flag: getNationalityFlag(d.nationality),
    dob: d.dateOfBirth
      ? new Date(d.dateOfBirth).toLocaleDateString('fr-FR')
      : '—',
    url: d.url,
    points: parseFloat(entry.points) || 0,
    wins: parseInt(entry.wins) || 0,
    position: parseInt(entry.position) || 0,
    team: c?.name ?? '',
    teamId: c?.constructorId ?? '',
    color: getTeamColor(c?.constructorId),
    podiums: 0,
    poles: 0,
    fastestLaps: 0,
    bio: '',
    stats: { races: 0, dnf: 0, avgFinish: 0, avgStart: 0 },
  }
}

function mapConstructorStanding(entry) {
  const c = entry.Constructor
  return {
    id: c.constructorId,
    name: c.name,
    shortName: c.name,
    nationality: c.nationality,
    points: parseFloat(entry.points) || 0,
    wins: parseInt(entry.wins) || 0,
    position: parseInt(entry.position) || 0,
    color: getTeamColor(c.constructorId),
    podiums: 0,
    poles: 0,
    url: c.url,
    // Champs enrichis depuis mockData/config locale
    base: '',
    principal: '',
    engine: '',
    chassis: '',
    founded: 0,
    championships: 0,
    bio: '',
  }
}

function mapRace(r) {
  const flag = getCountryFlag(r.Circuit?.Location?.country, r.raceName)
  return {
    id: parseInt(r.round),
    round: r.round,
    season: r.season,
    name: r.raceName,
    circuit: r.Circuit?.circuitName ?? '',
    circuitId: r.Circuit?.circuitId ?? '',
    country: r.Circuit?.Location?.country ?? '',
    locality: r.Circuit?.Location?.locality ?? '',
    flag,
    date: r.date,
    time: r.time ?? '',
    completed: false,
    laps: 0,
    distance: '',
    results: [],
    // Sessions (si disponibles)
    fp1: r.FirstPractice ?? null,
    fp2: r.SecondPractice ?? null,
    fp3: r.ThirdPractice ?? null,
    qualifying: r.Qualifying ?? null,
    sprint: r.Sprint ?? null,
    sprintQualifying: r.SprintQualifying ?? null,
  }
}

function mapRaceWithResults(r) {
  const base = mapRace(r)
  const results = (r.Results ?? []).map((res) => ({
    pos: parseInt(res.position),
    driver: res.Driver?.code ?? res.Driver?.driverId?.substring(0, 3).toUpperCase(),
    driverId: res.Driver?.driverId,
    driverName: `${res.Driver?.givenName} ${res.Driver?.familyName}`,
    constructor: res.Constructor?.name,
    constructorId: res.Constructor?.constructorId,
    grid: parseInt(res.grid) || 0,
    laps: parseInt(res.laps) || 0,
    status: res.status,
    time: res.Time?.time ?? res.status,
    points: parseFloat(res.points) || 0,
    fastestLap: res.FastestLap ?? null,
  }))

  return {
    ...base,
    completed: results.length > 0,
    laps: results[0]?.laps ?? 0,
    results,
  }
}
