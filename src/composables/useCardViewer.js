import { computed, reactive } from 'vue'

/**
 * Visionneuse plein écran des cartes, partagée par toute l'app (CardViewer.vue,
 * monté une seule fois dans App.vue). N'importe quelle carte l'ouvre au clic.
 */
const state = reactive({
  card: null,
  list: [], // cartes voisines (flèches précédente / suivante)
  finishes: null, // finitions d'un autre joueur : { card_id: 1 | 2 }
  finish: null, // finition imposée pour la carte ouverte
})

export function useCardViewer() {
  const index = computed(() => state.list.findIndex((c) => c.id === state.card?.id))

  /** Ouvre une carte ; `list` permet de passer aux cartes voisines */
  function open(card, { list = [], finishes = null, finish = null } = {}) {
    state.list = list.some((c) => c.id === card.id) ? list : []
    state.finishes = finishes
    state.finish = finish
    state.card = card
  }

  function close() {
    state.card = null
  }

  /** Carte précédente (-1) ou suivante (+1), en boucle */
  function step(delta) {
    if (state.list.length < 2) return
    const i = (index.value + delta + state.list.length) % state.list.length
    state.card = state.list[i]
    state.finish = null
  }

  return { state, index, open, close, step }
}
