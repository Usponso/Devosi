<template>
  <div class="page trades-page">
    <header class="container page-head">
      <div class="eyebrow">{{ $t('common.cardsSection') }}</div>
      <h1 class="title-lg">{{ $t('trades.title') }}</h1>
      <p class="dim">{{ $t('trades.intro') }}</p>
    </header>

    <div class="container body">
      <p v-if="!col.configured" class="card empty">{{ $t('common.notConfigured') }}</p>
      <p v-else-if="!col.ready" class="card empty muted">{{ $t('common.loading') }}</p>

      <!-- Invité ou sans pseudo : les échanges sont entre amis -->
      <section v-else-if="!col.isPlayer" class="card empty invite">
        <Icon name="swap" :size="28" />
        <p>{{ $t('trades.invite') }}</p>
        <router-link to="/profil" class="btn">{{ $t('trades.createProfile') }}</router-link>
      </section>

      <template v-else>
        <!-- Échange conclu -->
        <section v-if="done" class="card done">
          <div class="title-md">{{ $t('trades.doneWith', { user: done.other }) }}</div>
          <div class="done-cards">
            <F1Card v-for="c in done.cards" :key="c.id" :card="c" :is-new="c.isNew" class="done-card" />
          </div>
          <div class="done-actions">
            <router-link to="/collection" class="btn btn-ghost">{{ $t('trades.seeCollection') }}</router-link>
            <button class="link-arrow" @click="done = null">{{ $t('common.close') }}</button>
          </div>
        </section>

        <!-- Nouvel échange : choix de l'ami puis des cartes -->
        <TradeComposer v-if="friend" :friend="friend" @close="closeComposer" @sent="onSent" />
        <section v-else-if="picking" class="card pick-friend">
          <div class="pf-head">
            <h2 class="title-md">{{ $t('trades.whichFriend') }}</h2>
            <button class="link-arrow" @click="picking = false">{{ $t('common.cancel') }}</button>
          </div>
          <p v-if="!col.friends" class="muted small">{{ $t('common.loading') }}</p>
          <p v-else-if="!col.friends.friends.length" class="muted small">
            <i18n-t keypath="trades.addFriends" scope="global"><template #link><router-link to="/joueurs" class="link-arrow">{{ $t('trades.playersLink') }}</router-link></template></i18n-t>
          </p>
          <div v-else class="friends">
            <button v-for="f in col.friends.friends" :key="f.username" class="friend" @click="openComposer(f.username)">
              <PlayerAvatar :card-id="f.avatar" :finish="f.avatar_finish" :username="f.username" :team="f.team" :size="36" />
              <span>{{ f.username }}</span>
            </button>
          </div>
        </section>

        <!-- Propositions -->
        <section v-if="!friend" class="card list">
          <div class="list-head">
            <div class="tabs" role="tablist">
              <button v-for="t in TABS" :key="t.id" role="tab" :aria-selected="tab === t.id" :class="{ on: tab === t.id }" @click="tab = t.id">
                {{ t.label }}<span v-if="t.id !== 'history' && counts[t.id]" class="mono tab-count">{{ counts[t.id] }}</span>
              </button>
            </div>
            <div class="list-tools">
              <span v-if="col.trades" class="muted small">{{ $t('trades.today', { n: col.trades.today, max: col.trades.daily }) }}</span>
              <button v-if="!picking" class="btn" @click="startPicking"><Icon name="plus" :size="15" /> {{ $t('trades.new') }}</button>
            </div>
          </div>

          <p v-if="error" class="error small">{{ error }}</p>
          <p v-if="!col.trades" class="muted small">{{ $t('common.loading') }}</p>
          <p v-else-if="!shown.length" class="muted small empty-list">{{ $t(`trades.empty.${tab}`) }}</p>

          <ul v-else class="items">
            <li v-for="t in shown" :key="t.id" class="item" :class="`st-${t.status}`">
              <div class="it-head">
                <router-link :to="`/joueurs/${t.other}`" class="who">
                  <PlayerAvatar :card-id="t.other_avatar" :username="t.other" :team="t.other_team" :size="30" />
                  <span>
                    <b>{{ t.direction === 'received' ? $t('trades.offersYou', { user: t.other }) : $t('trades.offeredTo', { user: t.other }) }}</b>
                    <span class="muted small when">{{ whenLabel(t) }}</span>
                  </span>
                </router-link>
                <span v-if="t.status !== 'pending'" class="status">{{ $t(`trades.status.${t.status}`) }}</span>
              </div>

              <div class="it-cards">
                <div class="it-side">
                  <div class="muted small">{{ t.direction === 'received' ? $t('trades.youGet') : $t('trades.youAsk') }}</div>
                  <div class="mini-cards">
                    <div v-for="c in cardsOf(t.direction === 'received' ? t.give : t.take)" :key="c.id" class="mini-wrap">
                      <F1Card :card="c" :interactive="false" class="mini" />
                      <!-- Ce que j'en ai déjà (échanges en attente seulement) -->
                      <template v-if="t.status === 'pending'">
                        <span v-if="!col.owned.has(c.id)" class="mini-badge new">{{ $t('trades.newBadge') }}</span>
                        <span v-else class="mini-badge mono">×{{ col.owned.get(c.id) }}</span>
                      </template>
                    </div>
                  </div>
                </div>
                <Icon name="swap" :size="20" class="arrow" />
                <div class="it-side">
                  <div class="muted small">{{ $t('trades.youGive') }}</div>
                  <div class="mini-cards">
                    <div v-for="c in cardsOf(t.direction === 'received' ? t.take : t.give)" :key="c.id" class="mini-wrap">
                      <F1Card :card="c" :interactive="false" class="mini" />
                      <!-- Mes exemplaires de la carte donnée : doublon ou dernier -->
                      <template v-if="t.status === 'pending'">
                        <span v-if="(col.owned.get(c.id) ?? 0) <= 1" class="mini-badge last">{{ $t('trades.last') }}</span>
                        <span v-else class="mini-badge mono">×{{ col.owned.get(c.id) }}</span>
                      </template>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="t.status === 'pending'" class="it-foot">
                <span class="muted small">{{ t.direction === 'received' ? impact(t) : '' }}</span>
                <div class="it-actions">
                  <template v-if="t.direction === 'received'">
                    <button class="btn btn-ghost" :disabled="busy" @click="respond(t, false)">{{ $t('friend.decline') }}</button>
                    <button class="btn" :disabled="busy" @click="respond(t, true)">{{ $t('friend.accept') }}</button>
                  </template>
                  <button v-else class="btn btn-ghost" :disabled="busy" @click="cancel(t)">{{ $t('common.cancel') }}</button>
                </div>
              </div>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { intlLocale } from '@/i18n'
