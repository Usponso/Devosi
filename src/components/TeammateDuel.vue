<template>
  <div class="duel" :style="{ '--tc': color }">
    <div class="duel-head">
      <router-link :to="`/drivers/${a.id}`" class="duel-driver">
        <span class="dd-code">{{ a.shortName }}</span>
        <span class="dd-name muted">{{ a.familyName }}</span>
      </router-link>
      <span class="vs muted mono">VS</span>
      <router-link :to="`/drivers/${b.id}`" class="duel-driver right">
        <span class="dd-code">{{ b.shortName }}</span>
        <span class="dd-name muted">{{ b.familyName }}</span>
      </router-link>
    </div>

    <div v-for="row in rows" :key="row.label" class="duel-row">
      <span class="dv mono" :class="{ lead: row.lead === 0 }">{{ row.display[0] }}</span>
      <div class="duel-bar">
        <span class="dbar left" :style="{ width: row.share[0] + '%' }"></span>
        <span class="dlabel">{{ row.label }}</span>
        <span class="dbar right" :style="{ width: row.share[1] + '%' }"></span>
      </div>
      <span class="dv mono" :class="{ lead: row.lead === 1 }">{{ row.display[1] }}</span>
    </div>

    <p v-if="!duel.rounds" class="muted empty-duel">Pas encore de course disputée ensemble.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  a: { type: Object, required: true },
  b: { type: Object, required: true },
  duel: { type: Object, required: true },
  color: { type: String, default: 'var(--accent)' },
})

/** Ligne « plus c'est haut, mieux c'est » ou l'inverse (moyennes de positions) */
function makeRow(label, values, lowerIsBetter = false, format = (v) => v) {
  const [va, vb] = values
  if (va == null || vb == null) return { label, display: ['—', '—'], share: [0, 0], lead: null }
  let sa = va
  let sb = vb
  if (lowerIsBetter) {
    sa = 1 / va
    sb = 1 / vb
  }
  const total = sa + sb || 1
  const lead = va === vb ? null : (lowerIsBetter ? va < vb : va > vb) ? 0 : 1
  return {
    label,
    display: [format(va), format(vb)],
    share: [(sa / total) * 50, (sb / total) * 50],
    lead,
  }
}

const rows = computed(() => {
  const d = props.duel
  return [
    makeRow('Qualifs', d.quali),
    makeRow('Courses', d.race),
    makeRow('Points', d.points, false, (v) => Math.round(v)),
    makeRow('Moy. grille', d.avgQuali, true, (v) => `P${v.toFixed(1)}`),
    makeRow('Moy. arrivée', d.avgFinish, true, (v) => `P${v.toFixed(1)}`),
  ]
})
</script>

<style scoped>
.duel-head {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  margin-bottom: 14px;
}

.duel-driver {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.duel-driver.right { text-align: right; }

.dd-code {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.dd-name { font-size: 12px; }

.vs {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border: 1px solid var(--line);
  border-radius: 99px;
}

.duel-row {
  display: grid;
  grid-template-columns: 52px 1fr 52px;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
}

.dv {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
}

.dv:last-child { text-align: right; }
.dv.lead { color: var(--text); }

.duel-bar {
  position: relative;
  display: flex;
  align-items: center;
  height: 22px;
  background: var(--surface-2);
  border-radius: 6px;
  overflow: hidden;
}

.dbar {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--tc);
  animation: grow 0.9s var(--ease) both;
}

.dbar.left {
  right: 50%;
  opacity: 0.95;
  transform-origin: right;
}

.dbar.right {
  left: 50%;
  opacity: 0.45;
}

.dlabel {
  position: relative;
  z-index: 1;
  width: 100%;
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
}

.empty-duel {
  font-size: 13px;
  margin-top: 8px;
}
</style>
