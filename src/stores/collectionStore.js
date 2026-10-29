import { defineStore } from 'pinia'
import { usePrefsStore } from '@/stores/prefsStore'
import {
  buyGpPack,
  buyPack,
  claimPrediction,
  fetchMyEditions,
  fetchPredictions,
  savePrediction,
  claimAlbum,
  claimQuest,
  fetchMyAlbums,
  fetchQuests,
  redeemCode,
  rerollQuest,
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
  fetchFriends,
  isCollectionConfigured,
  removeFriend,
  respondFriendRequest,
  saveAvatar,
  saveTeam,
  saveTitle,
  sendFriendRequest,
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
    obtained: new Map(), // card_id → date de la première obtention (ms)
    status: null, // réserve de packs (serveur)
    profile: null, // { username, showcase, avatar, title, team, permanent, requests }
    friends: null, // { friends, incoming, outgoing } (chargé à la demande)
    quests: null, // quêtes du jour (chargées par la page Packs)
    predictions: null, // pronostics : { season, next, history, total, rank, players }
    editions: [], // éditions vainqueur : [{ season, round, card_id, name, obtained_at }]
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
    /** Compte pouvant avoir des amis : relié à un email et doté d'un pseudo */
    isPlayer: (state) => Boolean(state.profile?.permanent && state.profile?.username),
    /** Demandes d'amis reçues en attente */
    friendRequests: (state) => state.friends?.incoming.length ?? state.profile?.requests ?? 0,
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
    /** Week-end de course en cours : { season, round, name, circuit, ends_at, free, packs, left, price } */
    gpWeekend: (state) => state.status?.gp ?? null,
    /** Packs GP à ouvrir : l'offert du jour et ceux achetés */
    gpPacksToOpen: (state) => (state.status?.gp ? Number(state.status.gp.free) + state.status.gp.packs : 0),
    /** Tous les packs à ouvrir : réserve rechargée (10 max), réserve bonus, packs spéciaux et GP */
    packsToOpen(state) {
      if (!state.status) return 0
      return state.status.available + (state.status.bonus ?? 0) + (state.status.special ?? 0) + this.gpPacksToOpen
    },
    /** Pronostics notés dont les gains attendent */
    predictionsReady: (state) => state.status?.predictions_ready ?? 0,
    /** Quêtes terminées dont la récompense attend */
    questsReady: (state) => state.status?.quests_ready ?? 0,
    /** Pastille du menu : packs à ouvrir et récompenses de quêtes (3 packs offerts à un nouveau visiteur) */
    packBadge(state) {
      if (!state.status) return state.noSession ? 3 : 0
      return this.packsToOpen + this.questsReady
    },
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
      // Session existante : profil pour le menu du compte (avatar, pseudo, demandes d'amis)
      if (status && !this.profile) this.profile = await fetchMyProfile().catch(() => null)
      return Boolean(status)
    },

    async init() {
      if (!this.configured || this.loading) return
      this.loading = true
      this.error = null
      try {
        const [, status, mine, profile, user, claimed, editions] = await Promise.all([
          this.loadCatalog(),
          fetchPackStatus(),
          fetchMyCards(),
          fetchMyProfile(),
          currentUser(),
          fetchMyAlbums(),
          fetchMyEditions().catch(() => []),
        ])
        this.editions = editions
        this.claimedAlbums = claimed
        this.setStatus(status)
        this.owned = mine.owned
        this.finishes = mine.finishes
        this.obtained = mine.obtained
        this.profile = profile
        this.email = user?.is_anonymous ? null : user?.email ?? null
        this.ready = true
        // Profil public sans écurie : on reprend l'écurie favorite choisie dans l'app
        const favorite = usePrefsStore().favoriteTeamId
        if (this.isPlayer && !profile.team && favorite) this.setTeam(favorite).catch(() => {})
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
      this.obtained = new Map()
      this.claimedAlbums = new Set()
      this.ready = false
      this.status = null
      this.profile = null
      this.friends = null
      this.quests = null
      this.predictions = null
      this.editions = []
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

    /** Nouvelles cartes : obtenues maintenant (tri « plus récentes ») */
    markObtained(ids) {
      if (!ids.length) return
      const obtained = new Map(this.obtained)
      ids.forEach((id) => obtained.has(id) || obtained.set(id, Date.now()))
      this.obtained = obtained
    },

    async setAvatar(cardId) {
      this.profile = await saveAvatar(cardId)
    },

    async setTitle(albumId) {
      this.profile = await saveTitle(albumId)
    },

    async setTeam(teamId) {
      this.profile = await saveTeam(teamId)
    },

    async loadQuests() {
      const { status, ...quests } = await fetchQuests()
      this.quests = quests
      this.setStatus(status)
      return quests
    },

    /** Après une action du jeu : les quêtes affichées ont pu avancer */
    refreshQuests() {
      if (this.quests) this.loadQuests().catch(() => {})
    },

    /** Récupère la récompense d'une quête ; renvoie { reward, bonus } */
    async claimQuest(slot) {
      const { status, reward, bonus, ...quests } = await claimQuest(slot)
      this.quests = quests
      this.setStatus(status)
      return { reward, bonus }
    },

    /** Utilise un code promo ; renvoie { coins, packs } ou lève une erreur avec son code */
    async redeemCode(code) {
      const res = await redeemCode(code)
      if (res.error) throw Object.assign(new Error(res.error), { code: res.error })
      this.setStatus(res.status)
      return { coins: res.coins, packs: res.packs }
    },

    async rerollQuest(slot) {
      const { status, ...quests } = await rerollQuest(slot)
      this.quests = quests
      this.setStatus(status)
    },

    async loadPredictions() {
      const { status, ...predictions } = await fetchPredictions()
      this.predictions = predictions
      this.setStatus(status)
      return predictions
    },

    async savePrediction(season, round, picks) {
      const { status, ...predictions } = await savePrediction(season, round, picks)
      this.predictions = predictions
      this.setStatus(status)
    },

    /** Récupère les gains d'un pronostic ; renvoie { coins, packs, edition } (edition : carte du catalogue) */
    async claimPrediction(season, round) {
      const { coins, packs, edition, predictions } = await claimPrediction(season, round)
      const { status, ...rest } = predictions
      this.predictions = rest
      this.setStatus(status)
      let card = null
      if (edition) {
        await this.loadCatalog()
        this.addEdition(edition)
        card = { ...this.addCard(edition), edition }
        this.refreshQuests()
      }
      return { coins, packs, edition: card }
    },

    /** Mémorise une édition vainqueur obtenue */
    addEdition({ id, season, round, name }) {
      if (this.editions.some((e) => e.season === season && e.round === round)) return
      this.editions = [{ season, round, card_id: id, name, obtained_at: new Date().toISOString() }, ...this.editions]
    },

    async buyGpPack() {
      this.setStatus((await buyGpPack()).status)
    },

    async loadFriends() {
      this.friends = await fetchFriends()
      return this.friends
    },

    /** Ajoute, accepte, refuse ou retire un ami ; renvoie la nouvelle relation */
    async friendAction(action, username) {
      const status =
        action === 'add' ? await sendFriendRequest(username)
        : action === 'accept' ? await respondFriendRequest(username, true)
        : action === 'decline' ? await respondFriendRequest(username, false)
        : await removeFriend(username)
      if (this.friends || action === 'accept' || action === 'decline') await this.loadFriends()
      return status
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
      if (card.is_new) this.markObtained([card.id])
      return { ...this.byId.get(card.id), isNew: card.is_new }
    },

    async recycle(cardId, qty = 1) {
      const res = await recycleCard(cardId, qty)
      this.applyCounts(res.cards)
      this.setStatus(res.status)
      this.refreshQuests()
      return res.gained
    },

    async recycleAll(keep = 1, rarities = null) {
      const res = await recycleDuplicates(keep, rarities)
      this.applyCounts(res.cards)
      this.setStatus(res.status)
      this.refreshQuests()
      return res.gained
    },

    async buyPack() {
      this.setStatus((await buyPack()).status)
    },

    async craft(cardId) {
      const res = await craftCard(cardId)
      this.setStatus(res.status)
      this.refreshQuests()
      return this.addCard(res.card)
    },

    async tradeUp(rarity) {
      await this.loadCatalog()
      const res = await tradeUp(rarity)
      this.applyCounts(res.cards)
      this.setStatus(res.status)
      this.refreshQuests()
      return this.addCard(res.card)
    },

    async upgrade(cardId) {
      const res = await upgradeCard(cardId)
      this.applyCounts([res])
      const finishes = new Map(this.finishes)
      finishes.set(cardId, res.finish)
      this.finishes = finishes
      // La finition fait avancer les quêtes : l'état (récompenses en attente) est relu
      this.refreshStatus().catch(() => {})
      this.refreshQuests()
      return res.finish
    },

    /** Récupère la récompense d'un album complet ; renvoie les Pièces gagnées */
    async claimAlbum(albumId) {
      const res = await claimAlbum(albumId)
      this.setStatus(res.status)
      this.claimedAlbums = new Set([...this.claimedAlbums, albumId])
      return res.reward
    },

    /**
     * Ouvre un pack (`gp` : pack du week-end de course) ; renvoie les cartes du catalogue,
     * de la moins rare à la plus rare, l'édition vainqueur en dernier.
     * `source` du pack ouvert sur le tableau renvoyé (special, regular, bonus, gp_free, gp).
     */
    async open(gp = false) {
      await this.loadCatalog()
      const { cards, status, source } = await openPack(gp)
      this.setStatus(status)
      this.refreshQuests()
      const owned = new Map(this.owned)
      const drawn = cards.map((c) => {
        owned.set(c.id, (owned.get(c.id) ?? 0) + 1)
        if (c.edition) this.addEdition({ id: c.id, ...c.edition })
        return { ...this.byId.get(c.id), isNew: c.is_new, edition: c.edition ?? null, circuitCard: c.circuit }
      })
      this.owned = owned
      this.markObtained(cards.filter((c) => c.is_new).map((c) => c.id))
      // Suspense : la carte la plus rare est révélée en dernier, l'édition vainqueur tout à la fin
      const rank = (c) => (c.edition ? 99 : RARITY_RANK[c.rarity])
      return Object.assign(drawn.sort((a, b) => rank(a) - rank(b)), { source })
    },
  },
})
