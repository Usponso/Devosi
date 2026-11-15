/** Succès : niveaux, familles et icônes (catalogue dans public._achievement_pool()) */
import { i18n, t } from '@/i18n'

export const TIER_LABEL = Object.fromEntries([1, 2, 3, 4].map((n) => [n, t(`achievementTier.${n}`)]))

export const FAMILIES = [
  'collection',
  'teams',
  'predictions',
  'loyalty',
].map((id) => ({ id, label: t(`achievementFamily.${id}`) }))

/** Titre d'un succès dans la langue de l'app (le serveur l'envoie en français) */
export const achievementTitle = (a) => (a && i18n.global.te(`achievements.${a.id}.title`) ? t(`achievements.${a.id}.title`) : a?.title ?? '')

/** Description d'un succès dans la langue de l'app */
export const achievementDescription = (a) =>
  a && i18n.global.te(`achievements.${a.id}.description`) ? t(`achievements.${a.id}.description`) : a?.description ?? ''

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
