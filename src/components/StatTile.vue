<template>
  <div class="tile">
    <div class="tile-value mono">
      <span v-if="typeof value === 'number'" v-countup="{ value, decimals }"></span>
      <span v-else>{{ value ?? '—' }}</span><span v-if="suffix" class="tile-suffix">{{ suffix }}</span>
    </div>
    <div class="tile-label">{{ label }}</div>
    <div v-if="sub" class="tile-sub muted">{{ sub }}</div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: null },
  decimals: { type: Number, default: 0 },
  suffix: { type: String, default: '' },
  sub: { type: String, default: '' },
})
</script>

<style scoped>
.tile {
  position: relative;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
}

.tile::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent);
  opacity: 0.8;
}

.tile-value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
}

.tile-suffix {
  font-size: 14px;
  margin-left: 2px;
  color: var(--text-muted);
}

.tile-label {
  margin-top: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.tile-sub {
  margin-top: 2px;
  font-size: 12px;
}
</style>
