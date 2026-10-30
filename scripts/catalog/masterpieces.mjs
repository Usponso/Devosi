/**
 * Série « Chefs-d'œuvre » : un Moment de légende repeint à l'huile, encadré comme un
 * tableau. Chaque carte reprend le titre, les pilotes, l'année et la rareté de son Moment ;
 * la peinture est dans public/cards/chefs-d-oeuvre/<id du moment>.jpg.
 *
 * La liste (ordre chronologique = numéro dans la série) est dans
 * scripts/catalog/masterpieces.json. Appelé par scripts/build-catalog.mjs ; peut aussi
 * être lancé seul pour ajouter ou mettre à jour la série sans tout retélécharger :
 *   node scripts/catalog/masterpieces.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { writeSeed } from './seed.mjs'

export const MASTERPIECE_ALBUM = {
  id: 'chefs-d-oeuvre',
  section: 'Légendes',
  title: "Chefs-d'œuvre",
  subtitle: 'La galerie peinte des moments de légende',
  reward: 1000,
}

/** Cartes de la série, construites à partir des cartes Moment du catalogue */
export function masterpieceCards(root, cards) {
  const ids = JSON.parse(readFileSync(`${root}scripts/catalog/masterpieces.json`, 'utf8'))
  return ids.map((momentId, i) => {
    const m = cards.find((c) => c.id === `m-${momentId}`)
    if (!m) throw new Error(`Chef-d'œuvre : moment inconnu ${momentId}`)
    return {
      id: `cd-${momentId}`,
      type: 'masterpiece',
      rarity: m.rarity,
      name: m.name,
      sub: m.sub,
      years: m.years,
      color: m.color,
      driverIds: m.driverIds,
      text: m.text,
      quote: null,
      photo: { url: `/cards/chefs-d-oeuvre/${momentId}.jpg` },
      series: { index: i + 1, total: ids.length },
      momentId: m.id,
    }
  })
}

// Lancement direct : remplace la série dans le catalogue existant, après les autres cartes
// (les numéros des cartes déjà en circulation ne bougent pas), puis régénère le seed
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = fileURLToPath(new URL('../..', import.meta.url))
  const path = `${root}src/data/catalog.json`
  const catalog = JSON.parse(readFileSync(path, 'utf8'))
  const others = catalog.cards.filter((c) => c.type !== 'masterpiece')
  const series = masterpieceCards(root, others)
  const last = Math.max(...others.map((c) => c.n))
  series.forEach((c, i) => (c.n = last + i + 1))
  catalog.cards = [...others, ...series]

  const RARITY_ORDER = { mythic: 0, legendary: 1, epic: 2, rare: 3, common: 4 }
  const cover = [...series].sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || b.years[0] - a.years[0])[0]
  catalog.albums = [
    ...catalog.albums.filter((a) => a.id !== MASTERPIECE_ALBUM.id),
    { ...MASTERPIECE_ALBUM, cover: cover.id, cards: series.map((c) => c.id) },
  ]
  writeFileSync(path, JSON.stringify(catalog))
  writeSeed(root, catalog.cards, catalog.albums)
  console.log(`${series.length} Chefs-d'œuvre (#${last + 1} à #${last + series.length}), album ${MASTERPIECE_ALBUM.id}`)
}
