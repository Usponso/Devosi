/**
 * Génère le catalogue de cartes de la collection :
 * - src/data/catalog.json : toutes les cartes (pilotes, écuries, Grands Prix, moments)
 * - supabase/seed.sql      : la table `cards` (id, type, rareté, écurie, année) pour les packs et les quêtes
 *
 * Sources : API Jolpica (historique F1 depuis 1950), moments écrits à la main
 * (scripts/catalog/moments.json) et photos sous licence libre de Wikimedia Commons.
 *
 * Usage : node scripts/build-catalog.mjs
 * Les réponses sont mises en cache dans scripts/catalog/.cache (relancer est quasi instantané).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { getTeamColor } from '../src/data/teams.js'
import { NATIONALITY_CODES, COUNTRY_CODES } from '../src/data/nationalities.js'
import { writeSeed } from './catalog/seed.mjs'
import { gpNameFr } from './catalog/gp-names.mjs'
import { MASTERPIECE_ALBUM, masterpieceCards } from './catalog/masterpieces.mjs'
import { posterCards } from './catalog/posters.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CACHE_DIR = `${ROOT}scripts/catalog/.cache`
const JOLPICA = 'https://api.jolpi.ca/ergast/f1'
const UA = 'Devosi/1.0 (catalogue de cartes F1 ; https://github.com/Usponso/Devosi)'
const FIRST_SEASON = 1950
const CURRENT_YEAR = new Date().getFullYear()
/** Dernière saison terminée : les titres de la saison en cours ne sont pas encore attribués */
const LAST_COMPLETE = CURRENT_YEAR - 1

