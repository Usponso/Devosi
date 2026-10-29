import { getNationalityLabel } from '@/data/nationalities'

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

/** 1 234 Pièces */
/**
 * Écurie d'une carte pilote : celle où il a disputé le plus de courses (c'est elle qui
 * compte pour les quêtes « carte de l'écurie X »). `byId` : catalogue indexé par id.
 */
export const driverTeamName = (card, byId) =>
  card?.type === 'driver' && card.teamId ? byId.get(`t-${card.teamId}`)?.name ?? null : null

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
  AVATAR_NOT_OWNED: 'Tu ne possèdes pas cette carte.',
  TITLE_LOCKED: 'Complète cet album pour débloquer son titre.',
  TEAM_INVALID: 'Écurie inconnue.',
  PROFILE_REQUIRED: 'Sauvegarde ta collection et choisis un pseudo pour ajouter des amis.',
  PLAYER_UNKNOWN: 'Aucun joueur avec ce pseudo.',
  FRIEND_SELF: 'Tu ne peux pas t’ajouter toi-même.',
  FRIEND_LIMIT: 'Limite de demandes ou d’amis atteinte.',
  REQUEST_UNKNOWN: 'Cette demande n’existe plus.',
  CODE_INVALID: 'Ce code n’existe pas.',
  CODE_ALREADY_USED: 'Tu as déjà utilisé ce code.',
  CODE_EXPIRED: 'Ce code a expiré.',
  CODE_NOT_STARTED: 'Ce code n’est pas encore actif.',
  CODE_USED_UP: 'Ce code a déjà été utilisé le nombre maximum de fois.',
  CODE_RATE_LIMIT: 'Trop de codes invalides, réessaie dans une heure.',
  ACHIEVEMENT_LOCKED: 'Ce succès n’est pas encore débloqué.',
  ACHIEVEMENT_CLAIMED: 'Récompense déjà récupérée.',
  PROFILE_INCOMPLETE: 'Complète d’abord ton profil.',
  PROFILE_REWARDED: 'Récompense déjà récupérée.',
  BADGES_FULL: '3 badges maximum sur ton profil.',
  NO_WEEKEND: 'Le week-end de course est terminé.',
  GP_SHOP_LIMIT: 'Tu as déjà acheté 3 packs GP ce week-end.',
  RACE_UNKNOWN: 'Course inconnue.',
  PREDICTION_CLOSED: 'Les pronostics sont fermés : les qualifications ont commencé.',
  PREDICTION_INVALID: 'Choisis les 3 pilotes du podium et le poleman.',
  PREDICTION_DUPLICATE: 'Un pilote ne peut être qu’une fois sur le podium.',
  PREDICTION_PENDING: 'Les résultats ne sont pas encore connus.',
  PREDICTION_CLAIMED: 'Gains déjà récupérés.',
}

/** Message lisible pour une erreur des fonctions de l'atelier (code = hint SQL) */
export const economyMessage = (err) => ECONOMY_ERRORS[err?.code] ?? 'Une erreur est survenue, réessaie.'

/** Titre de profil débloqué par chaque album (id de l'album → titre affiché sous le pseudo) */
const ALBUM_TITLES = {
  champions: 'Faiseur de champions',
  vainqueurs: 'Chasseur de victoires',
  podiums: 'Habitué du podium',
  francais: 'Cocorico',
  'ecuries-championnes': 'Stratège des constructeurs',
  'ecuries-victorieuses': "Chef d'écurie",
  'grille-2026': 'Paddock 2026',
  'gp-1950': 'Pionnier des années 50',
  'gp-1960': 'Mémoire des années 60',
  'gp-1970': 'Mémoire des années 70',
  'gp-1980': 'Ère turbo',
  'gp-1990': 'Mémoire des années 90',
  'gp-2000': 'Mémoire des années 2000',
  'gp-2010': 'Ère hybride',
  'gp-2020': 'Mémoire des années 2020',
  monaco: 'Roi de Monaco',
  monza: 'Tifoso de Monza',
  silverstone: 'Seigneur de Silverstone',
  spa: "Maître de l'Eau Rouge",
  'courses-mythiques': 'Conteur de légendes',
  moments: 'Gardien des légendes',
}

/** Titre affiché pour un album complété (repli sur le nom de l'album) */
export const albumTitle = (albumId, albums = []) =>
  ALBUM_TITLES[albumId] ?? albums.find((a) => a.id === albumId)?.title ?? null

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
