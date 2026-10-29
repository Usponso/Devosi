/**
 * Écrit supabase/seed.sql à partir du catalogue : la table `cards` (id, type, rareté,
 * écurie, année) utilisée pour tirer les packs et suivre les quêtes, les cartes liées à
 * chaque circuit (pack du week-end de course) et les albums.
 *
 * Appelé par scripts/build-catalog.mjs. Peut aussi être lancé seul pour régénérer le
 * seed depuis src/data/catalog.json, sans rien retélécharger :
 *   node scripts/catalog/seed.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const esc = (s) => s.replace(/'/g, "''")
const sqlText = (s) => (s ? `'${esc(s)}'` : 'null')

/**
 * Écurie associée à une carte (identifiant Jolpica) : celle du pilote, l'écurie elle-même,
 * ou celle du vainqueur pour un Grand Prix (retrouvée par son nom). Rien pour les moments.
 */
function teamResolver(cards) {
  const byName = new Map(cards.filter((c) => c.type === 'team').map((c) => [c.name, c.id.slice(2)]))
  return (card) => {
    if (card.type === 'driver') return card.teamId ?? null
    if (card.type === 'team') return card.id.slice(2)
    if (card.type === 'gp') return byName.get(card.stats?.team) ?? null
    return null
  }
}

/**
 * Cartes liées à chaque circuit : les GP qui s'y sont disputés, et les pilotes et
 * écuries qui y ont gagné. Renvoie des paires [card_id, circuit_id] uniques.
 */
function circuitLinks(cards) {
  const driverByName = new Map()
  for (const c of cards) if (c.type === 'driver' && !driverByName.has(c.name)) driverByName.set(c.name, c.id)
  const teamByName = new Map(cards.filter((c) => c.type === 'team').map((c) => [c.name, c.id]))
  const links = new Set()
  for (const c of cards) {
    if (c.type !== 'gp' || !c.circuitId) continue
    for (const id of [c.id, driverByName.get(c.stats?.winner), teamByName.get(c.stats?.team)]) {
      if (id) links.add(`${id}|${c.circuitId}`)
    }
  }
  return [...links].map((l) => l.split('|'))
}

export function writeSeed(root, cards, albums) {
  const teamOf = teamResolver(cards)
  const values = cards
    .map((c) => `('${esc(c.id)}','${c.type}','${c.rarity}',${sqlText(teamOf(c))},${c.years?.[0] ?? 'null'})`)
    .join(',\n')

  mkdirSync(`${root}supabase`, { recursive: true })
  writeFileSync(
    `${root}supabase/seed.sql`,
    `-- Généré par scripts/build-catalog.mjs — ne pas modifier à la main\n` +
      `insert into public.cards (id, type, rarity, team, year) values\n${values}\n` +
      `on conflict (id) do update set type = excluded.type, rarity = excluded.rarity, team = excluded.team, year = excluded.year;\n\n` +
      `insert into public.albums (id, reward) values\n${albums.map((a) => `('${a.id}',${a.reward})`).join(',\n')}\n` +
      `on conflict (id) do update set reward = excluded.reward;\n` +
      `delete from public.albums where id not in (${albums.map((a) => `'${a.id}'`).join(',')});\n` +
      `delete from public.card_circuits;\n` +
      `insert into public.card_circuits (card_id, circuit_id) values\n` +
      circuitLinks(cards).map(([id, circuit]) => `('${esc(id)}','${esc(circuit)}')`).join(',\n') +
      `;\n\n` +
      `delete from public.album_cards;\n` +
      `insert into public.album_cards (album_id, card_id) values\n` +
      albums.flatMap((a) => a.cards.map((id) => `('${a.id}','${esc(id)}')`)).join(',\n') +
      `;\n`,
  )
}

// Lancement direct : régénère le seed depuis le catalogue existant
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = fileURLToPath(new URL('../..', import.meta.url))
  const catalog = JSON.parse(readFileSync(`${root}src/data/catalog.json`, 'utf8'))
  writeSeed(root, catalog.cards, catalog.albums)
  console.log(`seed.sql : ${catalog.cards.length} cartes, ${catalog.albums.length} albums`)
}
