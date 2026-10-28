/**
 * Collection de cartes : session anonyme Supabase et appels aux fonctions serveur.
 * L'ouverture des packs et le décompte des packs disponibles sont entièrement
 * calculés côté base de données (voir supabase/migrations).
 */
import { supabase } from '@/lib/supabase'

export const isCollectionConfigured = Boolean(supabase)

let sessionPromise = null

async function resolveSession() {
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    // La session stockée peut viser un compte qui n'existe plus (supprimé, invité nettoyé)
    const { data: check, error } = await supabase.auth.getUser()
    if (!error && check.user) return check.user
    await supabase.auth.signOut({ scope: 'local' })
  }
  const { data: signIn, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return signIn.user
}

/**
 * Session valide : celle du navigateur si son compte existe toujours, sinon une
 * nouvelle session invité (aucun compte à créer). Partagée entre les appels
 * simultanés pour ne pas créer plusieurs invités au chargement de la page.
 */
export function ensureSession() {
  if (!supabase) return Promise.reject(new Error('Supabase non configuré'))
  sessionPromise ??= resolveSession().catch((err) => {
    sessionPromise = null
    throw err
  })
  return sessionPromise
}

/** À appeler après une connexion / déconnexion : la session sera revérifiée */
export function resetSession() {
  sessionPromise = null
}

/** { available, max, next_at, pity_left, packs_opened, server_now } */
export async function fetchPackStatus() {
  await ensureSession()
  const { data, error } = await supabase.rpc('pack_status')
  if (error) throw error
  return data
}

/**
 * Réserve de packs sans créer de session : null si le visiteur n'a jamais ouvert
 * l'onglet Cartes (pas de compte invité créé juste pour afficher l'accueil).
 */
export async function peekPackStatus() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  if (!data.session) return null
  return fetchPackStatus()
}

/**
 * { cards: [{ id, rarity, is_new }], source, status } — erreur `NO_PACK` si aucun pack.
 * `source` : special (Épique garantie), regular (réserve rechargée) ou bonus.
 */
export async function openPack() {
  await ensureSession()
  const { data, error } = await supabase.rpc('open_pack')
  if (error) throw toError(error)
  return data
}

// ---------------------------------------------------------------------------
// Compte : code à 6 chiffres envoyé par email (sans mot de passe)
// ---------------------------------------------------------------------------

/** Erreur Supabase → Error avec un code applicatif (hint SQL ou code auth) */
function toError(error) {
  const err = new Error(error.message)
  err.code = error.hint || error.code
  return err
}

export async function currentUser() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}

/** Relie la session invité à un email : la collection est conservée telle quelle */
export async function linkEmail(email) {
  const { error } = await supabase.auth.updateUser({ email })
  if (error) throw toError(error)
}

export async function verifyLinkCode(email, token) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email_change' })
  if (error) throw toError(error)
  // Nouveau jeton : le compte n'est plus marqué anonyme côté serveur
  await supabase.auth.refreshSession()
}

/** Connexion à un compte existant (autre appareil) */
export async function sendLoginCode(email) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
  if (error) throw toError(error)
}

export async function verifyLoginCode(email, token) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw toError(error)
}

export async function signOut() {
  await supabase.auth.signOut()
}

export function onAuthChange(callback) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session))
  return () => data.subscription.unsubscribe()
}

// ---------------------------------------------------------------------------
// Profil, vitrine et joueurs
// ---------------------------------------------------------------------------

async function rpc(name, params) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.rpc(name, params)
  if (error) throw toError(error)
  return data
}

/** { username, showcase, avatar, title, team, permanent, requests } */
export async function fetchMyProfile() {
  await ensureSession()
  return rpc('my_profile')
}

export const saveUsername = (username) => rpc('set_username', { p_username: username })
export const saveShowcase = (cardIds) => rpc('set_showcase', { p_cards: cardIds })
/** Avatar (carte possédée), titre (album complété) et écurie : null pour retirer */
export const saveAvatar = (cardId) => rpc('set_avatar', { p_card: cardId })
export const saveTitle = (albumId) => rpc('set_title', { p_album: albumId })
export const saveTeam = (teamId) => rpc('set_team', { p_team: teamId })

