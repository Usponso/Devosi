export const NAV_ITEMS = [
  { to: '/', label: 'Accueil', icon: 'home', exact: true },
  { to: '/standings', label: 'Classements', icon: 'trophy' },
  { to: '/season', label: 'Calendrier', icon: 'calendar' },
  { to: '/drivers', label: 'Pilotes', icon: 'helmet' },
  { to: '/teams', label: 'Écuries', icon: 'shield' },
  // Mis en avant dans les menus (reflet holographique, badge des packs à ouvrir)
  { to: '/packs', label: 'Cartes', icon: 'cards', featured: true, match: ['/packs', '/collection', '/joueurs', '/atelier'] },
]

/** Onglet actif pour un chemin donné */
export function isNavActive(item, path) {
  if (item.exact) return path === item.to
  return (item.match ?? [item.to]).some((prefix) => path.startsWith(prefix))
}
