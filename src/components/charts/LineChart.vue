<template>
  <div ref="wrap" class="chart" :style="{ height: height + 'px' }">
    <svg
      v-if="width"
      :width="width"
      :height="height"
      role="img"
      :aria-label="ariaLabel"
      @pointermove="onMove"
      @pointerleave="hoverIndex = null"
    >
      <!-- Grille horizontale -->
      <g class="grid">
        <g v-for="tick in yTicks" :key="tick">
          <line :x1="pad.left" :x2="width - pad.right" :y1="y(tick)" :y2="y(tick)" />
          <text :x="pad.left - 8" :y="y(tick)" dy="0.32em" text-anchor="end">{{ formatY(tick) }}</text>
        </g>
      </g>

      <!-- Axe X : quelques repères -->
      <g class="axis-x">
        <text
          v-for="i in xTicks"
          :key="i"
          :x="x(i)"
          :y="height - 6"
          text-anchor="middle"
        >{{ xLabels[i] }}</text>
      </g>

      <!-- Séries : d'abord les estompées, puis les mises en avant -->
      <g class="series">
        <path
          v-for="(s, idx) in orderedSeries"
          :key="s.id"
          :d="linePath(s.values)"
          :stroke="s.color"
          class="line"
          :class="{ dimmed: isDimmed(s), strong: isStrong(s), dashed: s.dashed }"
          :pathLength.attr="s.dashed ? null : 1"
          :style="{ animationDelay: `${Math.min(idx, 12) * 40}ms` }"
          @pointerenter="hoverId = s.id"
          @pointerleave="hoverId = null"
        />
      </g>

      <!-- Étiquettes de fin de courbe -->
      <g v-if="endLabels" class="end-labels">
        <text
          v-for="l in endLabelPositions"
          :key="l.id"
          :x="l.x + 6"
          :y="l.y"
          dy="0.32em"
          :fill="l.color"
          :class="{ dimmed: l.dimmed }"
        >{{ l.label }}</text>
      </g>

      <!-- Survol -->
      <g v-if="hoverIndex !== null" class="hover">
        <line :x1="x(hoverIndex)" :x2="x(hoverIndex)" :y1="pad.top" :y2="height - pad.bottom" />
        <circle
          v-for="s in tooltipSeries"
          :key="s.id"
          :cx="x(hoverIndex)"
          :cy="y(s.value)"
          r="4"
          :fill="s.color"
        />
      </g>
    </svg>

    <div
      v-if="hoverIndex !== null && tooltipSeries.length"
      class="tooltip"
      :style="tooltipStyle"
    >
      <div class="tt-title">{{ tooltipTitle ? tooltipTitle(hoverIndex) : xLabels[hoverIndex] }}</div>
      <div v-for="s in tooltipSeries.slice(0, 8)" :key="s.id" class="tt-row">
        <span class="tt-dot" :style="{ background: s.color }"></span>
        <span class="tt-label">{{ s.label }}</span>
        <span class="mono">{{ formatY(s.value) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  /** [{ id, label, color, values: (number|null)[], highlight?: boolean, dashed?: boolean }] */
  series: { type: Array, required: true },
  xLabels: { type: Array, required: true },
  height: { type: Number, default: 280 },
  /** Axe Y inversé (positions : 1 en haut) */
  invert: { type: Boolean, default: false },
  yMin: { type: Number, default: null },
  yMax: { type: Number, default: null },
  endLabels: { type: Boolean, default: true },
  formatY: { type: Function, default: (v) => Math.round(v).toLocaleString('fr-FR') },
  tooltipTitle: { type: Function, default: null },
  ariaLabel: { type: String, default: 'Graphique' },
})

const wrap = ref(null)
const width = ref(0)
let observer = null

onMounted(() => {
  width.value = wrap.value.clientWidth
  observer = new ResizeObserver(([entry]) => (width.value = Math.floor(entry.contentRect.width)))
  observer.observe(wrap.value)
})
onUnmounted(() => observer?.disconnect())

const pad = computed(() => ({ top: 12, right: props.endLabels ? 44 : 12, bottom: 26, left: 36 }))

const allValues = computed(() => props.series.flatMap((s) => s.values.filter((v) => v != null)))
const domain = computed(() => {
  const min = props.yMin ?? Math.min(0, ...allValues.value)
  const max = props.yMax ?? Math.max(1, ...allValues.value)
  return [min, max]
})

const n = computed(() => Math.max(1, props.xLabels.length - 1))

function x(i) {
  return pad.value.left + (i / n.value) * (width.value - pad.value.left - pad.value.right)
}

function y(v) {
  const [min, max] = domain.value
  const t = (v - min) / (max - min || 1)
  const h = props.height - pad.value.top - pad.value.bottom
  return props.invert ? pad.value.top + t * h : props.height - pad.value.bottom - t * h
}

