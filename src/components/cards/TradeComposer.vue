<template>
  <section class="composer card">
    <div class="cp-head">
      <div class="cp-who">
        <Icon name="swap" :size="20" />
        <div>
          <h2 class="title-md">Échange avec {{ friend }}</h2>
          <p class="muted small">1 à 5 cartes de chaque côté, sans Pièces. Ton ami a 48 h pour répondre.</p>
        </div>
      </div>
      <button class="link-arrow" @click="$emit('close')">Annuler</button>
    </div>

    <p v-if="loadError" class="error small">{{ loadError }}</p>

    <div class="sides">
      <!-- Ce que je donne -->
      <div class="side">
        <div class="side-head">
          <span class="side-title">Je donne</span>
          <span class="muted small mono">{{ give.length }} / {{ MAX }}</span>
        </div>
        <div class="picked">
          <button v-for="c in giveCards" :key="c.id" class="picked-card" :aria-label="`Retirer ${c.name}`" @click="toggle(give, c.id)">
            <F1Card :card="c" :interactive="false" :zoomable="false" />
            <span class="remove"><Icon name="x" :size="12" /></span>
          </button>
          <span v-for="i in MAX - give.length" :key="`g${i}`" class="slot"></span>
        </div>
        <p v-if="lastCopies.length" class="warn small">
          <Icon name="star" :size="13" /> Dernier exemplaire : {{ lastCopies.map((c) => c.name).join(', ') }}
        </p>
        <CardPicker v-model:query="myQuery" v-model:type="myType" :cards="myPool" :selected="give" :limit="myLimit" note="Ma collection · doublons d'abord" @pick="(id) => toggle(give, id)" @more="myLimit += 40">
          <template #badge="{ card }">
            <span class="count mono">×{{ col.owned.get(card.id) }}</span>
          </template>
        </CardPicker>
      </div>

      <!-- Ce que je demande -->
      <div class="side">
        <div class="side-head">
          <span class="side-title">Je demande</span>
          <span class="muted small mono">{{ take.length }} / {{ MAX }}</span>
        </div>
        <div class="picked">
          <button v-for="c in takeCards" :key="c.id" class="picked-card" :aria-label="`Retirer ${c.name}`" @click="toggle(take, c.id)">
            <F1Card :card="c" :interactive="false" :zoomable="false" />
            <span class="remove"><Icon name="x" :size="12" /></span>
          </button>
          <span v-for="i in MAX - take.length" :key="`t${i}`" class="slot"></span>
        </div>
        <p v-if="!theirCards" class="muted small">Chargement de sa collection…</p>
        <CardPicker v-else v-model:query="theirQuery" v-model:type="theirType" :cards="theirPool" :selected="take" :limit="theirLimit" note="Sa collection · celles qui te manquent d'abord" @pick="(id) => toggle(take, id)" @more="theirLimit += 40">
          <template #badge="{ card }">
            <span v-if="!col.owned.has(card.id)" class="count new">Il te la manque</span>
          </template>
        </CardPicker>
        <p class="muted small">Les éditions vainqueur ne s'échangent pas.</p>
      </div>
    </div>

    <div class="cp-foot">
      <span class="muted small">
        <template v-if="col.trades">{{ col.trades.pending_sent }} proposition{{ col.trades.pending_sent > 1 ? 's' : '' }} en attente sur {{ col.trades.max_pending }}</template>
      </span>
      <button class="btn" :disabled="sending || !give.length || !take.length" @click="send">
        <Icon name="swap" :size="16" /> {{ sending ? 'Envoi…' : 'Envoyer la proposition' }}
      </button>
    </div>
    <p v-if="message" class="small" :class="messageError ? 'error' : 'success'">{{ message }}</p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import F1Card from '@/components/cards/F1Card.vue'
import CardPicker from '@/components/cards/CardPicker.vue'
import { RARITY_RANK, useCollectionStore } from '@/stores/collectionStore'
import { fetchFriendCards } from '@/services/collection'
import { economyMessage } from '@/utils/cards'