mkdirSync(CACHE_DIR, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// HTTP avec cache disque et débit limité (Jolpica : ~4 req/s, 500 req/h)
// ---------------------------------------------------------------------------
let lastCall = 0
async function getJSON(url, { minInterval = 350 } = {}) {
  const file = `${CACHE_DIR}/${createHash('sha1').update(url).digest('hex')}.json`
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))

  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = lastCall + minInterval - Date.now()
    if (wait > 0) await sleep(wait)
    lastCall = Date.now()
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.ok) {
      const data = await res.json()
      writeFileSync(file, JSON.stringify(data))
      return data
    }
    if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status} ${url}`)
    const backoff = 2000 * 2 ** attempt
    console.warn(`  ${res.status}, nouvel essai dans ${backoff / 1000}s : ${url}`)
    await sleep(backoff)
  }
  throw new Error(`Échec : ${url}`)
}

async function jolpicaAll(path, extract) {
  const out = []
  for (let offset = 0; ; offset += 100) {
    const data = await getJSON(`${JOLPICA}${path}.json?limit=100&offset=${offset}`)
    const items = extract(data.MRData)
    out.push(...items)
    if (offset + 100 >= parseInt(data.MRData.total)) break
  }
  return out
}

// ---------------------------------------------------------------------------
// Collecte Jolpica
// ---------------------------------------------------------------------------
console.log('Pilotes et écuries…')
const drivers = await jolpicaAll('/drivers', (m) => m.DriverTable.Drivers)
const constructors = await jolpicaAll('/constructors', (m) => m.ConstructorTable.Constructors)

console.log('Résultats (victoires et podiums)…')
const racesByPos = {}
for (const pos of [1, 2, 3]) {
  racesByPos[pos] = await jolpicaAll(`/results/${pos}`, (m) => m.RaceTable.Races)
}

console.log('Classements de chaque saison…')
const driverSeasons = new Map() // driverId → { seasons:Set, titles:[], teams:Map(constructorId→count) }
const teamSeasons = new Map() // constructorId → { seasons:Set, titles:[] }
const ensure = (map, id, init) => map.get(id) ?? map.set(id, init()).get(id)

for (let season = FIRST_SEASON; season <= CURRENT_YEAR; season++) {
  const ds = await jolpicaAll(`/${season}/driverStandings`, (m) => m.StandingsTable.StandingsLists[0]?.DriverStandings ?? [])
  for (const s of ds) {
    const d = ensure(driverSeasons, s.Driver.driverId, () => ({ seasons: new Set(), titles: [], teams: new Map() }))
    d.seasons.add(season)
    if (s.position === '1' && season <= LAST_COMPLETE) d.titles.push(season)
    for (const c of s.Constructors ?? []) d.teams.set(c.constructorId, (d.teams.get(c.constructorId) ?? 0) + 1)
    for (const c of s.Constructors ?? []) ensure(teamSeasons, c.constructorId, () => ({ seasons: new Set(), titles: [] })).seasons.add(season)
  }
  // Championnat constructeurs depuis 1958
  if (season >= 1958) {
    const cs = await jolpicaAll(`/${season}/constructorStandings`, (m) => m.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [])
    for (const s of cs) {
      const t = ensure(teamSeasons, s.Constructor.constructorId, () => ({ seasons: new Set(), titles: [] }))
      t.seasons.add(season)
      if (s.position === '1' && season <= LAST_COMPLETE) t.titles.push(season)
    }
  }
  process.stdout.write(`\r  ${season}`)
}
console.log()

// Victoires / podiums par pilote et par écurie
const count = (map, key) => map.set(key, (map.get(key) ?? 0) + 1)
const driverWins = new Map()
const driverPodiums = new Map()
const teamWins = new Map()
const teamPodiums = new Map()
for (const pos of [1, 2, 3]) {
  for (const race of racesByPos[pos]) {
    for (const r of race.Results) {
      if (pos === 1) {
        count(driverWins, r.Driver.driverId)
        count(teamWins, r.Constructor.constructorId)
      }
      count(driverPodiums, r.Driver.driverId)
      count(teamPodiums, r.Constructor.constructorId)
    }
  }
}

// ---------------------------------------------------------------------------
// Raretés
// ---------------------------------------------------------------------------
function driverRarity(id) {
  const titles = driverSeasons.get(id)?.titles.length ?? 0
  if (titles >= 2) return 'mythic'
  if (titles === 1) return 'legendary'
  if (driverWins.get(id)) return 'epic'
  if (driverPodiums.get(id)) return 'rare'
  return 'common'
}

function teamRarity(id) {
  const titles = teamSeasons.get(id)?.titles.length ?? 0
  if (titles >= 8) return 'mythic'
  if (titles >= 1) return 'legendary'
  if (teamWins.get(id)) return 'epic'
  if (teamPodiums.get(id)) return 'rare'
  return 'common'
}

/** Grands Prix iconiques (saison + nom Jolpica) ; les autres finales de saison sont « rares » */
const ICONIC_GPS = {
  mythic: ['1957 German Grand Prix', '1993 European Grand Prix', '2008 Brazilian Grand Prix', '2021 Abu Dhabi Grand Prix'],
  legendary: [
    '1950 British Grand Prix', '1968 German Grand Prix', '1976 Japanese Grand Prix', '1979 French Grand Prix',
    '1984 Monaco Grand Prix', '1989 Japanese Grand Prix', '2000 Belgian Grand Prix', '2005 Japanese Grand Prix',
    '2011 Canadian Grand Prix',
  ],
  epic: [
    '1985 Portuguese Grand Prix', '1986 Hungarian Grand Prix', '1990 Japanese Grand Prix', '1991 Spanish Grand Prix',
    '1994 Australian Grand Prix', '1996 Monaco Grand Prix', '1997 Hungarian Grand Prix', '2012 European Grand Prix',
    '2012 Abu Dhabi Grand Prix', '2013 Malaysian Grand Prix', '2016 Spanish Grand Prix', '2020 Italian Grand Prix',
    '2020 Bahrain Grand Prix', '2024 Monaco Grand Prix',
  ],
}

const iconicRarity = new Map(Object.entries(ICONIC_GPS).flatMap(([rarity, list]) => list.map((key) => [key, rarity])))

// ---------------------------------------------------------------------------
// Photos Wikimedia Commons (licences libres uniquement)
// ---------------------------------------------------------------------------
const FREE_LICENSE = /^(cc0|cc[ -]by(-sa)?[ -]?\d|cc[ -]by(-sa)?$|public domain|pd\b|pd-)/i
const titleFromUrl = (url) => (url ? decodeURIComponent(url.split('/wiki/')[1] ?? '').replace(/_/g, ' ') : null)
const stripHtml = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

const fileKey = (name) => name.replace(/^File:/, '').replace(/ /g, '_')

/** Fichiers Commons → Map(nom → { url, author, license, source }), licences libres uniquement */
async function commonsInfo(files) {
  const unique = [...new Set(files.filter(Boolean).map(fileKey))]
  const out = new Map()
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50).map((f) => `File:${f}`)
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&titles=${encodeURIComponent(batch.join('|'))}`
    const data = await getJSON(url, { minInterval: 200 })
    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0]
      if (!info) continue // fichier absent de Commons (image non libre hébergée sur Wikipédia)
      const meta = info.extmetadata ?? {}
      const license = stripHtml(meta.LicenseShortName?.value)
      if (!FREE_LICENSE.test(license)) continue
      out.set(fileKey(page.title), {
        url: (info.thumburl ?? info.url).split('?')[0],
        author: stripHtml(meta.Artist?.value).slice(0, 80) || 'Auteur inconnu',
        license,
        source: info.descriptionurl,
      })
    }
  }
  return out
}

