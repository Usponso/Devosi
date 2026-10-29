/**
 * Synchronise le calendrier et les résultats de la saison (Jolpica) avec la base :
 * écrit sur la sortie standard une requête SQL qui appelle public.sync_races(), à
 * exécuter avec psql. Utilisé par le workflow GitHub « Courses ».
 *
 * Usage : node scripts/sync-races.mjs [saison] > races.sql
 *         psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f races.sql
 */
import { gpNameFr } from './catalog/gp-names.mjs'

const JOLPICA = 'https://api.jolpi.ca/ergast/f1'
const UA = 'Devosi/1.0 (synchro des pronostics ; https://github.com/Usponso/Devosi)'
const season = process.argv[2] ?? 'current'

async function get(path) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${JOLPICA}${path}`, { headers: { 'User-Agent': UA } })
    if (res.ok) return res.json()
    if (attempt >= 3 || (res.status !== 429 && res.status < 500)) throw new Error(`${path} : HTTP ${res.status}`)
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
  }
}

const races = async (path) => (await get(`${path}.json?limit=100`)).MRData.RaceTable.Races

/** Date + heure Jolpica → ISO (heure par défaut si absente) */
const at = (session, fallbackTime = '00:00:00Z') =>
  session?.date ? new Date(`${session.date}T${session.time ?? fallbackTime}`).toISOString() : null

const schedule = await races(`/${season}`)
if (!schedule.length) {
  console.error(`Aucune course pour la saison ${season}`)
  process.exit(1)
}
const year = schedule[0].season

// Podium et pole de toutes les manches disputées, en 4 requêtes
const [first, second, third, poles] = await Promise.all([
  races(`/${year}/results/1`),
  races(`/${year}/results/2`),
  races(`/${year}/results/3`),
  races(`/${year}/qualifying/1`),
])
const byRound = (list, key) => new Map(list.map((r) => [r.round, r[key]?.[0]?.Driver?.driverId ?? null]))
const p1 = byRound(first, 'Results')
const p2 = byRound(second, 'Results')
const p3 = byRound(third, 'Results')
const pole = byRound(poles, 'QualifyingResults')

const DAY = 24 * 3600 * 1000
const rows = schedule.map((r) => {
  const raceAt = at(r, '12:00:00Z')
  const firstSession = r.FirstPractice ?? r.SprintQualifying ?? r.Qualifying ?? r
  const weekendStart = new Date(`${firstSession.date ?? r.date}T00:00:00Z`)
  return {
    season: Number(r.season),
    round: Number(r.round),
    name: gpNameFr(r.raceName),
    circuit_id: r.Circuit.circuitId,
    weekend_start: (firstSession.date ? weekendStart : new Date(Date.parse(raceAt) - 2 * DAY)).toISOString(),
    // Sans horaire de qualifs connu : la veille de la course
    quali_at: at(r.Qualifying, '14:00:00Z') ?? new Date(Date.parse(raceAt) - DAY).toISOString(),
    race_at: raceAt,
    pole: pole.get(r.round) ?? null,
    p1: p1.get(r.round) ?? null,
    p2: p2.get(r.round) ?? null,
    p3: p3.get(r.round) ?? null,
  }
})

const json = JSON.stringify(rows).replace(/'/g, "''")
console.log(`select public.sync_races('${json}'::jsonb);`)
console.error(`Saison ${year} : ${rows.length} courses, ${rows.filter((r) => r.p1).length} avec résultats`)
