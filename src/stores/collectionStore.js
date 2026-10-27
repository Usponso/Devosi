import { defineStore } from 'pinia'
import {
  buyPack,
  claimAlbum,
  fetchMyAlbums,
  craftCard,
  currentUser,
  recycleCard,
  recycleDuplicates,
  tradeUp,
  upgradeCard,
  resetSession,
  fetchMyCards,
  fetchMyProfile,
  fetchPackStatus,
  isCollectionConfigured,
  openPack,
  peekPackStatus,
  saveShowcase,
  saveUsername,
} from '@/services/collection'

/**
 * Probabilité par carte (%) et valeur en Pièces (recyclage / fabrication) — à garder
 * synchronisées avec public._roll_rarity() et public._card_value() (supabase/migrations)
 */
export const RARITIES = [
  { id: 'common', label: 'Commune', odds: 88.94, recycle: 5, craft: 20 },
  { id: 'rare', label: 'Rare', odds: 9.7, recycle: 20, craft: 80 },
  { id: 'epic', label: 'Épique', odds: 1.02, recycle: 100, craft: 400 },
  { id: 'legendary', label: 'Légendaire', odds: 0.32, recycle: 400, craft: 1600 },
  { id: 'mythic', label: 'Mythique', odds: 0.02, recycle: 2000, craft: 8000 },
]
export const CARDS_PER_PACK = 5
/** Vitesse supérieure : doublons consommés pour une carte de la rareté supérieure */
export const TRADE_UP_COST = 5
/** Finitions : exemplaires nécessaires (tous consommés sauf un) */
export const FINISHES = [
  { id: 0, label: 'Standard' },
  { id: 1, label: 'Chrome', copies: 5 },
  { id: 2, label: 'Or', copies: 10 },
]
export const RARITY_VALUE = Object.fromEntries(RARITIES.map((r) => [r.id, r]))

/** Chance (0..1) qu'un pack contienne au moins une carte de cette rareté */
export const packChance = (rarity) => 1 - (1 - rarity.odds / 100) ** CARDS_PER_PACK
export const RARITY_RANK = Object.fromEntries(RARITIES.map((r, i) => [r.id, i]))
export const RARITY_LABEL = Object.fromEntries(RARITIES.map((r) => [r.id, r.label]))

export const CARD_TYPES = [
  { id: 'driver', label: 'Pilotes' },
  { id: 'team', label: 'Écuries' },
  { id: 'gp', label: 'Grands Prix' },
  { id: 'moment', label: 'Moments' },
]
export const TYPE_LABEL = { driver: 'Pilote', team: 'Écurie', gp: 'Grand Prix', moment: 'Moment' }

let catalogPromise = null