/** Graduations « rondes » */
const yTicks = computed(() => {
  const [min, max] = domain.value
  if (props.invert) {
    const step = max > 12 ? 5 : 1
    const ticks = [min]
    for (let v = step; v <= max; v += step) if (v !== min) ticks.push(v)
    return ticks
  }
  const raw = (max - min) / 4
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const ticks = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100)
  return ticks
})

const xTicks = computed(() => {
  const count = props.xLabels.length
  const maxTicks = Math.max(2, Math.floor(width.value / 70))
  const step = Math.max(1, Math.ceil(count / maxTicks))
  const ticks = []
  for (let i = 0; i < count; i += step) ticks.push(i)
  if (ticks[ticks.length - 1] !== count - 1 && count > 1) ticks.push(count - 1)
  return ticks
})

/** Chemin SVG en coupant les trous (null) */
function linePath(values) {
  let d = ''
  let pen = false
  values.forEach((v, i) => {
    if (v == null) {
      pen = false
      return
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    pen = true
  })
  return d
}

const hoverId = ref(null)
const hasHighlight = computed(() => props.series.some((s) => s.highlight))
const isStrong = (s) => s.id === hoverId.value || (!hoverId.value && s.highlight)
const isDimmed = (s) => (hoverId.value ? s.id !== hoverId.value : hasHighlight.value && !s.highlight)

const orderedSeries = computed(() =>
  [...props.series].sort((a, b) => Number(isStrong(a)) - Number(isStrong(b)) || Number(!isDimmed(a)) - Number(!isDimmed(b))),
)

function lastPoint(values) {
  for (let i = values.length - 1; i >= 0; i--) if (values[i] != null) return { i, v: values[i] }
  return null
}

/** Étiquettes en bout de courbe, écartées pour éviter les chevauchements */
const endLabelPositions = computed(() => {
  const labels = props.series
    .map((s) => {
      const p = lastPoint(s.values)
      return p && { id: s.id, label: s.label, color: s.color, x: x(p.i), y: y(p.v), dimmed: isDimmed(s) }
    })
    .filter(Boolean)
    .filter((l) => !l.dimmed || props.series.length <= 6)
    .sort((a, b) => a.y - b.y)
  const gap = 12
  for (let i = 1; i < labels.length; i++) {
    if (labels[i].y - labels[i - 1].y < gap) labels[i].y = labels[i - 1].y + gap
  }
  return labels
})

const hoverIndex = ref(null)

function onMove(e) {
  const rect = wrap.value.getBoundingClientRect()
  const px = e.clientX - rect.left
  const t = (px - pad.value.left) / (width.value - pad.value.left - pad.value.right)
  hoverIndex.value = Math.max(0, Math.min(props.xLabels.length - 1, Math.round(t * n.value)))
}

const tooltipSeries = computed(() => {
  if (hoverIndex.value === null) return []
  const list = props.series
    .filter((s) => s.values[hoverIndex.value] != null && (!isDimmed(s) || !hasHighlight.value))
    .map((s) => ({ id: s.id, label: s.label, color: s.color, value: s.values[hoverIndex.value] }))
  return list.sort((a, b) => (props.invert ? a.value - b.value : b.value - a.value))
})

const tooltipStyle = computed(() => {
  const left = x(hoverIndex.value)
  const flip = left > width.value * 0.6
  return {
    left: `${flip ? left - 12 : left + 12}px`,
    top: `${pad.value.top}px`,
    transform: flip ? 'translateX(-100%)' : 'none',
  }
})
</script>

<style scoped>
.chart {
  position: relative;
  width: 100%;
  touch-action: pan-y;
}

svg {
  display: block;
  overflow: visible;
}

.grid line {
  stroke: var(--line);
}

.grid text,
.axis-x text {
  font-family: var(--mono);
  font-size: 10px;
  fill: var(--text-muted);
}

.line {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw-line 1.4s var(--ease) forwards;
  transition: opacity 0.25s, stroke-width 0.25s;
  cursor: pointer;
}

.line.strong { stroke-width: 3.5; }
.line.dimmed { opacity: 0.18; }
.line.dashed { stroke-dasharray: 6 5; stroke-dashoffset: 0; animation: rise 0.6s var(--ease) 0.6s both; }

@keyframes draw-line {
  to { stroke-dashoffset: 0; }
}

.end-labels text {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  animation: rise 0.6s var(--ease) 1.1s both;
}

.end-labels text.dimmed { opacity: 0.4; }

.hover line {
  stroke: var(--line-strong);
  stroke-dasharray: 3 3;
}

.hover circle {
  stroke: var(--bg);
  stroke-width: 2;
}

.tooltip {
  position: absolute;
  z-index: 5;
  min-width: 150px;
  padding: 10px 12px;
  background: rgba(20, 22, 27, 0.95);
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  pointer-events: none;
  font-size: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.tt-title {
  margin-bottom: 6px;
  font-weight: 700;
  color: var(--text-dim);
}

.tt-row {
  display: grid;
  grid-template-columns: 8px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 1px 0;
}

.tt-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
</style>
