/**
 * Séries illustrées ajoutées après coup, chacune avec son album :
 *  - « Vitraux » : 12 vitraux de cathédrale numérotés. Chaque exemplaire porte un numéro
 *    unique (tirage limité à `printRun` exemplaires, distribués dans les packs côté serveur,
 *    migration 20261121000001_numbered_series) ; image dans public/cards/vitraux/<slug>.jpg.
 *  - « Le jeu des pilotes » : un jeu de cartes à jouer façon XIXe siècle, une époque par
 *    couleur (As = circuit, Roi, Dame, Valet). Tirage normal des packs selon la rareté ;
 *    image dans public/cards/jeu/<slug>.jpg.
 * Les images contiennent déjà leur cadre et leur titre : l'app les affiche en pleine carte.
 *
 * Appelé par scripts/build-catalog.mjs ; peut aussi être lancé seul (les numéros des cartes
 * déjà en circulation ne bougent pas) :
 *   node scripts/catalog/series.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { writeSeed } from './seed.mjs'

const GLASS_COLOR = '#c8962c'

/** [slug, nom, sous-titre, années, rareté, tirage, pilotes, texte] — ordre chronologique */
const VITRAUX = [
  ['fangio', 'Juan Manuel Fangio', 'Champion du monde', [1950, 1958], 'legendary', 25, ['fangio'], "Cinq titres de champion du monde dans les années 50, avec quatre constructeurs différents : le Maestro argentin, entré au vitrail."],
  ['lauda', 'Niki Lauda', 'Champion du monde', [1971, 1985], 'legendary', 25, ['lauda'], "Trois titres de champion du monde, et un retour en course six semaines seulement après son accident du Nürburgring en 1976."],
  ['prost', 'Alain Prost', 'Champion du monde', [1980, 1993], 'legendary', 25, ['prost'], "Le Professeur : quatre titres de champion du monde et 51 victoires, record de son époque."],
  ['mp4', 'McLaren MP4/4', 'Monoplace de légende', [1988, 1988], 'legendary', 25, ['senna', 'prost'], "La monoplace de 1988 : 15 victoires en 16 Grands Prix, aux mains d'Ayrton Senna et d'Alain Prost."],
  ['senna', 'Ayrton Senna', 'Champion du monde', [1984, 1994], 'legendary', 25, ['senna'], "Trois titres, 65 pole positions et six victoires à Monaco : le génie brésilien, en lumière de cathédrale."],
  ['schumacher', 'Michael Schumacher', 'Champion du monde', [1991, 2012], 'legendary', 25, ['michael_schumacher'], "Sept titres de champion du monde et 91 victoires, dont cinq couronnes d'affilée avec la Scuderia."],
  ['f2004', 'Ferrari F2004', 'Monoplace de légende', [2004, 2004], 'legendary', 25, ['michael_schumacher'], "La Ferrari de 2004 : 15 victoires en 18 courses et le septième titre de Michael Schumacher."],
  ['alonso', 'Fernando Alonso', 'Champion du monde', [2001, 2026], 'legendary', 25, ['alonso'], "Champion du monde en 2005 et 2006, le plus jeune de son temps, et toujours en piste vingt ans plus tard."],
  ['hamilton', 'Lewis Hamilton', 'Champion du monde', [2007, 2026], 'legendary', 25, ['hamilton'], "Sept titres de champion du monde et les records absolus de victoires et de pole positions."],
  ['vettel', 'Sebastian Vettel', 'Champion du monde', [2007, 2022], 'legendary', 25, ['vettel'], "Quatre titres d'affilée de 2010 à 2013, et le plus jeune champion du monde de l'histoire."],
  ['verstappen', 'Max Verstappen', 'Champion du monde', [2015, 2026], 'legendary', 25, ['max_verstappen'], "Quatre titres consécutifs de 2021 à 2024, dont une saison 2023 à 19 victoires."],
  ['rosace', 'Les champions du monde', 'Grande rosace', [1950, 2026], 'mythic', 5, [], "La grande rosace réunit les champions du monde de la Formule 1 : la pièce maîtresse de la série, tirée à cinq exemplaires seulement."],
]

const SUITS = {
  trefle: { label: 'Trèfle', red: false },
  carreau: { label: 'Carreau', red: true },
  coeur: { label: 'Cœur', red: true },
  pique: { label: 'Pique', red: false },
}

