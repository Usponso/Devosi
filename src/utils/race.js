/** Utilitaires sur les courses : séances du week-end, dates, formats */

const SESSION_DEFS = [
  ['fp1', 'Essais libres 1', 'EL1'],
  ['fp2', 'Essais libres 2', 'EL2'],
  ['fp3', 'Essais libres 3', 'EL3'],
  ['sprintQualifying', 'Qualifs sprint', 'QS'],
  ['sprint', 'Sprint', 'Sprint'],
  ['qualifying', 'Qualifications', 'Qualifs'],
]

// Durée approximative de chaque séance (pour savoir si elle est « en cours »)
const SESSION_DURATION = {
  fp1: 60, fp2: 60, fp3: 60, sprintQualifying: 45, sprint: 60, qualifying: 60, race: 120,
}

export function toDate(date, time) {
  if (!date) return null
  return new Date(`${date}T${time || '00:00:00Z'}`)
}

/** Liste chronologique des séances d'un week-end : [{ key, label, short, start, end }] */
export function weekendSessions(race) {
  if (!race) return []
  const sessions = SESSION_DEFS.filter(([key]) => race[key]).map(([key, label, short]) => ({
    key,
    label,
    short,
    start: toDate(race[key].date, race[key].time),
  }))
  sessions.push({ key: 'race', label: 'Course', short: 'Course', start: toDate(race.date, race.time) })
  return sessions
    .map((s) => ({ ...s, end: new Date(s.start.getTime() + SESSION_DURATION[s.key] * 60000) }))
    .sort((a, b) => a.start - b.start)
}

/** Prochaine séance non terminée (ou en cours) */
export function nextSession(race, now = new Date()) {
  return weekendSessions(race).find((s) => s.end > now) ?? null
}

export const isSprintWeekend = (race) => Boolean(race?.sprint)

// ---------------------------------------------------------------------------
// Formats (fr-FR, heure locale de l'utilisateur)
// ---------------------------------------------------------------------------

export function formatDate(date, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('fr-FR', opts)
}

export const formatShortDate = (date) => formatDate(date, { day: 'numeric', month: 'short' })

export function formatSessionTime(date) {
  return date.toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

export function formatWeekendRange(race) {
  const sessions = weekendSessions(race)
  if (!sessions.length) return ''
  const first = sessions[0].start
  const last = sessions[sessions.length - 1].start
  const sameMonth = first.getMonth() === last.getMonth()
  const startStr = first.toLocaleDateString('fr-FR', sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })
  return `${startStr}–${formatDate(last, { day: 'numeric', month: 'short' })}`
}

/** Âge à partir d'une date de naissance ISO */
export function age(dob) {
  if (!dob) return null
  const birth = new Date(dob)
  const now = new Date()
  let a = now.getFullYear() - birth.getFullYear()
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) a--
  return a
}

/** Nom court : « Singapore Grand Prix » → « Singapore » */
export function shortRaceName(name) {
  return name.replace(/\s*Grand Prix$/i, '').trim()
}
