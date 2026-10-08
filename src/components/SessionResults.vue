<template>
  <div class="session-results">
    <div v-if="!rows.length" class="sr-empty">
      <span v-if="status === 'live'" class="badge badge-accent badge-live">En piste</span>
      <p class="muted">
        {{ status === 'upcoming' ? 'La séance n\'a pas encore commencé.' : 'Le classement est publié à la fin de la séance. Mise à jour automatique toutes les minutes.' }}
      </p>
    </div>

    <template v-else>
      <div class="sr-head">
        <span>Pos</span><span>Pilote</span><span class="c-best">Temps</span><span class="c-gap">Écart</span><span class="c-laps">Tours</span>
      </div>
      <ol class="sr-list">
        <li
          v-for="(r, i) in limitedRows"
          :key="r.number"
          class="sr-row team-edge"
          :class="{ 'is-fav': r.teamId && r.teamId === prefs.favoriteTeamId, out: r.pos == null }"
          :style="{ '--tc': r.color, animationDelay: `${i * 20}ms` }"
        >
          <span class="mono c-pos" :class="`pos-${r.pos}`">{{ r.pos ?? (r.dns ? 'NP' : 'AB') }}</span>
          <component :is="r.driverId ? 'router-link' : 'span'" :to="r.driverId ? `/drivers/${r.driverId}` : undefined" class="c-driver">
            <strong>{{ r.name }}</strong>
            <span class="muted small">{{ r.team }}</span>
          </component>
          <span class="mono c-best" :class="{ purple: i === 0 && r.best }">{{ formatLap(r.best) }}</span>
          <span class="mono muted c-gap">{{ i === 0 ? '' : formatGap(r.gap) }}</span>
          <span class="mono muted c-laps">{{ r.laps || '' }}</span>
        </li>
      </ol>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePrefsStore } from '@/stores/prefsStore'

const props = defineProps({
  rows: { type: Array, required: true },
  status: { type: String, default: 'done' },
  /** Nombre de lignes affichées (0 = toutes) */
  limit: { type: Number, default: 0 },
})

const prefs = usePrefsStore()

const limitedRows = computed(() => (props.limit ? props.rows.slice(0, props.limit) : props.rows))

/** 97.52 → « 1:37.520 » */
function formatLap(seconds) {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = (seconds - m * 60).toFixed(3).padStart(6, '0')
  return m ? `${m}:${s}` : s
}

function formatGap(gap) {
  if (gap == null) return ''
  if (typeof gap === 'string') return gap
  return `+${gap.toFixed(3)}`
}
</script>

<style scoped>
.small { font-size: 12px; }

.sr-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 20px;
}

.sr-head,
.sr-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 96px 72px 44px;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
}

.sr-head {
  height: 34px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-left: 3px solid transparent;
}

.sr-list { list-style: none; }

.sr-row {
  min-height: 48px;
  border-top: 1px solid var(--line);
  animation: rise 0.4s var(--ease) both;
}

.sr-row.out { opacity: 0.55; }

.c-pos { font-weight: 700; font-size: 15px; text-align: center; }
.c-best, .c-gap, .c-laps { text-align: right; font-size: 13px; }
.c-best.purple { color: #c79bff; font-weight: 700; }

.c-driver {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}

.c-driver strong,
.c-driver span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

a.c-driver:hover strong { color: var(--accent); }

@media (max-width: 640px) {
  .sr-head,
  .sr-row { grid-template-columns: 30px minmax(0, 1fr) 80px 60px; padding: 0 10px; gap: 8px; }
  .c-laps { display: none; }
}
</style>
