import { computed } from 'vue'
import { useCollectionStore } from '@/stores/collectionStore'

let started = false

/**
 * Nombre de packs à ouvrir, affiché dans les menus. Lit la réserve sans créer de
 * session invité, puis la rafraîchit quand un nouveau pack arrive (une seule
 * minuterie pour toute l'app, même si plusieurs menus l'utilisent).
 */
export function usePackBadge() {
  const col = useCollectionStore()

  if (!started && col.configured) {
    started = true
    col.peekStatus().catch((err) => console.error('[Packs]', err))
    setInterval(() => {
      if (col.nextPackAt && Date.now() >= col.nextPackAt) col.refreshStatus().catch(() => {})
    }, 30_000)
  }

  return computed(() => col.packBadge)
}
