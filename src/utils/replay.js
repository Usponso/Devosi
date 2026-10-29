/**
 * Replay d'une séance à partir des tours OpenF1 (fonctions pures).
 *  - Course / sprint : classement et écarts à chaque tour du leader, état de la piste
 *    (safety car, VSC, drapeau rouge) et fil d'événements (départ, dépassements, arrêts,
 *    abandons).
 *  - Qualifs / essais : meilleur tour de chaque pilote au fil de la séance.
 */

/** Instant (ms) où un pilote boucle un tour */
function crossing(lap, next) {
  const start = lap.date_start ? Date.parse(lap.date_start) : null
  if (start != null && lap.lap_duration) return start + lap.lap_duration * 1000
  return next?.date_start ? Date.parse(next.date_start) : null
}

/** n → [instant de fin du tour 1, du tour 2, …] (index = tour) */
function crossingsByDriver(laps) {
  const byDriver = new Map()
  for (const l of laps) {
    if (!byDriver.has(l.driver_number)) byDriver.set(l.driver_number, [])
    byDriver.get(l.driver_number).push(l)
  }
  const out = new Map()
  for (const [n, list] of byDriver) {
    list.sort((a, b) => a.lap_number - b.lap_number)
    const times = []
    list.forEach((l, i) => {
      const t = crossing(l, list[i + 1])
      if (t != null) times[l.lap_number] = t
    })
    out.set(n, times)
  }
  return out
}

/** Messages de la direction de course → état de la piste et événement en français */
const CONTROL_RULES = [
  [/VSC DEPLOYED/, 'VSC', 'Virtual safety car'],
  [/VSC ENDING/, null, 'Fin de la virtual safety car'],
  [/SAFETY CAR DEPLOYED/, 'SC', 'Safety car'],
  [/SAFETY CAR IN THIS LAP/, 'SC', 'La safety car rentre à ce tour'],
]

function controlEvents(control) {
  const events = []
  for (const m of control ?? []) {
    if (m.lap_number == null) continue
    const msg = String(m.message ?? '').toUpperCase()
    if (m.category === 'SafetyCar') {
      const rule = CONTROL_RULES.find(([re]) => re.test(msg))
      if (rule) events.push({ lap: m.lap_number, kind: 'flag', track: rule[1], end: rule[1] === null || /IN THIS LAP/.test(msg), text: rule[2] })
    } else if (m.category === 'Flag' && m.flag === 'RED') {
      events.push({ lap: m.lap_number, kind: 'flag', track: 'RED', text: 'Drapeau rouge' })
    } else if (m.category === 'Flag' && m.flag === 'GREEN' && events.at(-1)?.track === 'RED') {
      events.push({ lap: m.lap_number, kind: 'flag', track: null, end: true, text: 'Reprise de la course' })
    }
  }
  return events
}

/**
 * Replay d'une course ou d'un sprint.
 * @param {object} data - { laps, control, pits } (OpenF1)
 * @param {Array} results - résultats Jolpica (grille, statut, tours) pour le départ et les abandons
 * @returns {{ totalLaps, frames, lapTimes, track, events }}
 *   frames[L] : [{ n, pos, gap (s) | lapsDown, pit, out }] dans l'ordre (L = 0 : grille)
 */