/** Articles Wikipédia → { image principale, identifiant Wikidata, page d'homonymie ? } */
async function wikipediaLookup(titles) {
  const pages = new Map()
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50)
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages|pageprops&piprop=name&ppprop=wikibase_item|disambiguation&titles=${encodeURIComponent(batch.join('|'))}`
    const data = await getJSON(url, { minInterval: 200 })
    const redirect = new Map()
    for (const n of data.query?.normalized ?? []) redirect.set(n.to, n.from)
    for (const r of data.query?.redirects ?? []) redirect.set(r.to, redirect.get(r.from) ?? r.from)
    for (const page of Object.values(data.query?.pages ?? {})) {
      if (page.missing !== undefined) continue
      const entry = {
        image: page.pageimage ?? null,
        qid: page.pageprops?.wikibase_item ?? null,
        disambiguation: page.pageprops?.disambiguation !== undefined,
      }
      pages.set(redirect.get(page.title) ?? page.title, entry)
      pages.set(page.title, entry)
    }
  }
  return pages
}

/**
 * Articles Wikipédia → image principale et identifiant Wikidata.
 * Certains liens de la base F1 pointent désormais vers une page d'homonymie
 * (« Tony Brooks ») : on essaie alors « … (racing driver) ».
 */
async function wikipediaPages(titles) {
  const pages = await wikipediaLookup(titles)
  const ambiguous = titles.filter((t) => pages.get(t)?.disambiguation)
  const alternates = await wikipediaLookup(ambiguous.map((t) => `${t} (racing driver)`))
  for (const title of ambiguous) {
    const alt = alternates.get(`${title} (racing driver)`)
    if (alt && !alt.disambiguation) pages.set(title, alt)
  }
  return pages
}

/** Éléments Wikidata → { image (P18), category (P373, catégorie Commons), sitelinks (titres par wiki) } */
async function wikidataClaims(qids) {
  const out = new Map()
  const unique = [...new Set(qids.filter(Boolean))]
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50)
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|sitelinks&sitefilter=dewiki|frwiki|itwiki&ids=${batch.join('|')}`
    const data = await getJSON(url, { minInterval: 200 })
    for (const [qid, entity] of Object.entries(data.entities ?? {})) {
      const value = (prop) => entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value ?? null
      const sitelinks = Object.fromEntries(Object.entries(entity.sitelinks ?? {}).map(([site, link]) => [site, link.title]))
      out.set(qid, { image: value('P18'), category: value('P373'), sitelinks })
    }
  }
  return out
}

/** Image principale d'articles d'une Wikipédia donnée → Map(titre → fichier) */
async function pageImages(wiki, titles) {
  const out = new Map()
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50)
    const url = `https://${wiki}.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=name&titles=${encodeURIComponent(batch.join('|'))}`
    const data = await getJSON(url, { minInterval: 200 })
    const redirect = new Map()
    for (const n of data.query?.normalized ?? []) redirect.set(n.to, n.from)
    for (const r of data.query?.redirects ?? []) redirect.set(r.to, redirect.get(r.from) ?? r.from)
    for (const page of Object.values(data.query?.pages ?? {})) {
      if (page.pageimage) out.set(redirect.get(page.title) ?? page.title, page.pageimage)
    }
  }
  return out
}

// Fichiers à écarter dans une catégorie Commons (pas une photo du sujet)
const NOT_A_PHOTO = /logo|map|karte|flag|signature|autograph|grave|tomb|plaque|statue|coat.of.arms|diagram|layout|ticket|poster|stamp|helmet|integralhelm|collection|museo|museum|exhibit|replica|lived.here|wax|racing.suit|overall/i

/** Première photo libre d'une catégorie Commons */
async function categoryPhoto(category) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=categorymembers&cmtype=file&cmlimit=30&cmtitle=${encodeURIComponent(`Category:${category}`)}`
  const data = await getJSON(url, { minInterval: 200 })
  const files = (data.query?.categorymembers ?? [])
    .map((m) => m.title)
    .filter((t) => /\.(jpe?g|png|webp)$/i.test(t) && !NOT_A_PHOTO.test(t))
    .slice(0, 6)
  if (!files.length) return null
  const infos = await commonsInfo(files)
  for (const f of files) {
    const info = infos.get(fileKey(f))
    if (info) return info
  }
  return null
}

const IMAGE_FILE = /\.(jpe?g|png|webp)$/i
const PODIUM = /podium|troph|winner|victory|celebrat|champagne|sieger|vainqueur|\bwins\b|\bwon\b/i
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Photo d'un pilote prise lors d'une épreuve précise (catégorie Commons « 2011 Monaco
 * Grand Prix ») : recherche de son nom dans la catégorie, en privilégiant les fichiers
 * nommés d'après lui, puis les podiums et trophées. `used` évite de réutiliser un fichier.
 * Renvoie { key, info } ou null.
 */
async function commonsSearch(search, limit = 20) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srlimit=${limit}&srsearch=${encodeURIComponent(search)}`
  const data = await getJSON(url, { minInterval: 200 })
  return (data.query?.search ?? []).map((r) => r.title).filter((t) => IMAGE_FILE.test(t) && !NOT_A_PHOTO.test(t))
}

