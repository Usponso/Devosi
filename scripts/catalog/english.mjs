/**
 * Catalogue en anglais : surcouche src/data/catalog.en.json, chargée à la place des textes
 * français quand l'app est en anglais. Elle ne contient que ce qui change (noms des GP, textes
 * des Moments et Chefs-d'œuvre, vitraux, cartes à jouer, affiches, albums) ; les noms de
 * pilotes et d'écuries restent tels quels.
 *
 * Régénérée par build-catalog.mjs, ou seule : node scripts/catalog/english.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { gpNameEn } from './gp-names.mjs'

/** Moments (m-…) et Chefs-d'œuvre (cd-…), par identifiant sans préfixe : [titre, texte] */
const MOMENTS = {
  'fangio-5-titres': ['Five crowns', 'Fangio becomes a five-time world champion, a record that would stand for 46 years.'],
  'fangio-nurburgring-1957': ['The Nürburgring masterpiece', 'Leaving the pits almost a minute behind, Fangio breaks the lap record again and again, catches the Ferraris and seals his fifth title.'],
  'clark-1963': ['Seven out of ten', 'Jim Clark and the Lotus 25 win seven of the ten Grands Prix and the Scot’s first title.'],
  'stewart-nurburgring-1968': ['Four minutes in the fog', 'In rain and fog, Jackie Stewart wins at the Nürburgring by more than four minutes.'],
  'rindt-titre-posthume': ['Posthumous champion', 'Killed in practice at Monza, Jochen Rindt remains the only posthumous world champion.'],
  'hill-triple-couronne': ['The triple crown', 'By winning the 1972 Le Mans 24 Hours, Graham Hill becomes the only driver to win Monaco, Indianapolis and Le Mans.'],
  'hunt-fuji-1976': ['The Fuji deluge', 'In pouring rain, James Hunt snatches the title by one point from Lauda, who had chosen not to race.'],
  'lauda-monza-1976': ['The Monza comeback', 'Six weeks after his terrible crash at the Nürburgring, Niki Lauda is back behind the wheel at Monza and finishes fourth.'],
  'villeneuve-arnoux-dijon-1979': ['The Dijon duel', 'Gilles Villeneuve and René Arnoux fight wheel to wheel in one of the greatest duels in history.'],
  'lauda-demi-point-1984': ['Half a point', 'Niki Lauda takes his third title by half a point from teammate Alain Prost, the smallest margin in history.'],
  'senna-monaco-1984': ['Revelation in the rain', 'In a modest Toleman, the young Ayrton Senna climbs to second place in the Monaco downpour.'],
  'senna-estoril-1985': ['First win', 'In the Estoril rain, Ayrton Senna takes his first Formula 1 win with a total masterclass.'],
  'piquet-senna-hongrie-1986': ['The sliding pass', 'Nelson Piquet goes around the outside of Senna, opposite-locking, to win at the Hungaroring.'],
  'suzuka-1989': ['Suzuka 1989', 'Prost and Senna collide at the chicane: Senna rejoins but is disqualified, and Prost is crowned.'],
  'suzuka-1990': ['First-corner revenge', 'A year later, the two rivals collide at the first corner and Senna takes his second title.'],
  'mansell-senna-barcelone-1991': ['Sparks in Barcelona', 'Mansell and Senna race down the straight side by side, inches apart.'],
  'mansell-1992': ['The Lion crowned', 'With the Williams FW14B, Nigel Mansell dominates the 1992 season and finally wins the world title.'],
  'prost-4e-titre-1993': ['The Professor takes his bow', 'Alain Prost wins a fourth title with Williams, then retires.'],
  'senna-donington-1993': ['The lap of the gods', 'Fourth on the grid and fifth at the first corner, Senna leads before the end of the opening lap in the Donington rain.'],
  'adelaide-1994': ['Adelaide 1994', 'Schumacher and Hill collide in the finale: the German wins the first of his seven titles.'],
  'schumacher-spa-1995': ['Sixteenth to first', 'Starting sixteenth at Spa, Michael Schumacher carves through the field to win.'],
  'panis-monaco-1996': ['The Monaco miracle', 'A race of attrition in the streets of Monaco: Olivier Panis gives Ligier an unexpected win.'],
  'hill-hongrie-1997': ['So close with Arrows', 'Damon Hill leads the Hungarian Grand Prix in an Arrows until a failure robs him of victory on the last lap.'],
  'schumacher-hongrie-1998': ['Nineteen qualifying laps', 'Switched to a three-stop strategy, Schumacher reels off qualifying-pace laps to win at the Hungaroring.'],
  'hakkinen-spa-2000': ['The pass of the century', 'At Spa, Mika Häkkinen passes Schumacher using the backmarker Zonta, at over 300 km/h.'],
  'schumacher-ferrari-2000': ['Red reborn', 'At Suzuka, Schumacher gives Ferrari its first drivers’ title since 1979.'],
  'schumacher-7-titres': ['Seven crowns', 'By clinching a seventh title at Spa, Michael Schumacher sets an all-time record.'],
  'alonso-2005': ['The end of a reign', 'Fernando Alonso becomes the youngest world champion of the time and ends Schumacher’s run.'],
  'raikkonen-suzuka-2005': ['Seventeenth to first', 'Starting seventeenth, Kimi Räikkönen passes Fisichella on the last lap to win the Japanese Grand Prix.'],
  'hamilton-canada-2007': ['First win', 'In Montreal, rookie Lewis Hamilton takes his first pole position and his first win.'],
  'interlagos-2008': ['The last corner', 'Hamilton passes Glock at the last corner and becomes world champion by a single point.'],
  'massa-2008': ['Champion for thirty seconds', 'Winning at home, Felipe Massa believes he is champion until Hamilton crosses the line.'],
  'brawn-2009': ['The Brawn fairy tale', 'Born from the ashes of Honda, Brawn GP wins both titles in its only season.'],
  'vettel-2010': ['The youngest champion', 'In Abu Dhabi, Sebastian Vettel becomes the youngest world champion in history, aged 23.'],
  'webber-silverstone-2010': ['Not bad for a number two', 'Winning at Silverstone after an internal row, Mark Webber delivers a line that became famous.'],
  'button-canada-2011': ['Last to first', 'Six pit stops in the longest race in history: Button passes Vettel on the final lap.'],
  'alonso-valence-2012': ['Home comeback', 'Starting eleventh, Fernando Alonso wins in Spain and bursts into tears on the podium.'],
  'raikkonen-abu-dhabi-2012': ['Leave me alone', 'Leading in Abu Dhabi, Kimi Räikkönen snaps back at his engineer, then wins the race.'],
  'multi-21-2013': ['Multi 21', 'In Malaysia, Vettel ignores team orders and passes Webber for the win.'],
  'alonso-gp2-engine-2015': ['GP2 engine', 'Lapped by other cars at Suzuka, Fernando Alonso vents his frustration at his Honda engine.'],
  'rosberg-2016': ['Champion, then retired', 'Five days after his title, Nico Rosberg announces he is leaving Formula 1.'],
  'verstappen-barcelone-2016': ['Eighteen and a winner', 'In his first race for Red Bull, Max Verstappen becomes the youngest winner in history.'],
  'ricciardo-monaco-2018': ['Winning without the electric motor', 'Down on power, Daniel Ricciardo holds on to the chequered flag in Monaco.'],
  'gasly-monza-2020': ['The Frenchman of Monza', 'Pierre Gasly gives AlphaTauri an unexpected win and becomes the first French winner since 1996.'],
  'grosjean-bahrein-2020': ['Out of the flames', 'His Haas split in two and on fire, Romain Grosjean climbs out of the car, saved by the halo.'],
  'hamilton-7-titres': ['Equal to Schumacher', 'In Turkey, in the rain, Lewis Hamilton takes a seventh title and equals Michael Schumacher’s record.'],
  'abu-dhabi-2021': ['The last lap in Abu Dhabi', 'After a safety car, Verstappen passes Hamilton on the final lap and wins his first title.'],
  'hamilton-100-victoires': ['A century', 'In Sochi, Lewis Hamilton becomes the first driver to reach 100 Grand Prix wins.'],
  'verstappen-19-victoires': ['Nineteen wins', 'Max Verstappen wins 19 of the season’s 22 Grands Prix, an all-time record.'],
  'leclerc-monaco-2024': ['Home at last', 'After years of bad luck, Charles Leclerc finally wins the Monaco Grand Prix, at home.'],
}