import Icon from '@/components/Icon.vue'
import F1Card from '@/components/cards/F1Card.vue'
import PlayerAvatar from '@/components/cards/PlayerAvatar.vue'
import TradeComposer from '@/components/cards/TradeComposer.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { economyMessage } from '@/utils/cards'

const { t: tr } = useI18n()
const TABS = ['received', 'sent', 'history'].map((id) => ({ id, label: tr(`trades.tabs.${id}`) }))

const col = useCollectionStore()
const route = useRoute()
const router = useRouter()

const tab = ref('received')
const busy = ref(false)
const error = ref('')
const done = ref(null)

const trades = computed(() => col.trades?.trades ?? [])
const pending = (dir) => trades.value.filter((t) => t.status === 'pending' && t.direction === dir)
const counts = computed(() => ({ received: pending('received').length, sent: pending('sent').length }))
const shown = computed(() =>
  tab.value === 'history' ? trades.value.filter((t) => t.status !== 'pending') : pending(tab.value),
)

const cardsOf = (ids) => ids.map((id) => col.byId.get(id)).filter(Boolean)

/** Ce que l'échange change pour moi : cartes nouvelles, derniers exemplaires donnés */
function impact(t) {
  const fresh = t.give.filter((id) => !col.owned.has(id)).length
  const last = t.take.filter((id) => col.owned.get(id) === 1).length
  const parts = []
  if (fresh) parts.push(tr('trades.fresh', fresh))
  if (last) parts.push(tr('trades.lastGiven', last))
  return parts.join(' · ')
}

function whenLabel(t) {
  if (t.status !== 'pending') return new Date(t.resolved_at).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short' })
  const h = Math.max(0, Math.round((new Date(t.expires_at).getTime() - Date.now()) / 3600000))
  return tr('trades.expires', { n: h })
}

