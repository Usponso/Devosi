<template>
  <div class="form" :aria-label="`Forme récente : ${items.map((i) => i.label).join(', ')}`">
    <span
      v-for="(item, i) in items"
      :key="item.round"
      class="form-pill mono"
      :class="pillClass(item)"
      :title="`${item.name} : ${item.label}`"
      :style="{ animationDelay: `${i * 60}ms` }"
    >{{ item.pos ?? item.label }}</span>
  </div>
</template>

<script setup>
/** Pastilles de forme récente (P1, P5, AB…) */
defineProps({
  items: { type: Array, required: true },
})

function pillClass(item) {
  if (item.absent) return 'absent'
  if (!item.classified) return 'dnf'
  if (item.pos === 1) return 'win'
  if (item.pos <= 3) return 'podium'
  if (item.pos <= 10) return 'points'
  return ''
}
</script>

<style scoped>
.form {
  display: flex;
  gap: 4px;
}

.form-pill {
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 22px;
  padding: 0 4px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background: var(--surface-2);
  color: var(--text-muted);
  animation: rise 0.4s var(--ease) both;
}

.form-pill.points { color: var(--text); }
.form-pill.podium { background: var(--accent-soft); color: var(--text); }
.form-pill.win { background: var(--accent); color: var(--on-accent); }
.form-pill.dnf { color: var(--danger); background: rgba(255, 90, 95, 0.1); }
.form-pill.absent { opacity: 0.4; }
</style>
