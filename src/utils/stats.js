/**
 * Statistiques dérivées des résultats de la saison (fonctions pures).
 * Les courses attendues sont au format interne : { round, name, completed, results, sprintResults, qualifyingResults, sprint }
 */

const completedRaces = (races) => races.filter((r) => r.completed).sort((a, b) => a.round - b.round)

/** Pole = 1er des qualifications si disponible, sinon 1er sur la grille */
function poleSitter(race) {
  return race.qualifyingResults?.find((q) => q.pos === 1)?.driverId ?? race.results.find((r) => r.grid === 1)?.driverId
}

// ---------------------------------------------------------------------------
// Progression des points
// ---------------------------------------------------------------------------

/**
 * Cumul des points (course + sprint) manche par manche.
 * @param {'driver'|'team'} by
 * @returns {{ rounds: {round:number, name:string}[], series: Map<string, number[]> }}
 */
export function pointsProgression(races, by = 'driver') {
  const key = by === 'driver' ? 'driverId' : 'constructorId'
  const done = completedRaces(races)
  const totals = new Map()
  const series = new Map()

  done.forEach((race, idx) => {
    for (const res of [...race.results, ...(race.sprintResults ?? [])]) {
      totals.set(res[key], (totals.get(res[key]) ?? 0) + res.points)
    }
    for (const [id, total] of totals) {
      if (!series.has(id)) series.set(id, new Array(idx).fill(0))
      series.get(id)[idx] = total
    }
    // Les absents de la manche gardent leur total précédent
    for (const arr of series.values()) {
      if (arr.length <= idx) arr[idx] = arr[idx - 1] ?? 0
    }
  })

  return { rounds: done.map((r) => ({ round: r.round, name: r.name })), series }
}

// ---------------------------------------------------------------------------
// Lutte pour le titre
// ---------------------------------------------------------------------------

function maxPoints(season, by) {
  // Point du meilleur tour : 2019 → 2024
  const fastestLap = season >= 2019 && season <= 2024 ? 1 : 0
  const sprint = season >= 2022 ? 8 : season === 2021 ? 3 : 0
  if (by === 'team') {
    return { race: 25 + 18 + fastestLap, sprint: sprint ? sprint + sprint - 1 : 0 }
  }
  return { race: 25 + fastestLap, sprint }
}

/**
 * Qui peut encore être champion ? Un concurrent reste en lice si son retard
 * sur le leader est inférieur ou égal au maximum de points encore distribuables.
 * @param {{id:string, points:number}[]} standings - classement trié
 */
export function titleContention(standings, races, season, by = 'driver') {
  const racesLeft = races.filter((r) => !r.completed).length
  const sprintsLeft = races.filter((r) => r.sprint && !r.sprintResults?.length).length
  const max = maxPoints(season, by)
  const maxRemaining = racesLeft * max.race + sprintsLeft * max.sprint

  const leader = standings[0]
  const contenders = leader ? standings.filter((s) => leader.points - s.points <= maxRemaining) : []

  return {
    racesLeft,
    sprintsLeft,
    maxRemaining,
    contenders,
    decided: contenders.length === 1 && standings.length > 1,
  }
}

// ---------------------------------------------------------------------------
// Pilote : saison, forme, duel coéquipier
// ---------------------------------------------------------------------------

/** Statistiques de saison d'un pilote */
export function driverSeasonStats(driverId, races) {
  const stats = {
    starts: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0, dnf: 0,
    top10: 0, sprintPoints: 0, bestFinish: null, avgFinish: null, avgGrid: null, gained: 0,
  }
  const finishes = []
  const grids = []

  for (const race of completedRaces(races)) {
    const res = race.results.find((r) => r.driverId === driverId)
    if (poleSitter(race) === driverId) stats.poles++
    const sprint = race.sprintResults?.find((r) => r.driverId === driverId)
    if (sprint) stats.sprintPoints += sprint.points
    if (!res) continue

    stats.starts++
    if (res.grid > 0) grids.push(res.grid)
    if (res.fastestLap?.rank === 1) stats.fastestLaps++
    if (!res.classified) {
      stats.dnf++
      continue
    }
    finishes.push(res.pos)
    if (res.pos === 1) stats.wins++
    if (res.pos <= 3) stats.podiums++
    if (res.pos <= 10) stats.top10++
    if (res.grid > 0) stats.gained += res.grid - res.pos
  }

  if (finishes.length) {
    stats.bestFinish = Math.min(...finishes)
    stats.avgFinish = round1(finishes.reduce((a, b) => a + b, 0) / finishes.length)
  }
  if (grids.length) stats.avgGrid = round1(grids.reduce((a, b) => a + b, 0) / grids.length)
  return stats
}