// Pilotes par nom de famille : un homonyme engagé la même saison (Graham et Phil Hill,
// Michael et Ralf Schumacher) impose le prénom dans le titre du fichier
const byFamily = new Map()
for (const d of drivers) byFamily.set(fold(d.familyName), [...(byFamily.get(fold(d.familyName)) ?? []), d.driverId])
const hasNamesake = (driver, year) =>
  byFamily.get(fold(driver.familyName)).some((id) => id !== driver.driverId && driverSeasons.get(id)?.seasons.has(Number(year)))

const words = (s) => ` ${fold(s).replace(/[^a-z0-9]+/g, ' ').trim()} `
const F1_HINT = /\bgp\b|grand.prix|formula|\bf1\b|testing|tests/i

/** Le titre du fichier nomme-t-il ce pilote sans ambiguïté ? */
function namesDriver(title, driver, year) {
  const t = fold(title)
  if (!t.includes(fold(driver.familyName))) return false
  return !hasNamesake(driver, year) || t.includes(fold(driver.givenName))
}

/**
 * `podium` : un podium ou un trophée sans le nom du pilote dans le titre est accepté
 * (Grands Prix : le vainqueur y figure forcément).
 */
async function eventPhoto(category, driver, { used = new Set(), podium = false } = {}) {
  const titles = await commonsSearch(`incategory:"${category.replace(/ /g, '_')}" ${driver.familyName}`)
  const year = parseInt(category)
  const score = (title) => (namesDriver(title, driver, year) ? 2 : 0) + (PODIUM.test(title) ? 1 : 0)
  const files = titles
    .map((title, i) => ({ title, i, score: score(title) }))
    .filter((f) => !used.has(fileKey(f.title)) && (f.score >= 2 || (podium && f.score === 1)))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, 6)
  if (!files.length) return null
  const infos = await commonsInfo(files.map((f) => f.title))
  for (const f of files) {
    const info = infos.get(fileKey(f.title))
    if (info) return { key: fileKey(f.title), info }
  }
  return null
}

/**
 * Photos libres d'un pilote prises pendant une saison : le titre du fichier doit le
 * nommer et contenir l'année. Liste de { key, info } (mise en cache par pilote et saison).
 */
const seasonCache = new Map()
async function seasonPhotos(driver, year) {
  const id = `${driver.driverId}-${year}`
  if (seasonCache.has(id)) return seasonCache.get(id)
  // Hors catégorie d'épreuve : nom complet, ou nom de famille et contexte F1 (pas
  // « Place du Général-Leclerc ») ; pas de podium ni de trophée d'un autre Grand Prix
  const full = words(`${driver.givenName} ${driver.familyName}`)
  const titles = (await commonsSearch(`${driver.givenName} ${driver.familyName} ${year}`, 40))
    .filter((t) => namesDriver(t, driver, year) && t.includes(String(year)) && !PODIUM.test(t))
    .filter((t) => words(t).includes(full) || F1_HINT.test(t))
    .slice(0, 12)
  const infos = await commonsInfo(titles)
  const list = titles.map((t) => ({ key: fileKey(t), info: infos.get(fileKey(t)) })).filter((f) => f.info)
  seasonCache.set(id, list)
  return list
}

/**
 * Titre d'article Wikipédia → { url, author, license, source }, licences libres uniquement.
 * 1. image principale de l'article ; 2. image Wikidata (P18) ; 3. image principale des
 * Wikipédias de, fr, it ; 4. catégorie Commons (P373).
 */
async function resolvePhotos(titles) {
  const unique = [...new Set(titles.filter(Boolean))]
  const pages = await wikipediaPages(unique)
  const result = new Map()

  // 1. Image principale de l'article (souvent non libre pour les anciens pilotes)
  const main = await commonsInfo([...pages.values()].map((p) => p.image))
  for (const title of unique) {
    const file = pages.get(title)?.image
    const info = file && main.get(fileKey(file))
    if (info) result.set(title, info)
  }

  // 2. Image Wikidata (P18) : hébergée sur Commons, donc libre
  let missing = unique.filter((t) => !result.has(t))
  const claims = await wikidataClaims(missing.map((t) => pages.get(t)?.qid))
  const wdInfo = await commonsInfo([...claims.values()].map((c) => c.image))
  for (const title of missing) {
    const file = claims.get(pages.get(title)?.qid)?.image
    const info = file && wdInfo.get(fileKey(file))
    if (info) result.set(title, info)
  }

  // 3. Image principale des Wikipédias allemande, française et italienne : de et fr
  //    n'acceptent aucune image non libre, et couvrent presque tous les pilotes
  for (const wiki of ['de', 'fr', 'it']) {
    missing = unique.filter((t) => !result.has(t))
    const localTitles = new Map() // titre local → titre anglais
    for (const title of missing) {
      const local = claims.get(pages.get(title)?.qid)?.sitelinks?.[`${wiki}wiki`]
      if (local) localTitles.set(local, title)
    }
    const images = await pageImages(wiki, [...localTitles.keys()])
    const infos = await commonsInfo([...images.values()])
    for (const [local, file] of images) {
      const info = infos.get(fileKey(file))
      if (info && localTitles.has(local)) result.set(localTitles.get(local), info)
    }
  }

  // 4. Première photo de la catégorie Commons du sujet
  missing = unique.filter((t) => !result.has(t))
  for (const [i, title] of missing.entries()) {
    const category = claims.get(pages.get(title)?.qid)?.category
    if (!category) continue
    const info = await categoryPhoto(category)
    if (info) result.set(title, info)
    if (i % 25 === 0) process.stdout.write(`\r  catégories Commons : ${i}/${missing.length}`)
  }
  console.log()
  return result
}

