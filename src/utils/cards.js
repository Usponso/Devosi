import { getNationalityLabel } from '@/data/nationalities'

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

/** 1 234 Pièces */
export const formatCoins = (n) => (n ?? 0).toLocaleString('fr-FR')

const ECONOMY_ERRORS = {
  NOT_ENOUGH_COINS: 'Pas assez de Pièces.',
  NOT_ENOUGH_DUPLICATES: 'Pas assez de doublons.',
  NOT_ENOUGH_COPIES: "Pas assez d'exemplaires pour cette finition.",
  MAX_FINISH: 'Cette carte a déjà la finition Or.',
  SHOP_LIMIT: "Limite d'achats atteinte pour aujourd'hui, reviens demain.",
  BANK_FULL: "Ta réserve de packs est pleine : ouvre-en avant d'en acheter.",
  ALREADY_OWNED: 'Tu possèdes déjà cette carte.',
  CARD_UNKNOWN: 'Carte inconnue.',
  ALBUM_INCOMPLETE: "L'album n'est pas encore complet.",
  ALBUM_CLAIMED: 'Récompense déjà récupérée.',
  ALBUM_UNKNOWN: 'Album inconnu.',
}

/** Message lisible pour une erreur des fonctions de l'atelier (code = hint SQL) */
export const economyMessage = (err) => ECONOMY_ERRORS[err?.code] ?? 'Une erreur est survenue, réessaie.'

/** Ligne de description d'une carte (fiche détaillée) */
export function describeCard(card) {
  const [a, b] = card.years ?? []
  const s = card.stats ?? {}
  const period = a === b ? a : `${a}–${b}`
  switch (card.type) {
    case 'driver':
      return `${getNationalityLabel(card.sub)} · ${period} · ${plural(s.titles, 'titre')}, ${plural(s.wins, 'victoire')}, ${plural(s.podiums, 'podium')}`
    case 'team':
      return `${getNationalityLabel(card.sub)} · ${period} · ${plural(s.titles, 'titre')} constructeurs, ${plural(s.wins, 'victoire')}`
    case 'gp':
      return `${a}, manche ${s.round} · ${card.sub} · Vainqueur : ${s.winner} (${s.team})`
    default:
      return `${a} · ${card.sub}`
  }
}