/** Vitraux : [nom (null = inchangé), sous-titre, texte] */
const GLASS = {
  'v-fangio': [null, 'World champion', 'Five world titles in the 1950s, with four different constructors: the Argentine Maestro, set in stained glass.'],
  'v-lauda': [null, 'World champion', 'Three world titles, and a return to racing just six weeks after his 1976 Nürburgring crash.'],
  'v-prost': [null, 'World champion', 'The Professor: four world titles and 51 wins, a record in his era.'],
  'v-mp4': [null, 'Legendary car', 'The 1988 car: 15 wins in 16 Grands Prix, driven by Ayrton Senna and Alain Prost.'],
  'v-senna': [null, 'World champion', 'Three titles, 65 pole positions and six Monaco wins: the Brazilian genius, in cathedral light.'],
  'v-schumacher': [null, 'World champion', 'Seven world titles and 91 wins, including five crowns in a row with the Scuderia.'],
  'v-f2004': [null, 'Legendary car', 'The 2004 Ferrari: 15 wins in 18 races and Michael Schumacher’s seventh title.'],
  'v-alonso': [null, 'World champion', 'World champion in 2005 and 2006, the youngest of his time, and still racing twenty years later.'],
  'v-hamilton': [null, 'World champion', 'Seven world titles and the all-time records for wins and pole positions.'],
  'v-vettel': [null, 'World champion', 'Four titles in a row from 2010 to 2013, and the youngest world champion in history.'],
  'v-verstappen': [null, 'World champion', 'Four consecutive titles from 2021 to 2024, including a 19-win 2023 season.'],
  'v-rosace': ['The world champions', 'Great rose window', 'The great rose window brings together Formula 1’s world champions: the centrepiece of the series, limited to just five copies.'],
}