// ---------------------------------------------------------------------------
// Construction des cartes
// ---------------------------------------------------------------------------
const flag = (code) => code ?? null
const span = (set) => (set?.size ? [Math.min(...set), Math.max(...set)] : null)
const mainTeam = (teams) => [...(teams ?? new Map())].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

const cards = []

for (const d of drivers) {
  const s = driverSeasons.get(d.driverId)
  if (!s) continue // pilotes jamais classés (non-qualifiés, réservistes)
  const team = mainTeam(s.teams)
  cards.push({
    id: `d-${d.driverId}`,
    type: 'driver',
    rarity: driverRarity(d.driverId),
    name: `${d.givenName} ${d.familyName}`,
    sub: d.nationality,
    years: span(s.seasons),
    flag: flag(NATIONALITY_CODES[d.nationality]),
    color: getTeamColor(team),
    teamId: team,
    number: d.permanentNumber ? parseInt(d.permanentNumber) : null,
    stats: { titles: s.titles.length, wins: driverWins.get(d.driverId) ?? 0, podiums: driverPodiums.get(d.driverId) ?? 0, seasons: s.seasons.size },
    wiki: titleFromUrl(d.url),
  })
}

for (const c of constructors) {
  const s = teamSeasons.get(c.constructorId)
  if (!s) continue
  cards.push({
    id: `t-${c.constructorId}`,
    type: 'team',
    rarity: teamRarity(c.constructorId),
    name: c.name,
    sub: c.nationality,
    years: span(s.seasons),
    flag: flag(NATIONALITY_CODES[c.nationality]),
    color: getTeamColor(c.constructorId),
    stats: { titles: s.titles.length, wins: teamWins.get(c.constructorId) ?? 0, podiums: teamPodiums.get(c.constructorId) ?? 0, seasons: s.seasons.size },
    wiki: titleFromUrl(c.url),
  })
}

/** Mots désignant le lieu d'une course : pays, ville, nom de l'épreuve (« monaco », « austria »…) */
const PLACE_STOP = new Set(['grand', 'prix', 'gp', 'city', 'de', 'di', 'the', 'of', 'united', 'states', 'new', 'park', 'circuit'])
const racePlaces = (race) =>
  [...new Set(
    [race.Circuit.Location.country, race.Circuit.Location.locality, race.raceName.replace(/ Grand Prix$/, '')]
      .flatMap((s) => words(s ?? '').trim().split(' '))
      .filter((w) => w.length > 3 && !PLACE_STOP.has(w)),
  )]

// Grands Prix disputés (un vainqueur connu)
const lastRoundOf = new Map()
for (const race of racesByPos[1]) lastRoundOf.set(race.season, Math.max(lastRoundOf.get(race.season) ?? 0, parseInt(race.round)))
for (const race of racesByPos[1]) {
  const key = `${race.season} ${race.raceName}`
  const winner = race.Results[0]
  const isFinale = parseInt(race.round) === lastRoundOf.get(race.season) && parseInt(race.season) <= LAST_COMPLETE
  cards.push({
    id: `g-${race.season}-${race.round}`,
    type: 'gp',
    rarity: iconicRarity.get(key) ?? (isFinale ? 'rare' : 'common'),
    name: gpNameFr(race.raceName),
    sub: race.Circuit.circuitName,
    years: [parseInt(race.season), parseInt(race.season)],
    flag: flag(COUNTRY_CODES[race.Circuit.Location.country]),
    color: getTeamColor(winner.Constructor.constructorId),
    circuitId: race.Circuit.circuitId,
    stats: { round: parseInt(race.round), winner: `${winner.Driver.givenName} ${winner.Driver.familyName}`, team: winner.Constructor.name },
    winnerDriver: winner.Driver,
    places: racePlaces(race),
    wiki: titleFromUrl(race.url),
  })
  iconicRarity.delete(key)
}
if (iconicRarity.size) console.warn('GP iconiques introuvables :', [...iconicRarity.keys()])