export const useCollectionStore = defineStore('collection', {
  state: () => ({
    configured: isCollectionConfigured,
    noSession: false, // visiteur qui n'a jamais ouvert l'onglet Cartes
    cards: [], // catalogue complet
    albums: [], // classeur : [{ id, section, title, subtitle, reward, cover, cards: [id] }]
    claimedAlbums: new Set(), // albums dont la récompense a été récupérée
    ready: false, // collection du joueur chargée (init terminé)
    owned: new Map(), // card_id → nombre d'exemplaires
    finishes: new Map(), // card_id → finition débloquée (1 Chrome, 2 Or)
    status: null, // réserve de packs (serveur)
    profile: null, // { username, showcase, permanent }
    email: null, // email du compte (null pour une session invité)
    clockOffset: 0, // écart horloge serveur - horloge locale (ms)
    loading: false,
    error: null,
  }),

  getters: {
    byId: (state) => new Map(state.cards.map((c) => [c.id, c])),
    ownedCount: (state) => state.owned.size,
    isGuest: (state) => !state.profile?.permanent,
    showcase: (state) => state.profile?.showcase ?? [],
    coins: (state) => state.status?.coins ?? 0,
    /** Progression des albums : Map(id → { owned, total, complete, claimed }) */
    albumStats: (state) =>
      new Map(
        state.albums.map((album) => {
          const owned = album.cards.reduce((n, id) => n + (state.owned.has(id) ? 1 : 0), 0)
          const total = album.cards.length
          return [album.id, { owned, total, complete: owned === total, claimed: state.claimedAlbums.has(album.id) }]
        }),
      ),
    /** Albums complets dont la récompense attend d'être récupérée */
    albumsToClaim(state) {
      return state.albums.filter((a) => {
        const s = this.albumStats.get(a.id)
        return s.complete && !s.claimed
      }).length
    },
    /** Packs à ouvrir (menu) : la réserve, ou les 3 packs offerts à un nouveau visiteur */
    packBadge: (state) => (state.status ? state.status.available : state.noSession ? 3 : 0),
    /** Doublons par rareté : { common: { copies, value }, … } */
    duplicates(state) {
      const out = Object.fromEntries(RARITIES.map((r) => [r.id, { copies: 0, value: 0 }]))
      const byId = this.byId
      for (const [id, count] of state.owned) {
        const card = byId.get(id)
        if (!card || count < 2) continue
        out[card.rarity].copies += count - 1
        out[card.rarity].value += (count - 1) * RARITY_VALUE[card.rarity].recycle
      }
      return out
    },
    /** Instant (horloge locale) du prochain pack, ou null si la réserve est pleine */
    nextPackAt: (state) =>
      state.status?.next_at ? new Date(state.status.next_at).getTime() - state.clockOffset : null,
  },

  actions: {
    async loadCatalog() {
      if (this.cards.length) return
      catalogPromise ??= import('@/data/catalog.json').then((m) => m.default)
      const catalog = await catalogPromise
      this.cards = catalog.cards
      this.albums = catalog.albums ?? []
    },

    setStatus(status) {
      this.status = status
      this.clockOffset = new Date(status.server_now).getTime() - Date.now()
    },

    async refreshStatus() {
      this.setStatus(await fetchPackStatus())
    },

    /** Réserve seule (accueil) : ne crée pas de session invité ; false si aucune session */
    async peekStatus() {
      if (!this.configured) return false
      if (this.status) return true
      const status = await peekPackStatus()
      if (status) this.setStatus(status)
      this.noSession = !status
      return Boolean(status)
    },

    async init() {
      if (!this.configured || this.loading) return
      this.loading = true
      this.error = null
      try {
        const [, status, mine, profile, user, claimed] = await Promise.all([
          this.loadCatalog(),
          fetchPackStatus(),
          fetchMyCards(),
          fetchMyProfile(),
          currentUser(),
          fetchMyAlbums(),
        ])
        this.claimedAlbums = claimed
        this.setStatus(status)
        this.owned = mine.owned
        this.finishes = mine.finishes
        this.profile = profile
        this.email = user?.is_anonymous ? null : user?.email ?? null
        this.ready = true
      } catch (err) {
        console.error('[Collection]', err)
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /** Après connexion / déconnexion : tout recharger pour le nouveau compte */
    async reload() {
      resetSession()
      this.owned = new Map()
      this.finishes = new Map()
      this.claimedAlbums = new Set()
      this.ready = false
      this.status = null
      this.profile = null
      this.email = null
      this.loading = false
      await this.init()
    },

    async setUsername(username) {
      this.profile = await saveUsername(username)
    },

    /** Ajoute ou retire une carte de la vitrine (5 max) */
    async toggleShowcase(cardId) {
      const current = this.showcase
      const next = current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]
      if (next.length > 5) throw Object.assign(new Error('5 cartes maximum'), { code: 'SHOWCASE_FULL' })
      this.profile = await saveShowcase(next)
    },

    /** Applique les nouveaux nombres d'exemplaires renvoyés par le serveur */
    applyCounts(cards = []) {
      const owned = new Map(this.owned)
      cards.forEach((c) => owned.set(c.id, c.count))
      this.owned = owned
    },

    /** Ajoute une carte obtenue (fabrication, vitesse supérieure) ; renvoie la carte du catalogue */
    addCard(card) {
      const owned = new Map(this.owned)
      owned.set(card.id, (owned.get(card.id) ?? 0) + 1)
      this.owned = owned
      return { ...this.byId.get(card.id), isNew: card.is_new }
    },

    async recycle(cardId, qty = 1) {
      const res = await recycleCard(cardId, qty)
      this.applyCounts(res.cards)
      this.setStatus(res.status)
      return res.gained
    },

    async recycleAll(keep = 1, rarities = null) {
      const res = await recycleDuplicates(keep, rarities)
      this.applyCounts(res.cards)
      this.setStatus(res.status)
      return res.gained
    },

    async buyPack() {
      this.setStatus((await buyPack()).status)
    },

    async craft(cardId) {
      const res = await craftCard(cardId)
      this.setStatus(res.status)
      return this.addCard(res.card)
    },

    async tradeUp(rarity) {
      await this.loadCatalog()
      const res = await tradeUp(rarity)
      this.applyCounts(res.cards)
      this.setStatus(res.status)
      return this.addCard(res.card)
    },

    async upgrade(cardId) {
      const res = await upgradeCard(cardId)
      this.applyCounts([res])
      const finishes = new Map(this.finishes)
      finishes.set(cardId, res.finish)
      this.finishes = finishes
      return res.finish
    },

    /** Récupère la récompense d'un album complet ; renvoie les Pièces gagnées */
    async claimAlbum(albumId) {
      const res = await claimAlbum(albumId)
      this.setStatus(res.status)
      this.claimedAlbums = new Set([...this.claimedAlbums, albumId])
      return res.reward
    },

    /** Ouvre un pack ; renvoie les cartes du catalogue, de la moins rare à la plus rare */
    async open() {
      await this.loadCatalog()
      const { cards, status } = await openPack()
      this.setStatus(status)
      const owned = new Map(this.owned)
      const drawn = cards.map((c) => {
        owned.set(c.id, (owned.get(c.id) ?? 0) + 1)
        return { ...this.byId.get(c.id), isNew: c.is_new }
      })
      this.owned = owned
      // Suspense : la carte la plus rare est révélée en dernier
      return drawn.sort((a, b) => RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity])
    },
  },
})
