<template>
  <div class="picker">
    <div class="pk-filters">
      <div class="chips">
        <button v-for="t in TYPES" :key="t.id" class="chip" :class="{ on: type === t.id }" @click="$emit('update:type', t.id)">{{ t.label }}</button>
      </div>
      <input
        :value="query"
        class="input"
        type="search"
        placeholder="Rechercher"
        aria-label="Rechercher une carte"
        @input="$emit('update:query', $event.target.value)"
      />
    </div>
    <p class="muted small note">{{ note }}</p>
    <div class="pk-grid">
      <button
        v-for="c in shown"
        :key="c.id"
        class="pk-card"
        :class="{ selected: selected.includes(c.id) }"
        :aria-pressed="selected.includes(c.id)"
        :aria-label="c.name"
        @click="$emit('pick', c.id)"
      >
        <F1Card :card="c" :interactive="false" :zoomable="false" />
        <slot name="badge" :card="c" />
      </button>
    </div>
    <p v-if="!filtered.length" class="muted small">Aucune carte.</p>
    <button v-if="filtered.length > limit" class="btn btn-ghost more" @click="$emit('more')">Afficher plus</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import F1Card from '@/components/cards/F1Card.vue'

/** Grille de cartes à choisir, avec recherche et filtre par type (cartes déjà triées) */
const props = defineProps({
  cards: { type: Array, required: true },
  selected: { type: Array, required: true },
  query: { type: String, default: '' },
  type: { type: String, default: 'all' },
  limit: { type: Number, default: 40 },
  note: { type: String, default: '' },
})
defineEmits(['pick', 'more', 'update:query', 'update:type'])

const TYPES = [
  { id: 'all', label: 'Toutes' },
  { id: 'driver', label: 'Pilotes' },
  { id: 'team', label: 'Écuries' },
  { id: 'gp', label: 'GP' },
  { id: 'moment', label: 'Moments' },
]

const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const filtered = computed(() => {
  const q = normalize(props.query.trim())
  return props.cards.filter(
    (c) => (props.type === 'all' || c.type === props.type) && (!q || normalize(`${c.name} ${c.sub ?? ''} ${c.years?.[0] ?? ''}`).includes(q)),
  )
})
const shown = computed(() => filtered.value.slice(0, props.limit))
</script>

<style scoped>
.picker { display: flex; flex-direction: column; gap: 8px; }

.pk-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }

.chip {
  padding: 4px 10px;
  border-radius: 99px;
  border: 1px solid var(--line);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  background: var(--surface);
  cursor: pointer;
}

.chip.on { color: var(--on-accent); background: var(--accent); border-color: var(--accent); }

.input {
  flex: 1;
  min-width: 120px;
  padding: 6px 10px;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--line);
}

.note { margin: 0; font-size: 12px; }

.pk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
  gap: 8px;
  max-height: 340px;
  overflow-y: auto;
  padding: 4px 2px;
}

.pk-card {
  position: relative;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: none;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
}

.pk-card.selected { outline-color: var(--accent); opacity: 0.5; }
.more { align-self: center; padding: 6px 14px; font-size: 13px; }
.small { font-size: 13px; }
</style>