/** Cartes à jouer : texte ; le sous-titre (« As de Trèfle ») est traduit à part */
const PLAYING = {
  'j-monza': 'The Ace of Clubs of the 1950s-60s: Monza and its banked speed ring, in the heart of the royal park.',
  'j-brabham': 'Three-time world champion, and the only one crowned in a car bearing his own name, in 1966.',
  'j-de-filippis': 'The first woman to start a Formula 1 Grand Prix, in Belgium in 1958.',
  'j-moss': 'Sixteen Grand Prix wins, and the greatest driver never to become world champion.',
  'j-nurburgring': 'The Ace of Diamonds of the 1960s-70s: the Nordschleife, the Green Hell of the Eifel and its twenty kilometres of corners around the castle.',
  'j-stewart': 'Three world titles, and a lifelong fight for driver safety.',
  'j-lombardi': 'The only woman to score points in Formula 1, at the 1975 Spanish Grand Prix.',
  'j-villeneuve': 'Ferrari’s tightrope walker: six wins and unforgettable duels, like Dijon in 1979.',
  'j-monaco': 'The Ace of Hearts of the 1980s-90s: the Casino, the hairpin, the tunnel and the harbour, the jewel of the championship.',
  'j-piquet': 'Three world titles, in 1981, 1983 and 1987, with Brabham then Williams.',
  'j-amati': 'Signed by Brabham in 1992, the last woman to attempt to qualify for a Grand Prix.',
  'j-hill': '1996 world champion, son of Graham Hill: the first son of a champion to be crowned in turn.',
  'j-suzuka': 'The Ace of Spades of the 2000s-2020s: the figure-of-eight Suzuka track, its Esses and its big wheel.',
  'j-raikkonen': '2007 world champion by one point, after a three-way finale in Brazil.',
  'j-wolff': 'In 2014, the first woman to drive during a Grand Prix weekend in more than twenty years.',
  'j-leclerc': 'The Scuderia’s Monegasque, winner at Monza in 2019 and finally at home, in Monaco, in 2024.',
}
const RANKS = { As: 'Ace', Roi: 'King', Dame: 'Queen', Valet: 'Jack' }
const SUITS = { Trèfle: 'Clubs', Carreau: 'Diamonds', Cœur: 'Hearts', Pique: 'Spades' }
const playingSub = (sub) => sub.replace(/^(\S+) de (\S+)$/, (m, r, s) => (RANKS[r] && SUITS[s] ? `${RANKS[r]} of ${SUITS[s]}` : m))