// Composer : depuis « Nouvel échange » ou un profil (?avec=pseudo)
const friend = ref(null)
const picking = ref(false)

function startPicking() {
  picking.value = true
  col.loadFriends().catch(() => {})
}

function openComposer(name) {
  picking.value = false
  friend.value = name
  router.replace({ query: { avec: name } })
}

function closeComposer() {
  friend.value = null
  router.replace({ query: {} })
}

function onSent() {
  closeComposer()
  tab.value = 'sent'
}

watch(
  () => route.query.avec,
  (name) => (friend.value = typeof name === 'string' && name ? name : null),
  { immediate: true },
)

async function respond(t, accept) {
  busy.value = true
  error.value = ''
  try {
    const cards = await col.respondTrade(t.id, accept)
    if (accept) done.value = { other: t.other, cards }
  } catch (err) {
    error.value = economyMessage(err)
  } finally {
    busy.value = false
  }
}

async function cancel(t) {
  busy.value = true
  error.value = ''
  try {
    await col.cancelTrade(t.id)
  } catch (err) {
    error.value = economyMessage(err)
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  if (!col.ready) await col.init()
  if (col.isPlayer) col.loadTrades().catch(() => (error.value = tr('trades.loadError')))
})
</script>

<style scoped>
.page-head { padding-top: 32px; padding-bottom: 20px; }
.page-head .title-lg { margin: 6px 0 6px; }

.body { display: flex; flex-direction: column; gap: 18px; }
.empty { padding: 24px; }
.small { font-size: 13px; }
.error { color: var(--danger); }

.invite { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; max-width: 560px; }
.invite > .icon { color: var(--accent); }
.invite p { margin: 0; }

.done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 22px;
  text-align: center;
  border-color: rgb(232 193 90 / 0.4);
}

.done-cards { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
.done-card { width: 110px; }
.done-actions { display: flex; align-items: center; gap: 16px; }

.pick-friend { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.pf-head { display: flex; justify-content: space-between; align-items: center; }
.pf-head .title-md { margin: 0; }
.friends { display: flex; flex-wrap: wrap; gap: 8px; }

.friend {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  border-radius: 99px;
  font: inherit;
  font-weight: 700;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--line);
  cursor: pointer;
}

.friend:hover { border-color: var(--accent-line); }

.list { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.list-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.list-tools { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }

.tabs {
  display: inline-flex;
  padding: 3px;
  border-radius: 99px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.tabs button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 99px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
}

.tabs button.on { color: var(--on-accent); background: var(--accent); }
.tab-count { font-size: 11px; opacity: 0.85; }
.empty-list { padding: 12px 0; }

.items { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 12px; }

.item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.item.st-accepted { border-color: color-mix(in srgb, var(--success) 35%, transparent); }
.item:not(.st-pending):not(.st-accepted) { opacity: 0.7; }

.it-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.who { display: flex; align-items: center; gap: 10px; color: var(--text); }
.who > span { display: flex; flex-direction: column; }
.when { font-size: 12px; }
.status { font-size: 12px; font-weight: 700; color: var(--text-dim); }
.st-accepted .status { color: var(--success); }

.it-cards { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; }
.it-side { display: flex; flex-direction: column; gap: 6px; }
.mini-cards { display: flex; flex-wrap: wrap; gap: 6px; }
.mini { width: 64px; }
.mini-wrap { position: relative; }

/* Exemplaires que je possède : doublon (×N), nouvelle carte ou dernier exemplaire donné */
.mini-badge {
  position: absolute;
  left: 50%;
  bottom: -7px;
  z-index: 2;
  transform: translateX(-50%);
  padding: 1px 7px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  color: #fff;
  background: rgb(0 0 0 / 0.8);
  border: 1px solid var(--line-strong);
}

.mini-badge.new { background: var(--accent); color: var(--on-accent); border-color: transparent; }
.mini-badge.last { color: #2a1c00; background: #e8c15a; border-color: transparent; }
.arrow { color: var(--text-muted); }

.it-foot { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.it-actions { display: flex; gap: 8px; }
.btn:disabled { opacity: 0.55; cursor: default; }

@media (max-width: 640px) {
  .list, .pick-friend { padding: 16px; }
  .mini { width: 56px; }
}
</style>