export function buildRaceReplay({ laps, control, pits }, results = []) {
  const cross = crossingsByDriver(laps)
  const totalLaps = Math.max(0, ...[...cross.values()].map((t) => t.length - 1))
  const pitLaps = new Map()
  for (const p of pits ?? []) {
    if (!pitLaps.has(p.driver_number)) pitLaps.set(p.driver_number, new Map())
    pitLaps.get(p.driver_number).set(p.lap_number, { stop: p.stop_duration ?? null, lane: p.pit_duration ?? null })
  }

  // Abandons : dernier tour bouclé des pilotes non classés
  const byNumber = new Map(results.map((r) => [r.number, r]))
  const retiredAfter = new Map()
  for (const r of results) {
    if (!r.classified || /disqualified/i.test(r.status)) retiredAfter.set(r.number, r.laps)
  }

  // Instant de passage du leader à chaque tour
  const leaderCross = []
  for (let L = 1; L <= totalLaps; L++) {
    leaderCross[L] = Math.min(...[...cross.values()].map((t) => t[L] ?? Infinity))
  }

  // Grille de départ (Jolpica ; départ des stands en fin de grille)
  const drivers = [...cross.keys()]
  const gridPos = (n) => byNumber.get(n)?.grid || 99
  const frames = [
    [...drivers].sort((a, b) => gridPos(a) - gridPos(b)).map((n, i) => ({ n, pos: i + 1, gap: null, lapsDown: 0, pit: false, out: false })),
  ]

  for (let L = 1; L <= totalLaps; L++) {
    // Juste avant que le leader ne boucle le tour suivant : tous les pilotes du tour ont passé la ligne
    const limit = L < totalLaps ? leaderCross[L + 1] - 1 : leaderCross[L] + 5 * 60000
    const rows = drivers.map((n) => {
      const t = cross.get(n)
      let k = 0
      for (let i = 1; i < t.length; i++) if (t[i] != null && t[i] <= limit) k = i
      const out = retiredAfter.has(n) && k < L && k >= retiredAfter.get(n)
      return {
        n,
        k,
        at: t[k] ?? Infinity,
        gap: k > 0 && Number.isFinite(leaderCross[k]) ? (t[k] - leaderCross[k]) / 1000 : null,
        lapsDown: Math.max(0, L - k),
        pit: pitLaps.get(n)?.has(L) ?? false,
        out,
      }
    })
    rows.sort((a, b) => a.out - b.out || b.k - a.k || a.at - b.at)
    frames.push(rows.map((r, i) => ({ n: r.n, pos: i + 1, gap: r.gap, lapsDown: r.out ? 0 : r.lapsDown, pit: r.pit, out: r.out })))
  }

  // Durée des tours du leader (placement des voitures sur le tracé)
  const lapTimes = [null]
  for (let L = 1; L <= totalLaps; L++) {
    const prev = L > 1 ? leaderCross[L - 1] : null
    lapTimes[L] = prev && Number.isFinite(leaderCross[L]) ? (leaderCross[L] - prev) / 1000 : 95
  }

  // État de la piste par tour
  const ctrl = controlEvents(control)
  const track = []
  let state = null
  for (let L = 0; L <= totalLaps; L++) {
    const here = ctrl.filter((x) => x.lap === L)
    for (const e of here) state = e.track
    // Neutralisation déclenchée et levée dans le même tour : le tour reste neutralisé
    track[L] = state ?? here.find((e) => e.track)?.track ?? null
    if (here.some((e) => e.end)) state = null
  }

  // Fil d'événements
  const events = ctrl.map(({ lap, kind, text }) => ({ lap, kind, text }))
  for (const [n, map] of pitLaps) {
    for (const [lap, { stop, lane }] of map) {
      const sec = (v) => v.toFixed(1).replace('.', ',')
      const detail = stop ? ` (arrêt de ${sec(stop)} s)` : lane ? ` (${sec(lane)} s)` : ''
      events.push({ lap, kind: 'pit', n, text: `aux stands${detail}` })
    }
  }
  for (const [n, k] of retiredAfter) {
    if (k < totalLaps) events.push({ lap: k + 1, kind: 'out', n, text: 'abandonne' })
  }
  // Départ : plus belle remontée du 1er tour
  if (frames[1]) {
    const best = frames[1]
      .map((r) => ({ n: r.n, gained: (frames[0].find((g) => g.n === r.n)?.pos ?? r.pos) - r.pos }))
      .sort((a, b) => b.gained - a.gained)[0]
    if (best?.gained >= 2) events.push({ lap: 1, kind: 'move', n: best.n, text: `gagne ${best.gained} places au départ` })
  }
  // Dépassements en piste dans le top 10 (sans arrêt aux stands ni neutralisation)
  for (let L = 2; L <= totalLaps; L++) {
    if (track[L] || track[L - 1]) continue
    const before = new Map(frames[L - 1].map((r) => [r.n, r]))
    const now = frames[L]
    for (let i = 0; i < Math.min(10, now.length); i++) {
      const a = now[i]
      const prevA = before.get(a.n)
      if (!prevA || a.out || a.pit || prevA.pit) continue
      // Voiture juste derrière, qui était devant au tour précédent
      const b = now[i + 1]
      const prevB = b && before.get(b.n)
      if (!prevB || b.out || b.pit || prevB.pit || pitLaps.get(b.n)?.has(L + 1)) continue
      if (prevA.pos > prevB.pos) {
        events.push({ lap: L, kind: a.pos === 1 ? 'lead' : 'move', n: a.n, other: b.n, text: a.pos === 1 ? 'prend la tête devant' : 'dépasse' })
      }
    }
  }
  events.sort((a, b) => a.lap - b.lap)

  return { totalLaps, frames, lapTimes, track, events }
}

/**
 * Replay d'une séance chronométrée (qualifs, essais) : tours chronométrés dans l'ordre.
 * @returns {{ start, duration, laps: [{ t (s depuis le début), n, time }], events }}
 */
export function buildTimedReplay({ laps, control }, sessionStart, sessionEnd) {
  const start = sessionStart.getTime()
  const timed = laps
    .filter((l) => l.lap_duration && l.date_start && !l.is_pit_out_lap)
    .map((l) => ({ t: (Date.parse(l.date_start) + l.lap_duration * 1000 - start) / 1000, n: l.driver_number, time: l.lap_duration }))
    .filter((l) => l.t >= 0)
    .sort((a, b) => a.t - b.t)
  const duration = Math.max((sessionEnd.getTime() - start) / 1000, timed.at(-1)?.t ?? 0)

  // Événements : chaque nouveau meilleur temps de la séance, drapeaux rouges
  const events = []
  let best = Infinity
  for (const l of timed) {
    if (l.time < best) {
      best = l.time
      events.push({ t: l.t, kind: 'lead', n: l.n, text: `meilleur temps : ${formatLapTime(l.time)}` })
    }
  }
  for (const m of control ?? []) {
    if (m.category === 'Flag' && m.flag === 'RED' && m.date) {
      events.push({ t: (Date.parse(m.date) - start) / 1000, kind: 'flag', text: 'Drapeau rouge' })
    }
  }
  events.sort((a, b) => a.t - b.t)
  return { start, duration, laps: timed, events }
}

/** Classement au temps `t` (s) : [{ n, time, gap }] du meilleur au moins bon, puis sans temps */
export function timedStandings(replay, t, numbers) {
  const best = new Map()
  for (const l of replay.laps) {
    if (l.t > t) break
    if (!best.has(l.n) || l.time < best.get(l.n)) best.set(l.n, l.time)
  }
  const ranked = [...best.entries()].sort((a, b) => a[1] - b[1])
  const p1 = ranked[0]?.[1]
  const rows = ranked.map(([n, time]) => ({ n, time, gap: time - p1 }))
  for (const n of numbers) if (!best.has(n)) rows.push({ n, time: null, gap: null })
  return rows
}

/** 83.456 → « 1:23.456 » */
export function formatLapTime(sec) {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = (sec - m * 60).toFixed(3).padStart(6, '0')
  return m ? `${m}:${s}` : s
}