/** Albums : [section, titre, sous-titre] ; les décennies et la grille sont générées */
const ALBUMS = {
  champions: ['Drivers', 'World champions', 'Every crowned driver'],
  vainqueurs: ['Drivers', 'Grand Prix winners', 'Winners without a world crown'],
  podiums: ['Drivers', 'On the podium', 'On the box, without a win'],
  francais: ['Drivers', 'The French', 'Every French driver'],
  'ecuries-championnes': ['Teams', 'Champion teams', 'Constructors’ title winners'],
  'ecuries-victorieuses': ['Teams', 'Winning teams', 'Winners without a constructors’ title'],
  monaco: ['The temples', 'Monaco', 'Every edition of the Monaco GP'],
  monza: ['The temples', 'Monza', 'The temple of speed'],
  silverstone: ['The temples', 'Silverstone', 'The birthplace of the championship'],
  spa: ['The temples', 'Spa-Francorchamps', 'Eau Rouge and Raidillon'],
  'courses-mythiques': ['The temples', 'Legendary races', 'Historic GPs and season finales'],
  moments: ['Legends', 'Legendary moments', 'The moments that made history'],
  'chefs-d-oeuvre': ['Legends', 'Masterpieces', 'The painted gallery of legendary moments'],
  vitraux: ['Legends', 'Stained glass', 'The legends in light, numbered'],
  'jeu-des-pilotes': ['Legends', 'The drivers’ deck', 'Four suits, four eras'],
}

function albumEn(a) {
  if (ALBUMS[a.id]) {
    const [section, title, subtitle] = ALBUMS[a.id]
    return { section, title, subtitle }
  }
  const decade = a.id.match(/^gp-(\d{4})$/)
  if (decade) {
    const from = Number(decade[1])
    return { section: 'Grands Prix', title: `The ${from}s`, subtitle: `Grands Prix ${from}–${from + 9}` }
  }
  const grid = a.id.match(/^grille-(\d{4})$/)
  if (grid) return { section: `${grid[1]} season`, title: `The ${grid[1]} grid`, subtitle: 'Drivers and teams of the season' }
  return null
}

/** Textes anglais d'une carte (seulement les champs qui changent), ou null */
function cardEn(c) {
  switch (c.type) {
    case 'gp': {
      const name = gpNameEn(c.name)
      return name !== c.name ? { name } : null
    }
    case 'moment':
    case 'masterpiece': {
      const m = MOMENTS[c.id.replace(/^(m|cd)-/, '')]
      return m ? { name: m[0], text: m[1] } : null
    }
    case 'stained_glass': {
      const g = GLASS[c.id]
      return g ? { ...(g[0] ? { name: g[0] } : {}), sub: g[1], text: g[2] } : null
    }
    case 'playing_card':
      return PLAYING[c.id] ? { sub: playingSub(c.sub), text: PLAYING[c.id] } : null
    case 'poster':
      return {
        text: `Vintage poster for round ${c.poster.round} of the ${c.poster.date.slice(0, 4)} season, in ${c.sub}: found in the GP pack of its weekend, then only through trades.`,
      }
    default:
      return null
  }
}

/** Surcouche anglaise du catalogue : { cards: { id: champs }, albums: { id: champs } } */
export function englishOverlay(catalog) {
  const cards = {}
  const missing = []
  for (const c of catalog.cards) {
    const en = cardEn(c)
    if (en) cards[c.id] = en
    else if (['moment', 'masterpiece', 'stained_glass', 'playing_card'].includes(c.type)) missing.push(c.id)
  }
  const albums = {}
  for (const a of catalog.albums) {
    const en = albumEn(a)
    if (en) albums[a.id] = en
    else missing.push(`album ${a.id}`)
  }
  if (missing.length) console.warn('Textes anglais manquants :', missing.join(', '))
  return { cards, albums }
}

/** Écrit src/data/catalog.en.json à partir de src/data/catalog.json */
export function writeEnglishCatalog(root) {
  const catalog = JSON.parse(readFileSync(`${root}src/data/catalog.json`, 'utf8'))
  const overlay = englishOverlay(catalog)
  writeFileSync(`${root}src/data/catalog.en.json`, JSON.stringify(overlay))
  console.log(`Catalogue anglais : ${Object.keys(overlay.cards).length} cartes, ${Object.keys(overlay.albums).length} albums`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeEnglishCatalog(fileURLToPath(new URL('../../', import.meta.url)))
}