// Moments historiques
const moments = JSON.parse(readFileSync(`${ROOT}scripts/catalog/moments.json`, 'utf8'))
const driverById = new Map(drivers.map((d) => [d.driverId, d]))
for (const m of moments) {
  const missing = m.drivers.filter((id) => !driverById.has(id))
  if (missing.length) console.warn(`Moment ${m.id} : pilotes inconnus`, missing)
  const lead = driverSeasons.get(m.drivers[0])
  cards.push({
    id: `m-${m.id}`,
    type: 'moment',
    rarity: m.rarity,
    name: m.title,
    sub: m.drivers.map((id) => driverById.get(id)?.familyName ?? id).join(' · '),
    years: [m.year, m.year],
    color: getTeamColor(mainTeam(lead?.teams)),
    driverIds: m.drivers,
    text: m.text,
    quote: m.quote ?? null,
    events: m.events ?? [],
    // Photo Commons choisie à la main (scripts/catalog/moments.json), sinon recherche automatique
    photoFile: m.photo ?? null,
    wiki: m.wiki,
  })
}

console.log('Photos Wikimedia Commons…')
// Pilotes et écuries : photo de l'article
const photos = await resolvePhotos(cards.filter((c) => c.type === 'driver' || c.type === 'team').map((c) => c.wiki))
for (const card of cards) {
  if (card.type === 'driver' || card.type === 'team') card.photo = photos.get(card.wiki) ?? null
}

// Pilotes engagés chaque saison (noms de famille) : une photo qui en nomme un autre que le
// vainqueur montre un autre pilote, hors sujet pour la carte du Grand Prix
const familiesBySeason = new Map()
for (const d of drivers) {
  for (const year of driverSeasons.get(d.driverId)?.seasons ?? []) {
    if (!familiesBySeason.has(year)) familiesBySeason.set(year, new Map())
    familiesBySeason.get(year).set(fold(d.familyName), d.driverId)
  }
}

/** Le titre nomme-t-il un pilote de la saison autre que `driver` ? */
function namesOtherDriver(title, driver, year) {
  const w = words(title.replace(/([a-z])([A-Z])/g, '$1 $2'))
  for (const [family, id] of familiesBySeason.get(year) ?? []) {
    if (id !== driver.driverId && family.length > 2 && w.includes(` ${family} `)) return true
  }
  return false
}

/**
 * Photos JPEG d'une catégorie Commons et de ses sous-catégories directes (voitures,
 * séances…) ; les PNG sont souvent des tableaux ou des schémas
 */
