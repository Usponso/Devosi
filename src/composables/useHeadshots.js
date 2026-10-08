import { ref } from 'vue'
import { fetchLatestHeadshots } from '@/services/openf1'

// Partagé entre toutes les vues : une seule requête par session
const headshots = ref(new Map())
let loading = null

/** Photos des pilotes (saison en cours uniquement), indexées par code pilote */
export function useHeadshots() {
  if (!loading) {
    loading = fetchLatestHeadshots()
      .then((map) => (headshots.value = map))
      .catch(() => {
        loading = null
      })
  }
  return headshots
}
