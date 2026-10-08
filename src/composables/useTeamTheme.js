import { watchEffect } from 'vue'
import { usePrefsStore } from '@/stores/prefsStore'
import { DEFAULT_ACCENT } from '@/data/teams'

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Luminance relative WCAG */
function luminance([r, g, b]) {
  const lin = (c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Texte noir ou blanc selon le meilleur contraste sur la couleur d'accent */
export function readableOn(hex) {
  const l = luminance(hexToRgb(hex))
  const contrastWhite = 1.05 / (l + 0.05)
  const contrastBlack = (l + 0.05) / 0.05
  return contrastBlack >= contrastWhite ? '#0B0C0F' : '#FFFFFF'
}

/** Applique la couleur de l'écurie favorite sur :root (--accent, --accent-rgb, --on-accent) */
export function useTeamTheme() {
  const prefs = usePrefsStore()

  watchEffect(() => {
    const color = prefs.favoriteTeam?.color ?? DEFAULT_ACCENT
    const root = document.documentElement
    root.style.setProperty('--accent', color)
    root.style.setProperty('--accent-rgb', hexToRgb(color).join(' '))
    root.style.setProperty('--on-accent', readableOn(color))
    root.dataset.team = prefs.favoriteTeamId ?? 'none'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  })
}
