/**
 * Visuels officiels des monoplaces (CDN formula1.com), par saison et par écurie.
 * Les noms d'écurie du CDN changent selon les années : table vérifiée à la main.
 * Vue de profil (nez à droite) disponible de 2024 à 2026, vue de face détourée en 2026
 * (celle de 2024 a un fond opaque).
 */

const CDN = 'https://media.formula1.com/image/upload'

const BASE_2024 = {
  red_bull: 'redbullracing',
  mercedes: 'mercedes',
  ferrari: 'ferrari',
  mclaren: 'mclaren',
  aston_martin: 'astonmartin',
  alpine: 'alpine',
  williams: 'williams',
  sauber: 'kicksauber',
}

const CAR_SLUGS = {
  2024: { ...BASE_2024, rb: 'rb', haas: 'haas' },
  2025: { ...BASE_2024, rb: 'racingbulls', haas: 'haasf1team' },
  2026: {
    ...BASE_2024,
    sauber: undefined,
    rb: 'racingbulls',
    haas: 'haasf1team',
    audi: 'audi',
    cadillac: 'cadillac',
  },
}

const FRONT_VIEW_SEASONS = new Set([2026])

/**
 * URL du visuel d'une monoplace, ou null si on n'a pas la vraie voiture de cette saison.
 * @param {string} teamId - constructorId Jolpica
 * @param {number} season
 * @param {'right'|'front'} view
 */
export function carImage(teamId, season, view = 'right', width = 1200) {
  const slug = CAR_SLUGS[season]?.[teamId]
  if (!slug) return null
  if (view === 'front' && !FRONT_VIEW_SEASONS.has(season)) return null
  return `${CDN}/c_lfill,w_${width}/q_auto/v1740000000/common/f1/${season}/${slug}/${season}${slug}car${view}.webp`
}