async function categoryFiles(category) {
  const list = async (cat, type) => {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=categorymembers&cmtype=${type}&cmlimit=200&cmtitle=${encodeURIComponent(cat)}`
    return ((await getJSON(url, { minInterval: 200 })).query?.categorymembers ?? []).map((m) => m.title)
  }
  const root = `Category:${category}`
  const subcats = (await list(root, 'subcat')).slice(0, 8)
  const files = [...(await list(root, 'file'))]
  for (const sub of subcats) files.push(...(await list(sub, 'file')))
  return files.filter((t) => /\.jpe?g$/i.test(t) && !NOT_A_PHOTO.test(t))
}

/** Lieux des autres Grands Prix d'une saison (pour écarter leurs photos) */
const placesBySeason = new Map()
function otherPlaces(card) {
  const year = card.years[0]
  if (!placesBySeason.has(year)) {
    placesBySeason.set(year, cards.filter((c) => c.type === 'gp' && c.years[0] === year))
  }
  const mine = new Set(card.places)
  return new Set(placesBySeason.get(year).flatMap((c) => c.places).filter((w) => !mine.has(w)))
}

/** Le titre cite-t-il le lieu d'un autre Grand Prix de la saison ? */
const namesOtherRace = (title, others) => {
  const w = words(title.replace(/([a-z])([A-Z])/g, '$1 $2'))
  return [...others].some((place) => w.includes(` ${place} `))
}

/** Une photo peut servir à 2 cartes au plus */
const MAX_PHOTO_USES = 2
const photoUses = new Map()
const usable = (key) => (photoUses.get(key) ?? 0) < MAX_PHOTO_USES
const usePhoto = (key) => photoUses.set(key, (photoUses.get(key) ?? 0) + 1)

/**
 * Photo d'un Grand Prix dans sa catégorie Commons (« 2023 Monaco Grand Prix »), de la plus
 * à la moins pertinente : le vainqueur nommé, le podium ou le trophée, son écurie, une photo
 * de la course sans autre pilote nommé, puis un autre pilote pendant cette course.
 */
async function racePhoto(category, driver, team, others = new Set()) {
  const year = parseInt(category)
  const [named, members] = await Promise.all([
    commonsSearch(`incategory:"${category.replace(/ /g, '_')}" ${driver.familyName}`),
    categoryFiles(category),
  ])
  const teamWords = team ? words(team) : null
  const score = (title) => {
    const podium = PODIUM.test(title)
    if (namesDriver(title, driver, year)) return podium ? 6 : 5
    if (namesOtherRace(title, others)) return 0
    if (podium) return 4
    if (teamWords && words(title).includes(teamWords)) return 3
    if (namesOtherDriver(title, driver, year)) return 1
    return 2
  }
  const files = [...new Set([...named, ...members])]
    .map((title, i) => ({ title, i, score: score(title) }))
    .filter((f) => f.score > 0 && usable(fileKey(f.title)))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, 8)
  if (!files.length) return null
  const infos = await commonsInfo(files.map((f) => f.title))
  for (const f of files) {
    const info = infos.get(fileKey(f.title))
    if (info) return { key: fileKey(f.title), info, score: f.score }
  }
  return null
}


// Grands Prix : une photo de la course elle-même (voir racePhoto), sinon le vainqueur
// pendant la saison ; chaque photo sert à 2 cartes au plus (sinon le tracé du circuit)
const gpCards = cards.filter((c) => c.type === 'gp')
// Les portraits des cartes Pilote et Écurie ne sont pas repris sur les Grands Prix
for (const card of cards) {
  if ((card.type === 'driver' || card.type === 'team') && card.photo) {
    photoUses.set(fileKey(decodeURIComponent(card.photo.source.split('File:')[1] ?? '')), MAX_PHOTO_USES)
  }
}
const gpSource = { winner: 0, podium: 0, team: 0, race: 0, otherDriver: 0, season: 0, none: 0 }
const RACE_SOURCE = { 6: 'podium', 5: 'winner', 4: 'podium', 3: 'team', 2: 'race', 1: 'otherDriver' }
for (const [i, card] of gpCards.entries()) {
  const others = otherPlaces(card)
  let found = card.wiki && (await racePhoto(card.wiki, card.winnerDriver, card.stats.team, others))
  if (found) gpSource[RACE_SOURCE[found.score]]++
  else {
    found = (await seasonPhotos(card.winnerDriver, card.years[0])).find((f) => usable(f.key) && !namesOtherRace(f.key, others)) ?? null
    gpSource[found ? 'season' : 'none']++
  }
  if (found) usePhoto(found.key)
  card.photo = found?.info ?? null
  if (i % 25 === 0) process.stdout.write(`\r  Grands Prix : ${i}/${gpCards.length}`)
}
console.log('\n  Grands Prix :', gpSource)

// Moments : la photo choisie à la main, sinon prise lors de l'épreuve d'un des pilotes
// concernés, sinon de la saison, sans doublon
const usedMoments = new Set()
const momentCards = cards.filter((c) => c.type === 'moment')
const picked = await commonsInfo(momentCards.map((c) => c.photoFile))
for (const card of momentCards.filter((c) => c.photoFile)) {
  const key = fileKey(card.photoFile)
  card.photo = picked.get(key) ?? null
  if (card.photo) usedMoments.add(key)
  else console.warn(`  Moment ${card.id} : photo choisie introuvable ou non libre (${card.photoFile})`)
}
for (const card of momentCards.filter((c) => !c.photo)) {
  const people = card.driverIds.map((id) => driverById.get(id))
  let found = null
  for (const event of card.events) {
    for (const driver of people) {
      found ??= await eventPhoto(event, driver, { used: usedMoments })
    }
  }
  for (const driver of people) {
    if (!found) {
      const list = await seasonPhotos(driver, card.years[0])
      found = list.find((f) => !usedMoments.has(f.key)) ?? null
    }
  }
  if (found) usedMoments.add(found.key)
  else console.warn(`  Moment ${card.id} : aucune photo de l'épreuve ni de la saison`)
  card.photo = found?.info ?? null
}

for (const card of cards) {
  delete card.wiki
  delete card.events
  delete card.winnerDriver
  delete card.places
  delete card.photoFile
}

// Chefs-d'œuvre : les Moments repeints (scripts/catalog/masterpieces.mjs)
cards.push(...masterpieceCards(ROOT, cards))
// Affiches d'époque : une par Grand Prix (scripts/catalog/posters.mjs)
cards.push(...posterCards(ROOT))

// Numérotation : moments, pilotes, écuries, Grands Prix, chacun par ordre chronologique,
// puis les séries ajoutées après coup (Chefs-d'œuvre, Affiches) : les numéros existants ne bougent pas
const TYPE_ORDER = { moment: 0, driver: 1, team: 2, gp: 3, masterpiece: 4, poster: 5 }
cards.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || (a.years?.[0] ?? 0) - (b.years?.[0] ?? 0) || a.id.localeCompare(b.id))
cards.forEach((c, i) => (c.n = i + 1))

// ---------------------------------------------------------------------------
// Albums (classeur façon Panini) : une carte peut figurer dans plusieurs albums.
// La récompense (Pièces) est versée par le serveur une fois l'album complet.
// ---------------------------------------------------------------------------
const gridSeason = Math.max(...cards.filter((c) => c.type === 'driver').map((c) => c.years[1]))
const isDriver = (c) => c.type === 'driver'
const isTeam = (c) => c.type === 'team'
const isGp = (c) => c.type === 'gp'
const decade = (from) => (c) => isGp(c) && c.years[0] >= from && c.years[0] < from + 10
const atCircuit = (id) => (c) => isGp(c) && c.circuitId === id

