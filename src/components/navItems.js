/** Pages de la section Cartes (barre d'onglets commune, lien « Cartes » actif) */
export const CARDS_PATHS = ['/profil', '/packs', '/quetes', '/succes', '/echanges', '/boutique', '/collection', '/atelier', '/joueurs']

// `label` et `short` : clés de traduction (i18n/locales/*/nav.js)
export const NAV_ITEMS = [
  { to: '/', label: 'nav.home', icon: 'home', exact: true },
  { to: '/standings', label: 'nav.standings', icon: 'trophy' },
  { to: '/season', label: 'nav.calendar', icon: 'calendar' },
  // Pastille : gains de pronostics à récupérer ; `short` : libellé de la barre mobile
  { to: '/pronostics', label: 'nav.predictions', short: 'nav.predictionsShort', icon: 'flag', badge: 'predictions' },
  { to: '/drivers', label: 'nav.drivers', icon: 'helmet' },
  { to: '/teams', label: 'nav.teams', icon: 'shield' },
  // Mis en avant dans les menus (reflet holographique, badge des packs à ouvrir)
  { to: '/packs', label: 'nav.cards', icon: 'cards', featured: true, match: CARDS_PATHS },
]

/** Onglet actif pour un chemin donné */
export function isNavActive(item, path) {
  if (item.exact) return path === item.to
  return (item.match ?? [item.to]).some((prefix) => path.startsWith(prefix))
}
