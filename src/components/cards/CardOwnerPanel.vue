<template>
  <section class="owner">
    <div class="owned-line">
      <Icon name="album" :size="16" /> Dans ta collection ×{{ copies }}
      <span v-if="finish" class="finish-chip" :class="`f-${finish}`">{{ FINISHES[finish].label }}</span>
    </div>

    <!-- Doublons : finition et recyclage -->
    <div v-if="nextFinish" class="upgrade">
      <div class="upgrade-head">
        <span>Finition <b>{{ nextFinish.label }}</b></span>
        <span class="mono muted">{{ Math.min(copies, nextFinish.copies) }}/{{ nextFinish.copies }}</span>
      </div>
      <span class="meter"><span :class="`f-${nextFinish.id}`" :style="{ width: `${Math.min(1, copies / nextFinish.copies) * 100}%` }"></span></span>
      <button v-if="copies >= nextFinish.copies" class="btn" :disabled="busy" @click="upgrade">
        <Icon name="star" :size="16" /> Améliorer en {{ nextFinish.label }} ({{ nextFinish.copies - 1 }} doublons)
      </button>
    </div>

    <div class="row">
      <button class="btn" :class="{ 'btn-ghost': inShowcase }" :disabled="busy" @click="toggleShowcase">
        <Icon :name="inShowcase ? 'check' : 'star'" :size="16" />
        {{ inShowcase ? 'Retirer de la vitrine' : 'Mettre en vitrine' }}
      </button>
      <button v-if="copies > 1" class="btn btn-ghost" :disabled="busy" @click="recycle(1)">
        <Icon name="recycle" :size="16" /> Recycler 1 · +{{ value.recycle }}
      </button>
      <button v-if="copies > 2" class="btn btn-ghost" :disabled="busy" @click="recycle(copies - 1)">
        <Icon name="recycle" :size="16" /> Recycler les {{ copies - 1 }} doublons · +{{ formatCoins(value.recycle * (copies - 1)) }}
      </button>
    </div>
    <p v-if="message" class="small" :class="error ? 'error' : 'accent'">{{ message }}</p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import { FINISHES, RARITIES, RARITY_VALUE, useCollectionStore } from '@/stores/collectionStore'
import { economyMessage, formatCoins } from '@/utils/cards'

/** Actions sur une carte possédée : finition, recyclage des doublons, vitrine */
const props = defineProps({
  card: { type: Object, required: true },
})

const col = useCollectionStore()
const busy = ref(false)
const message = ref('')
const error = ref(false)

const copies = computed(() => col.owned.get(props.card.id) ?? 0)
const finish = computed(() => col.finishes.get(props.card.id) ?? 0)
const nextFinish = computed(() => FINISHES[finish.value + 1] ?? null)
const value = computed(() => RARITY_VALUE[props.card.rarity] ?? RARITIES[0])
const inShowcase = computed(() => col.showcase.includes(props.card.id))

watch(() => props.card.id, () => (message.value = ''))

async function run(task) {
  busy.value = true
  error.value = false
  message.value = ''
  try {
    message.value = (await task()) ?? ''
  } catch (err) {
    error.value = true
    message.value = err.code === 'SHOWCASE_FULL' ? 'Ta vitrine est pleine : retires-en une carte d’abord.' : economyMessage(err)
  } finally {
    busy.value = false
  }
}

const recycle = (qty) => run(async () => `+${formatCoins(await col.recycle(props.card.id, qty))} Pièces`)
const upgrade = () => run(async () => `Finition ${FINISHES[await col.upgrade(props.card.id)].label} débloquée !`)
const toggleShowcase = () => run(async () => {
  await col.toggleShowcase(props.card.id)
  return inShowcase.value ? 'Ajoutée à ta vitrine.' : 'Retirée de ta vitrine.'
})
</script>

<style scoped>
.owner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.owned-line { display: flex; align-items: center; gap: 8px; font-weight: 700; }

.finish-chip,
.meter .f-1 { background: linear-gradient(90deg, #8e97a2, #ffffff, #8e97a2); }
.finish-chip.f-2,
.meter .f-2 { background: linear-gradient(90deg, #b5850f, #fff0b0, #b5850f); }

.finish-chip {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #111;
}

.upgrade { display: flex; flex-direction: column; gap: 8px; }
.upgrade-head { display: flex; justify-content: space-between; font-size: 14px; }
.upgrade .btn { align-self: flex-start; }
.row { display: flex; flex-wrap: wrap; gap: 8px; }
.btn:disabled { opacity: 0.5; }
.small { font-size: 13px; }
.error { color: var(--danger); }
</style>
