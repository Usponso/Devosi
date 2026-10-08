<template>
  <div class="countdown" role="timer" :aria-label="ariaLabel">
    <div v-for="unit in units" :key="unit.label" class="cd-block">
      <div class="cd-value mono">
        <transition name="flip" mode="out-in">
          <span :key="unit.value">{{ unit.value }}</span>
        </transition>
      </div>
      <div class="cd-label">{{ unit.label }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  target: { type: Date, required: true },
})

const emit = defineEmits(['elapsed'])

const now = ref(Date.now())
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
    if (props.target.getTime() <= now.value) emit('elapsed')
  }, 1000)
})
onUnmounted(() => clearInterval(timer))

const remaining = computed(() => Math.max(0, Math.floor((props.target.getTime() - now.value) / 1000)))

const pad = (n) => String(n).padStart(2, '0')

const units = computed(() => {
  const s = remaining.value
  return [
    { label: 'Jours', value: pad(Math.floor(s / 86400)) },
    { label: 'Heures', value: pad(Math.floor((s % 86400) / 3600)) },
    { label: 'Min', value: pad(Math.floor((s % 3600) / 60)) },
    { label: 'Sec', value: pad(s % 60) },
  ]
})

const ariaLabel = computed(() => units.value.map((u) => `${u.value} ${u.label}`).join(', '))
</script>

<style scoped>
.countdown {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  max-width: 440px;
}

.cd-block {
  position: relative;
  padding: 12px 6px 10px;
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
}

.cd-block::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: var(--accent);
}

.cd-value {
  font-size: clamp(26px, 4vw, 38px);
  font-weight: 700;
  line-height: 1;
  perspective: 200px;
}

.cd-value span { display: inline-block; }

.cd-label {
  margin-top: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.flip-enter-active { transition: transform 0.3s var(--ease), opacity 0.3s; }
.flip-leave-active { transition: transform 0.15s ease-in, opacity 0.15s; }
.flip-enter-from { transform: rotateX(-80deg) translateY(-6px); opacity: 0; }
.flip-leave-to { transform: rotateX(80deg) translateY(6px); opacity: 0; }
</style>
