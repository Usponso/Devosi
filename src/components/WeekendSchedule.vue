<template>
  <ol class="schedule">
    <li
      v-for="(s, i) in rows"
      :key="s.key"
      class="session"
      :class="[s.status, { main: s.key === 'race' || s.key === 'qualifying' || s.key === 'sprint' }]"
      :style="{ animationDelay: `${300 + i * 60}ms` }"
    >
      <div class="s-name">
        <span class="s-dot"></span>
        {{ s.label }}
        <span v-if="s.status === 'live'" class="badge badge-accent badge-live">En cours</span>
      </div>
      <div class="s-time mono">{{ formatSessionTime(s.start) }}</div>
      <div v-if="weather" class="s-weather">
        <template v-if="weatherByKey[s.key]?.temp != null">
          <Icon :name="weatherByKey[s.key].icon" :size="16" />
          <span class="mono">{{ weatherByKey[s.key].temp }}°</span>
          <span class="s-rain mono" :class="{ wet: weatherByKey[s.key].rain >= 40 }">
            <Icon name="droplet" :size="12" />{{ weatherByKey[s.key].rain }}%
          </span>
        </template>
      </div>
    </li>
  </ol>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Icon from './Icon.vue'
import { weekendSessions, formatSessionTime } from '@/utils/race'

const props = defineProps({
  race: { type: Object, required: true },
  weather: { type: Array, default: null },
})

const now = ref(new Date())
let timer = null
onMounted(() => (timer = setInterval(() => (now.value = new Date()), 30000)))
onUnmounted(() => clearInterval(timer))

const rows = computed(() =>
  weekendSessions(props.race).map((s) => ({
    ...s,
    status: s.end < now.value ? 'done' : s.start <= now.value ? 'live' : 'upcoming',
  })),
)

const weatherByKey = computed(() => Object.fromEntries((props.weather ?? []).map((w) => [w.key, w])))
</script>

<style scoped>
.schedule {
  list-style: none;
  display: flex;
  flex-direction: column;
}

.session {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  font-size: 14px;
  animation: rise 0.5s var(--ease) both;
}

.session:last-child { border-bottom: none; }

.s-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  color: var(--text-dim);
}

.main .s-name { color: var(--text); font-weight: 700; }

.s-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid var(--text-muted);
  flex-shrink: 0;
}

.main .s-dot { border-color: var(--accent); }
.done .s-dot { background: var(--text-muted); border-color: var(--text-muted); }
.live .s-dot { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 10px var(--accent); }

.done { opacity: 0.45; }

.s-time {
  font-size: 13px;
  text-transform: capitalize;
}

.s-weather {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 108px;
  justify-content: flex-end;
  font-size: 13px;
  color: var(--text-dim);
}

.s-rain {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--text-muted);
}

.s-rain.wet { color: var(--tyre-wet); }

@media (max-width: 480px) {
  .session { grid-template-columns: 1fr auto; }
  .s-weather { grid-column: 1 / -1; justify-content: flex-start; padding-left: 18px; min-width: 0; }
}
</style>