const ALBUMS = [
  { id: 'champions', section: 'Les pilotes', title: 'Champions du monde', subtitle: 'Tous les pilotes sacrés', reward: 500, filter: (c) => isDriver(c) && c.stats.titles > 0 },
  { id: 'vainqueurs', section: 'Les pilotes', title: 'Vainqueurs de Grand Prix', subtitle: 'Victorieux, sans couronne mondiale', reward: 400, filter: (c) => isDriver(c) && c.stats.wins > 0 && !c.stats.titles },
  { id: 'podiums', section: 'Les pilotes', title: 'Sur le podium', subtitle: 'Montés sur la boîte, sans victoire', reward: 300, filter: (c) => isDriver(c) && c.stats.podiums > 0 && !c.stats.wins },
  { id: 'francais', section: 'Les pilotes', title: 'Les Français', subtitle: 'Tous les pilotes français', reward: 300, filter: (c) => isDriver(c) && c.sub === 'French' },
  { id: 'ecuries-championnes', section: 'Les écuries', title: 'Écuries championnes', subtitle: 'Titrées chez les constructeurs', reward: 400, filter: (c) => isTeam(c) && c.stats.titles > 0 },
  { id: 'ecuries-victorieuses', section: 'Les écuries', title: 'Écuries victorieuses', subtitle: 'Gagnantes, sans titre constructeurs', reward: 300, filter: (c) => isTeam(c) && c.stats.wins > 0 && !c.stats.titles },
  { id: `grille-${gridSeason}`, section: `Saison ${gridSeason}`, title: `La grille ${gridSeason}`, subtitle: 'Pilotes et écuries de la saison', reward: 250, filter: (c) => (isDriver(c) || isTeam(c)) && c.years[1] >= gridSeason },
  ...[
    [1950, 300], [1960, 300], [1970, 400], [1980, 400], [1990, 400], [2000, 500], [2010, 600], [2020, 400],
  ].map(([from, reward]) => ({
    id: `gp-${from}`, section: 'Grands Prix', title: `Les années ${String(from).slice(from >= 2000 ? 0 : 2)}`, subtitle: `Grands Prix ${from}–${from + 9}`, reward, filter: decade(from),
  })),
  { id: 'monaco', section: 'Les temples', title: 'Monaco', subtitle: 'Toutes les éditions du GP de Monaco', reward: 400, filter: atCircuit('monaco') },
  { id: 'monza', section: 'Les temples', title: 'Monza', subtitle: 'Le temple de la vitesse', reward: 400, filter: atCircuit('monza') },
  { id: 'silverstone', section: 'Les temples', title: 'Silverstone', subtitle: 'Le berceau du championnat', reward: 400, filter: atCircuit('silverstone') },
  { id: 'spa', section: 'Les temples', title: 'Spa-Francorchamps', subtitle: "L'Eau Rouge et le Raidillon", reward: 400, filter: atCircuit('spa') },
  { id: 'courses-mythiques', section: 'Les temples', title: 'Courses mythiques', subtitle: 'GP historiques et finales de saison', reward: 600, filter: (c) => isGp(c) && c.rarity !== 'common' },
  { id: 'moments', section: 'Légendes', title: 'Moments de légende', subtitle: "Les instants qui ont fait l'histoire", reward: 800, filter: (c) => c.type === 'moment' },
  { ...MASTERPIECE_ALBUM, filter: (c) => c.type === 'masterpiece' },
]

const RARITY_ORDER = { mythic: 0, legendary: 1, epic: 2, rare: 3, common: 4 }
const albums = ALBUMS.map(({ filter, ...album }) => {
  const members = cards.filter(filter)
  // Couverture : la carte la plus rare et la plus titrée qui a une photo (Hamilton, Ferrari…)
  const prestige = (c) => (c.stats?.titles ?? 0) * 100 + (c.stats?.wins ?? 0)
  const cover = [...members]
    .filter((c) => c.photo)
    .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || prestige(b) - prestige(a) || b.years[0] - a.years[0])[0]
  return { ...album, cover: cover?.id ?? null, cards: members.map((c) => c.id) }
})
console.log('Albums :', albums.map((a) => `${a.id} (${a.cards.length})`).join(', '))

// ---------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------
const catalog = { version: 1, generatedAt: new Date().toISOString().slice(0, 10), cards, albums }
writeFileSync(`${ROOT}src/data/catalog.json`, JSON.stringify(catalog))

writeSeed(ROOT, cards, albums)

const stat = (key) => cards.reduce((acc, c) => ((acc[c[key]] = (acc[c[key]] ?? 0) + 1), acc), {})
console.log(`${cards.length} cartes`, stat('type'), stat('rarity'))
console.log(`Photos : ${cards.filter((c) => c.photo).length} / ${cards.length}`, Object.fromEntries(Object.keys(TYPE_ORDER).map((t) => [t, `${cards.filter((c) => c.type === t && c.photo).length}/${cards.filter((c) => c.type === t).length}`])))
