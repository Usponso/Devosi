/** Succès : niveaux, familles et icônes (catalogue dans public._achievement_pool()) */

export const TIER_LABEL = { 1: 'Bronze', 2: 'Argent', 3: 'Or', 4: 'Légende' }

export const FAMILIES = [
  { id: 'collection', label: 'Collection' },
  { id: 'teams', label: 'Écuries et pilotes' },
  { id: 'predictions', label: 'Pronostics' },
  { id: 'loyalty', label: 'Fidélité' },
]

/** Icône d'un succès selon ce qu'il mesure */
export const ACHIEVEMENT_ICON = {
  packs: 'package',
  cards: 'cards',
  rarity: 'star',
  chrome: 'gauge',
  gold: 'coin',
  edition: 'trophy',
  team: 'shield',
  album: 'album',
  predictions: 'flag',
  winners: 'flag',
  poles: 'timer',
  perfect: 'trophy',
  top10: 'chart',
  streak: 'bolt',
  quests: 'check',
  friends: 'users',
  promo: 'gift',
}