/** [slug, nom, couleur, rang, années, rareté, pilotes, texte] — par couleur : As, Roi, Dame, Valet */
const JEU = [
  ['monza', 'Monza', 'trefle', 'As', [1950, 1969], 'legendary', [], "L'As de Trèfle des années 50-60 : Monza et son anneau de vitesse aux virages relevés, au cœur du parc royal."],
  ['brabham', 'Jack Brabham', 'trefle', 'Roi', [1955, 1970], 'epic', ['jack_brabham'], "Triple champion du monde, et le seul sacré au volant d'une voiture portant son propre nom, en 1966."],
  ['de-filippis', 'Maria Teresa de Filippis', 'trefle', 'Dame', [1958, 1959], 'epic', ['filippis'], "Première femme à prendre le départ d'un Grand Prix de Formule 1, en Belgique en 1958."],
  ['moss', 'Stirling Moss', 'trefle', 'Valet', [1951, 1961], 'epic', ['moss'], "Seize victoires en Grand Prix, et le plus grand pilote à n'avoir jamais été champion du monde."],
  ['nurburgring', 'Nürburgring', 'carreau', 'As', [1960, 1976], 'legendary', [], "L'As de Carreau des années 60-70 : la Nordschleife, l'Enfer vert de l'Eifel et ses vingt kilomètres de virages autour du château."],
  ['stewart', 'Jackie Stewart', 'carreau', 'Roi', [1965, 1973], 'epic', ['stewart'], "Trois titres de champion du monde, et le combat de toute une vie pour la sécurité des pilotes."],
  ['lombardi', 'Lella Lombardi', 'carreau', 'Dame', [1974, 1976], 'epic', ['lombardi'], "La seule femme à avoir marqué des points en Formule 1, au Grand Prix d'Espagne 1975."],
  ['villeneuve', 'Gilles Villeneuve', 'carreau', 'Valet', [1977, 1982], 'epic', ['gilles_villeneuve'], "Le funambule de Ferrari : six victoires et des duels restés gravés, comme à Dijon en 1979."],
  ['monaco', 'Monaco', 'coeur', 'As', [1980, 1999], 'legendary', [], "L'As de Cœur des années 80-90 : le Casino, l'épingle, le tunnel et le port, le joyau du championnat."],
  ['piquet', 'Nelson Piquet', 'coeur', 'Roi', [1978, 1991], 'epic', ['piquet'], "Trois titres de champion du monde, en 1981, 1983 et 1987, avec Brabham puis Williams."],
  ['amati', 'Giovanna Amati', 'coeur', 'Dame', [1992, 1992], 'epic', [], "Engagée par Brabham en 1992, la dernière femme à avoir tenté de se qualifier pour un Grand Prix."],
  ['hill', 'Damon Hill', 'coeur', 'Valet', [1992, 1999], 'epic', ['damon_hill'], "Champion du monde 1996, fils de Graham Hill : le premier fils de champion sacré à son tour."],
  ['suzuka', 'Suzuka', 'pique', 'As', [2000, 2020], 'legendary', [], "L'As de Pique des années 2000-2020 : le tracé en huit de Suzuka, ses S et sa grande roue."],
  ['raikkonen', 'Kimi Räikkönen', 'pique', 'Roi', [2001, 2021], 'epic', ['raikkonen'], "Champion du monde 2007 pour un point, au terme d'une finale à trois au Brésil."],
  ['wolff', 'Susie Wolff', 'pique', 'Dame', [2014, 2015], 'epic', [], "En 2014, la première femme à rouler lors d'un week-end de Grand Prix depuis plus de vingt ans."],
  ['leclerc', 'Charles Leclerc', 'pique', 'Valet', [2018, 2026], 'epic', ['leclerc'], "Le Monégasque de la Scuderia, vainqueur à Monza en 2019 puis enfin chez lui, à Monaco, en 2024."],
]

export const SERIES_ALBUMS = [
  { id: 'vitraux', section: 'Légendes', title: 'Vitraux', subtitle: 'Les légendes en lumière, numérotées', reward: 3000, type: 'stained_glass' },
  { id: 'jeu-des-pilotes', section: 'Légendes', title: 'Le jeu des pilotes', subtitle: 'Quatre couleurs, quatre époques', reward: 1200, type: 'playing_card', cover: 'j-suzuka' },
]

export function seriesCards() {
  const vitraux = VITRAUX.map(([slug, name, sub, years, rarity, printRun, driverIds, text], i) => ({
    id: `v-${slug}`,
    type: 'stained_glass',
    rarity,
    name,
    sub,
    years,
    color: GLASS_COLOR,
    driverIds,
    text,
    quote: null,
    photo: { url: `/cards/vitraux/${slug}.jpg` },
    series: { index: i + 1, total: VITRAUX.length },
    printRun,
  }))
  const jeu = JEU.map(([slug, name, suit, rank, years, rarity, driverIds, text], i) => ({
    id: `j-${slug}`,
    type: 'playing_card',
    rarity,
    name,
    sub: `${rank} de ${SUITS[suit].label}`,
    years,
    color: SUITS[suit].red ? '#b3122a' : '#1b1b1b',
    driverIds,
    text,
    quote: null,
    photo: { url: `/cards/jeu/${slug}.jpg` },
    series: { index: i + 1, total: JEU.length },
    suit,
  }))
  return [...vitraux, ...jeu]
}

/** Albums des séries, à partir des cartes (couverture : celle choisie, sinon la plus rare) */
export function seriesAlbums(cards) {
  return SERIES_ALBUMS.map(({ type, cover, ...album }) => {
    const members = cards.filter((c) => c.type === type)
    const rarest = members.find((c) => c.rarity === 'mythic') ?? members[0]
    return { ...album, cover: cover ?? rarest.id, cards: members.map((c) => c.id) }
  })
}

// Lancement direct : remplace les séries dans le catalogue existant, après les autres cartes
// (les numéros des cartes déjà en circulation ne bougent pas), puis régénère le seed
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = fileURLToPath(new URL('../..', import.meta.url))
  const path = `${root}src/data/catalog.json`
  const catalog = JSON.parse(readFileSync(path, 'utf8'))
  const types = new Set(SERIES_ALBUMS.map((a) => a.type))
  const known = new Map(catalog.cards.filter((c) => types.has(c.type)).map((c) => [c.id, c.n]))
  const others = catalog.cards.filter((c) => !types.has(c.type))
  const series = seriesCards()
  let last = Math.max(...others.map((c) => c.n), ...known.values())
  for (const c of series) c.n = known.get(c.id) ?? ++last
  catalog.cards = [...others, ...series].sort((a, b) => a.n - b.n)
  const ids = new Set(SERIES_ALBUMS.map((a) => a.id))
  catalog.albums = [...catalog.albums.filter((a) => !ids.has(a.id)), ...seriesAlbums(series)]
  writeFileSync(path, JSON.stringify(catalog))
  writeSeed(root, catalog.cards, catalog.albums)
  console.log(`${series.length} cartes (#${series[0].n} à #${series.at(-1).n}), albums ${[...ids].join(', ')}`)
}
