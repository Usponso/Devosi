<template>
  <transition name="picker">
    <div v-if="prefs.pickerOpen" class="picker-backdrop" @click.self="close">
      <div class="picker" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <button class="picker-close" aria-label="Fermer" @click="close"><Icon name="x" /></button>
        <div class="eyebrow">Personnalise ton Devosi</div>
        <h2 id="picker-title" class="title-lg picker-title">Ton écurie</h2>
        <p class="dim picker-sub">L'app prend ses couleurs et met ses pilotes en avant.</p>

        <div class="picker-grid">
          <button
            v-for="(team, i) in PICKABLE_TEAMS"
            :key="team.id"
            class="picker-team"
            :class="{ selected: prefs.favoriteTeamId === team.id }"
            :style="{ '--tc': team.color, animationDelay: `${i * 35}ms` }"
            @click="prefs.setFavoriteTeam(team.id)"
          >
            <span class="pt-swatch"></span>
            <span class="pt-name">{{ team.name }}</span>
            <Icon v-if="prefs.favoriteTeamId === team.id" name="check" :size="16" class="pt-check" />
          </button>
        </div>

        <button v-if="!prefs.favoriteTeamId" class="picker-skip muted" @click="prefs.skipPicker()">Plus tard</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import Icon from './Icon.vue'
import { PICKABLE_TEAMS } from '@/data/teams'
import { usePrefsStore } from '@/stores/prefsStore'

const prefs = usePrefsStore()

function close() {
  if (prefs.favoriteTeamId) prefs.pickerOpen = false
  else prefs.skipPicker()
}

const onKey = (e) => e.key === 'Escape' && prefs.pickerOpen && close()
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.documentElement.classList.remove('modal-open')
})

// Modale ouverte : page figée (animations en pause, pas de défilement)
watch(
  () => prefs.pickerOpen,
  (open) => document.documentElement.classList.toggle('modal-open', open),
  { immediate: true },
)
</script>

<style scoped>
.picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 16px;
  /* Fond opaque plutôt qu'un backdrop-filter : flouter une page animée coûte cher à chaque image */
  background: rgba(5, 6, 8, 0.88);
}

.picker {
  position: relative;
  width: min(640px, 100%);
  max-height: calc(100vh - 32px);
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  padding: 32px;
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: 20px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
}

.picker-close {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px;
  border-radius: 50%;
  color: var(--text-muted);
}
.picker-close:hover { color: var(--text); background: var(--surface-2); }

.picker-title { margin: 6px 0 4px; }
.picker-sub { margin-bottom: 24px; }

.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.picker-team {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  text-align: left;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  overflow: hidden;
  animation: rise 0.5s var(--ease) both;
  transition: border-color var(--t), transform var(--t);
}

.picker-team::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, color-mix(in srgb, var(--tc) 30%, transparent), transparent 70%);
  opacity: 0;
  transition: opacity var(--t);
}

.picker-team:hover { transform: translateY(-2px); border-color: var(--tc); }
.picker-team:hover::before,
.picker-team.selected::before { opacity: 1; }
.picker-team.selected { border-color: var(--tc); }

.pt-swatch {
  position: relative;
  width: 6px;
  height: 28px;
  border-radius: 3px;
  background: var(--tc);
  box-shadow: 0 0 16px var(--tc);
}

.pt-name {
  position: relative;
  font-weight: 700;
  font-size: 15px;
}

.pt-check {
  position: relative;
  margin-left: auto;
  color: var(--tc);
}

.picker-skip {
  display: block;
  margin: 20px auto 0;
  font-size: 13px;
  font-weight: 600;
}
.picker-skip:hover { color: var(--text); }

.picker-enter-active,
.picker-leave-active { transition: opacity 0.3s ease; }
.picker-enter-active .picker,
.picker-leave-active .picker { transition: transform 0.4s var(--ease); }
.picker-enter-from,
.picker-leave-to { opacity: 0; }
.picker-enter-from .picker,
.picker-leave-to .picker { transform: translateY(24px) scale(0.97); }

@media (max-width: 640px) {
  .picker { padding: 24px 16px; }
  .picker-grid { grid-template-columns: 1fr 1fr; }
}
</style>
