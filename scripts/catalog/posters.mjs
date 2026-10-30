/**
 * Série « Affiches d'époque » : une affiche Art déco par Grand Prix, qui ne se trouve que
 * dans le pack GP de son week-end (tirage côté serveur, migration 20261117000001_posters).
 * L'id « a-<saison>-<manche> » relie la carte au week-end ; l'image est dans
 * public/cards/affiches/<saison>-<manche>.jpg et le titre est écrit par l'app dans la marge.
 *
 * La liste est dans scripts/catalog/posters.json. Appelé par scripts/build-catalog.mjs ;
 * peut aussi être lancé seul pour ajouter l'affiche d'un nouveau GP sans tout retélécharger :
 *   node scripts/catalog/posters.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { writeSeed } from './seed.mjs'

/** Cartes de la série, triées par saison puis par manche */
export function posterCards(root) {
  const posters = JSON.parse(readFileSync(`${root}scripts/catalog/posters.json`, 'utf8'))
  return posters
    .sort((a, b) => a.season - b.season || a.round - b.round)
    .map((p) => ({
      id: `a-${p.season}-${p.round}`,
      type: 'poster',
      rarity: p.rarity,
      name: `${p.kicker} ${p.title}`,
      sub: p.place,
      years: [p.season, p.season],
      color: p.color,
      text: `Affiche d'époque de la manche ${p.round} de la saison ${p.season}, à ${p.place} : à trouver dans le pack GP de son week-end, puis seulement par échange.`,
      quote: null,
      photo: { url: `/cards/affiches/${p.season}-${p.round}.jpg` },
      poster: { kicker: p.kicker, title: p.title, date: p.date, round: p.round },
    }))
}

// Lancement direct : remplace la série dans le catalogue existant, après les autres cartes
// (les numéros des cartes déjà en circulation ne bougent pas), puis régénère le seed
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = fileURLToPath(new URL('../..', import.meta.url))
  const path = `${root}src/data/catalog.json`
  const catalog = JSON.parse(readFileSync(path, 'utf8'))
  const known = new Map(catalog.cards.filter((c) => c.type === 'poster').map((c) => [c.id, c.n]))
  const others = catalog.cards.filter((c) => c.type !== 'poster')
  let last = Math.max(...catalog.cards.map((c) => c.n))
  const series = posterCards(root)
  for (const c of series) c.n = known.get(c.id) ?? ++last
  catalog.cards = [...others, ...series].sort((a, b) => a.n - b.n)
  writeFileSync(path, JSON.stringify(catalog))
  writeSeed(root, catalog.cards, catalog.albums)
  console.log(`${series.length} affiche(s) : ${series.map((c) => `${c.id} #${c.n}`).join(', ')}`)
}