/**
 * Classement (recherche par début de pseudo), général ou entre amis :
 * [{ rank, username, owned, score, showcase, avatar, avatar_finish, title, team }]
 */
export function fetchLeaderboard(query = '', offset = 0, limit = 50, friends = false) {
  return rpc('leaderboard', { p_query: query || null, p_limit: limit, p_offset: offset, p_friends: friends })
}

// ---------------------------------------------------------------------------
// Amis : chaque fonction renvoie la nouvelle relation (friends, outgoing, none)
// ---------------------------------------------------------------------------

/** { friends: [joueur], incoming: [joueur], outgoing: [joueur] } */
export async function fetchFriends() {
  await ensureSession()
  return rpc('my_friends')
}

export const sendFriendRequest = (username) => rpc('send_friend_request', { p_username: username })
export const respondFriendRequest = (username, accept) =>
  rpc('respond_friend_request', { p_username: username, p_accept: accept })
export const removeFriend = (username) => rpc('remove_friend', { p_username: username })

/** Profil public, ou null si le pseudo n'existe pas */
export function fetchPlayer(username) {
  return rpc('get_player', { p_username: username })
}

/** Cartes possédées : { owned: Map(card_id → count), finishes: Map(card_id → 1 Chrome | 2 Or) } */
export async function fetchMyCards() {
  await ensureSession()
  const owned = new Map()
  const finishes = new Map()
  // Pagination (PostgREST renvoie 1000 lignes max par requête)
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('user_cards')
      .select('card_id, count, finish')
      .range(from, from + 999)
    if (error) throw error
    data.forEach((row) => {
      owned.set(row.card_id, row.count)
      if (row.finish) finishes.set(row.card_id, row.finish)
    })
    if (data.length < 1000) break
  }
  return { owned, finishes }
}

// ---------------------------------------------------------------------------
// Doublons : recyclage, boutique, atelier, vitesse supérieure, finitions.
// Les réponses contiennent `cards: [{ id, count }]` (nouveaux nombres d'exemplaires) et `status`.
// ---------------------------------------------------------------------------

export const recycleCard = (cardId, qty = 1) => rpc('recycle_card', { p_card: cardId, p_qty: qty })
export const recycleDuplicates = (keep = 1, rarities = null) =>
  rpc('recycle_duplicates', { p_keep: keep, p_rarities: rarities })
export const buyPack = () => rpc('buy_pack')
/** { card: { id, rarity, is_new }, status } */
export const craftCard = (cardId) => rpc('craft_card', { p_card: cardId })
/** { card: { id, rarity, is_new }, cards, status } */
export const tradeUp = (rarity) => rpc('trade_up', { p_rarity: rarity })
/** { id, count, finish } */
export const upgradeCard = (cardId) => rpc('upgrade_card', { p_card: cardId })

// ---------------------------------------------------------------------------
// Quêtes du jour : { day, resets_at, reroll_available, streak, bonus_claimed, quests, status }
// ---------------------------------------------------------------------------

export async function fetchQuests() {
  await ensureSession()
  return rpc('my_quests')
}

/** Même réponse, avec `reward` ({ coins, packs }) et `bonus` (4 quêtes terminées, ou null) */
export const claimQuest = (slot) => rpc('claim_quest', { p_slot: slot })
export const rerollQuest = (slot) => rpc('reroll_quest', { p_slot: slot })

/** Albums dont la récompense a été récupérée : Set(album_id) */
export async function fetchMyAlbums() {
  await ensureSession()
  const { data, error } = await supabase.from('user_albums').select('album_id')
  if (error) throw error
  return new Set(data.map((row) => row.album_id))
}

/** { reward, status } — erreurs `ALBUM_INCOMPLETE`, `ALBUM_CLAIMED` */
export const claimAlbum = (albumId) => rpc('claim_album', { p_album: albumId })
