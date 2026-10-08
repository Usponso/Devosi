<template>
  <div class="stints">
    <div class="legend">
      <span v-for="c in usedCompounds" :key="c" class="legend-item">
        <span class="tyre" :style="{ '--tyre': compoundColor(c) }">{{ c[0] }}</span>{{ COMPOUND_FR[c] ?? c }}
      </span>
    </div>

    <div class="rows">
      <div
        v-for="(row, i) in rows"
        :key="row.number"
        class="row"
        :class="{ fav: row.highlight }"
        :style="{ animationDelay: `${i * 30}ms` }"
      >
        <div class="row-label mono">
          <span class="row-pos muted">{{ row.pos ?? '–' }}</span>
          <span class="row-code" :style="{ color: row.color }">{{ row.code }}</span>
        </div>
        <div class="track">
          <div
            v-for="s in row.stints"
            :key="s.stint"
            class="stint"
            :style="{
              left: pct(s.lapStart - 1),
              width: pct(s.lapEnd - s.lapStart + 1),
              '--tyre': compoundColor(s.compound),
            }"
            :title="`${COMPOUND_FR[s.compound] ?? s.compound} · tours ${s.lapStart}–${s.lapEnd}${s.tyreAge ? ` · pneus usés (${s.tyreAge} t.)` : ''}`"
          >
            <span v-if="s.lapEnd - s.lapStart > totalLaps * 0.08" class="stint-laps mono">{{ s.lapEnd - s.lapStart + 1 }}</span>
          </div>
        </div>
        <div class="row-stops mono muted">{{ row.stints.length - 1 }}</div>
      </div>
    </div>

    <div class="axis mono muted">
      <span>Tour 1</span>
      <span>Arrêts</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** [{ number, code, color, pos, highlight, stints: [{ stint, compound, lapStart, lapEnd, tyreAge }] }] */
  rows: { type: Array, required: true },
  totalLaps: { type: Number, required: true },
})

const COMPOUND_FR = {
  SOFT: 'Tendre',
  MEDIUM: 'Medium',
  HARD: 'Dur',
  INTERMEDIATE: 'Intermédiaire',
  WET: 'Pluie',
}

const COMPOUND_VAR = {
  SOFT: 'var(--tyre-soft)',
  MEDIUM: 'var(--tyre-medium)',
  HARD: 'var(--tyre-hard)',
  INTERMEDIATE: 'var(--tyre-inter)',
  WET: 'var(--tyre-wet)',
}

const compoundColor = (c) => COMPOUND_VAR[c] ?? 'var(--text-muted)'

const pct = (laps) => `${(Math.max(0, laps) / props.totalLaps) * 100}%`

const usedCompounds = computed(() => {
  const set = new Set(props.rows.flatMap((r) => r.stints.map((s) => s.compound)))
  return Object.keys(COMPOUND_FR).filter((c) => set.has(c))
})
</script>

<style scoped>
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--text-dim);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tyre {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 3px solid var(--tyre);
  font-size: 9px;
  font-weight: 900;
  color: var(--tyre);
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.row {
  display: grid;
  grid-template-columns: 64px 1fr 28px;
  align-items: center;
  gap: 10px;
  padding: 2px 4px;
  border-radius: 6px;
  animation: rise 0.4s var(--ease) both;
}

.row.fav { background: var(--accent-soft); }

.row-label {
  display: flex;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
}

.row-pos { width: 18px; text-align: right; }

.track {
  position: relative;
  height: 16px;
  background: var(--surface-2);
  border-radius: 4px;
  overflow: hidden;
}

.stint {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tyre);
  border-right: 2px solid var(--bg);
  transform-origin: left;
  animation: grow 0.8s var(--ease) both;
}

.stint-laps {
  font-size: 9px;
  font-weight: 700;
  color: #111;
}

.row-stops {
  font-size: 12px;
  text-align: center;
}

.axis {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding-left: 78px;
  font-size: 10px;
}
</style>