/** Proposition d'échange à un ami : cartes données et demandées */
const props = defineProps({ friend: { type: String, required: true } })
const emit = defineEmits(['close', 'sent'])

const MAX = 5
const col = useCollectionStore()

const give = ref([])
const take = ref([])
const giveCards = computed(() => give.value.map((id) => col.byId.get(id)).filter(Boolean))
const takeCards = computed(() => take.value.map((id) => col.byId.get(id)).filter(Boolean))
const lastCopies = computed(() => giveCards.value.filter((c) => col.owned.get(c.id) === 1))

/** Ajoute ou retire une carte (`list` : le tableau give ou take, déjà déballé par le gabarit) */
function toggle(list, id) {
  const i = list.indexOf(id)
  if (i >= 0) list.splice(i, 1)
  else if (list.length < MAX) list.push(id)
}

// Ma collection : doublons d'abord, puis les plus rares (jamais d'édition)
const myQuery = ref('')
const myType = ref('all')
const myLimit = ref(40)
const myPool = computed(() =>
  col.cards
    .filter((c) => !c.edition && col.owned.has(c.id))
    .sort((a, b) => col.owned.get(b.id) - col.owned.get(a.id) || RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity]),
)

// Sa collection : celles qui me manquent d'abord, puis les plus rares
const theirCards = ref(null)
const theirQuery = ref('')
const theirType = ref('all')
const theirLimit = ref(40)
const loadError = ref('')
const theirPool = computed(() =>
  (theirCards.value ?? [])
    .map((row) => col.byId.get(row.id))
    .filter((c) => c && !c.edition)
    .sort((a, b) => col.owned.has(a.id) - col.owned.has(b.id) || RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity]),
)

watch(
  () => props.friend,
  async (name) => {
    give.value = []
    take.value = []
    theirCards.value = null
    loadError.value = ''
    try {
      await col.loadCatalog()
      theirCards.value = await fetchFriendCards(name)
    } catch (err) {
      loadError.value = economyMessage(err)
      theirCards.value = []
    }
  },
  { immediate: true },
)

const sending = ref(false)
const message = ref('')
const messageError = ref(false)

async function send() {
  sending.value = true
  message.value = ''
  messageError.value = false
  try {
    await col.proposeTrade(props.friend, [...give.value], [...take.value])
    emit('sent')
  } catch (err) {
    messageError.value = true
    message.value = economyMessage(err)
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.composer { display: flex; flex-direction: column; gap: 16px; padding: 20px 22px; }

.cp-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.cp-who { display: flex; align-items: center; gap: 12px; }
.cp-who > .icon { color: var(--accent); flex-shrink: 0; }
.cp-who .title-md { margin: 0; }
.cp-who p { margin: 2px 0 0; }

.sides {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: 16px;
  align-items: start;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 14px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.side-head { display: flex; justify-content: space-between; align-items: baseline; }
.side-title { font-weight: 800; }

.picked { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }

.picked-card {
  position: relative;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.remove {
  position: absolute;
  top: -5px;
  right: -5px;
  z-index: 2;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--text);
  background: var(--surface-3);
  border: 1px solid var(--line-strong);
}

.picked-card:hover .remove { background: var(--danger); color: #fff; }

.slot { aspect-ratio: 5 / 7; border-radius: 6px; border: 1.5px dashed var(--line-strong); }

.warn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 4px 10px;
  border-radius: 8px;
  color: #ffd65a;
  background: rgb(232 193 90 / 0.12);
}

.count {
  position: absolute;
  top: 3px;
  left: 3px;
  z-index: 2;
  padding: 0 5px;
  border-radius: 99px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: rgb(0 0 0 / 0.7);
}

.count.new { background: var(--accent); color: var(--on-accent); }

.cp-foot { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.btn:disabled { opacity: 0.55; cursor: default; }
.small { font-size: 13px; }
.error { color: var(--danger); margin: 0; }
.success { color: var(--success); margin: 0; }

@media (max-width: 640px) {
  .composer { padding: 16px; }
}
</style>