/** Résultats des n dernières courses : [{ round, name, pos, label, classified, absent }] */
export function recentForm(driverId, races, n = 5) {
  return completedRaces(races)
    .slice(-n)
    .map((race) => {
      const res = race.results.find((r) => r.driverId === driverId)
      return {
        round: race.round,
        name: race.name,
        pos: res?.classified ? res.pos : null,
        label: res ? (res.classified ? `P${res.pos}` : 'AB') : '—',
        classified: Boolean(res?.classified),
        absent: !res,
      }
    })
}

/** Position finale de chaque manche pour un pilote (null si abandon / absent) */
export function finishSeries(driverId, races) {
  return completedRaces(races).map((race) => {
    const res = race.results.find((r) => r.driverId === driverId)
    return res?.classified ? res.pos : null
  })
}

/**
 * Duel entre deux coéquipiers sur les manches disputées ensemble.
 * Course : comparé seulement si les deux sont classés.
 */
export function teammateDuel(aId, bId, races) {
  const duel = {
    quali: [0, 0],
    race: [0, 0],
    points: [0, 0],
    avgQuali: [null, null],
    avgFinish: [null, null],
    rounds: 0,
  }
  const qualis = [[], []]
  const finishes = [[], []]

  for (const race of completedRaces(races)) {
    const a = race.results.find((r) => r.driverId === aId)
    const b = race.results.find((r) => r.driverId === bId)
    const sa = race.sprintResults?.find((r) => r.driverId === aId)
    const sb = race.sprintResults?.find((r) => r.driverId === bId)
    duel.points[0] += (a?.points ?? 0) + (sa?.points ?? 0)
    duel.points[1] += (b?.points ?? 0) + (sb?.points ?? 0)
    if (!a || !b) continue
    duel.rounds++

    const qa = race.qualifyingResults?.find((q) => q.driverId === aId)?.pos ?? a.grid
    const qb = race.qualifyingResults?.find((q) => q.driverId === bId)?.pos ?? b.grid
    if (qa && qb) {
      duel.quali[qa < qb ? 0 : 1]++
      qualis[0].push(qa)
      qualis[1].push(qb)
    }

    if (a.classified && b.classified) {
      duel.race[a.pos < b.pos ? 0 : 1]++
      finishes[0].push(a.pos)
      finishes[1].push(b.pos)
    } else if (a.classified !== b.classified) {
      duel.race[a.classified ? 0 : 1]++
    }
  }

  duel.avgQuali = qualis.map(avg)
  duel.avgFinish = finishes.map(avg)
  return duel
}

// ---------------------------------------------------------------------------
// Course : remontées, compteurs
// ---------------------------------------------------------------------------

/** Plus belles remontées d'une course (pilotes classés, partis de la grille) */
export function biggestMovers(race, n = 3) {
  return race.results
    .filter((r) => r.classified && r.grid > 0)
    .map((r) => ({ ...r, gained: r.grid - r.pos }))
    .sort((a, b) => b.gained - a.gained)
    .slice(0, n)
}

/** Met à jour les compteurs de podiums et de poles des pilotes et écuries (mutation) */
export function applySeasonCounts(drivers, teams, races) {
  const driverMap = new Map(drivers.map((d) => [d.id, d]))
  const teamMap = new Map(teams.map((t) => [t.id, t]))
  for (const entity of [...drivers, ...teams]) {
    entity.podiums = 0
    entity.poles = 0
  }

  for (const race of completedRaces(races)) {
    for (const res of race.results) {
      if (res.classified && res.pos <= 3) {
        driverMap.get(res.driverId) && driverMap.get(res.driverId).podiums++
        teamMap.get(res.constructorId) && teamMap.get(res.constructorId).podiums++
      }
    }
    const pole = poleSitter(race)
    const poleRes = race.results.find((r) => r.driverId === pole)
    if (pole && driverMap.has(pole)) driverMap.get(pole).poles++
    if (poleRes && teamMap.has(poleRes.constructorId)) teamMap.get(poleRes.constructorId).poles++
  }
}

/** Écurie gagnante de chaque manche (pour la frise du calendrier) */
export function winnerOf(race) {
  return race.results?.find((r) => r.pos === 1) ?? null
}

function avg(values) {
  return values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : null
}

function round1(n) {
  return Math.round(n * 10) / 10
}
