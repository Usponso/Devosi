import { getNationalityLabel } from '@/data/nationalities'
import { i18n, t, intlLocale } from '@/i18n'

/**
 * Écurie d'une carte pilote : celle où il a disputé le plus de courses (c'est elle qui
 * compte pour les quêtes « carte de l'écurie X »). `byId` : catalogue indexé par id.
 */
export const driverTeamName = (card, byId) =>
  card?.type === 'driver' && card.teamId ? byId.get(`t-${card.teamId}`)?.name ?? null : null

/** 1 234 Pièces */
export const formatCoins = (n) => (n ?? 0).toLocaleString(intlLocale())

/** Message lisible pour une erreur des fonctions de l'atelier (code = hint SQL) */
export const economyMessage = (err) => {
  const key = `errors.${err?.code}`
  return err?.code && i18n.global.te(key) ? t(key) : t('errors.GENERIC')
}

/** Titre affiché pour un album complété (traductions : i18n/locales/fr|en/albumTitles.js, repli sur le nom de l'album) */
export const albumTitle = (albumId, albums = []) => {
  if (!albumId) return null
  const key = `albumTitles.${albumId}`
  return i18n.global.te(key) ? t(key) : albums.find((a) => a.id === albumId)?.title ?? null
}

/** Ligne de description d'une carte (fiche détaillée) */
export function describeCard(card) {
  const [a, b] = card.years ?? []
  const s = card.stats ?? {}
  const period = a === b ? a : `${a}–${b}`
  switch (card.type) {
    case 'driver':
      return `${getNationalityLabel(card.sub)} · ${period} · ${t('describe.driver', { titles: t('describe.titles', s.titles ?? 0), wins: t('describe.wins', s.wins ?? 0), podiums: t('describe.podiums', s.podiums ?? 0) })}`
    case 'team':
      return `${getNationalityLabel(card.sub)} · ${period} · ${t('describe.team', { titles: t('describe.teamTitles', s.titles ?? 0), wins: t('describe.wins', s.wins ?? 0) })}`
    case 'gp':
      return t('describe.gp', { year: a, round: s.round, sub: card.sub, winner: s.winner, team: s.team })
    default:
      return `${a} · ${card.sub}`
  }
}
