<template>
  <router-link v-if="ready" v-reveal to="/packs" class="packs-widget" :class="{ ready: available > 0 }">
    <span class="pw-stack" aria-hidden="true">
      <span v-for="i in stackSize" :key="i" class="pw-pack" :style="{ '--i': i - 1 }">
        <span class="pw-pack-title">F1</span>
      </span>
      <span v-if="available > 0" class="pw-badge mono">{{ available }}</span>
    </span>

    <span class="pw-text">
      <span class="eyebrow">Cartes à collectionner</span>
      <strong class="pw-title">{{ title }}</strong>
      <span class="muted pw-sub">{{ subtitle }}</span>
    </span>

    <span class="btn pw-cta" :class="{ 'btn-ghost': !available }">
      {{ available ? 'Ouvrir' : 'Voir' }} <Icon name="cards" :size="16" />
    </span>
  </router-link>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { useCollectionStore } from '@/stores/collectionStore'

const col = useCollectionStore()

const ready = ref(false)
const hasSession = ref(false)
const now = ref(Date.now())
let timer = null
let refreshing = false

// Nouveau visiteur (pas encore de session) : les 3 packs offerts au départ
const available = computed(() => (hasSession.value ? col.packsToOpen : 3))
const max = computed(() => col.status?.max ?? 10)
const stackSize = computed(() => Math.min(3, Math.max(available.value, 1)))

const countdown = computed(() => {
  if (!col.nextPackAt) return null
  const s = Math.max(0, Math.round((col.nextPackAt - now.value) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})

const title = computed(() => {
  if (!hasSession.value) return '3 packs offerts t’attendent'
  if (!available.value) return 'Aucun pack disponible'
  return `${available.value} pack${available.value > 1 ? 's' : ''} à ouvrir`
})

const subtitle = computed(() => {
  if (!hasSession.value) return 'Pilotes, écuries, Grands Prix et moments de légende depuis 1950'
  if (col.questsReady) return `${col.questsReady} quête${col.questsReady > 1 ? 's' : ''} terminée${col.questsReady > 1 ? 's' : ''} : récupère ta récompense`
  if ((col.status?.available ?? 0) >= max.value) return 'Réserve pleine : ouvre-les pour continuer à en recevoir'
  return countdown.value ? `Prochain pack dans ${countdown.value}` : '1 pack offert toutes les 30 min'
})

async function tick() {
  now.value = Date.now()
  if (hasSession.value && col.nextPackAt && now.value >= col.nextPackAt && !refreshing) {
    refreshing = true
    try {
      await col.refreshStatus()
    } catch {
      // réessayé à la prochaine seconde
    } finally {
      refreshing = false
    }
  }
}

onMounted(async () => {
  if (!col.configured) return
  try {
    hasSession.value = await col.peekStatus()
    ready.value = true
    timer = setInterval(tick, 1000)
  } catch (err) {
    console.error('[Packs]', err)
  }
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.packs-widget {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 16px 20px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background:
    radial-gradient(120% 160% at 0% 50%, rgb(var(--accent-rgb) / 0.16), transparent 60%),
    var(--surface);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.25s var(--ease), transform 0.25s var(--ease);
}

.packs-widget:hover { border-color: rgb(var(--accent-rgb) / 0.6); }
.packs-widget.ready { border-color: rgb(var(--accent-rgb) / 0.35); }

.pw-stack {
  position: relative;
  flex: none;
  width: 44px;
  aspect-ratio: 5 / 7;
  margin-right: 8px;
}

.pw-pack {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: #fff;
  background:
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0 3px, transparent 3px 8px),
    linear-gradient(155deg, var(--accent), color-mix(in srgb, var(--accent) 30%, #0b0c0f) 75%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  transform: translate(calc(var(--i) * 4px), calc(var(--i) * -4px)) rotate(calc(var(--i) * 4deg));
  transition: transform 0.3s var(--ease);
}

.pw-pack:not(:last-of-type) { opacity: 0.6; }
.packs-widget:not(.ready) .pw-pack { filter: grayscale(1) brightness(0.55); }

.packs-widget.ready .pw-pack:last-of-type { animation: pw-float 2.4s var(--ease) infinite; }
.packs-widget:hover .pw-pack:last-of-type {
  animation: none;
  transform: translate(calc(var(--i) * 4px), calc(var(--i) * -4px - 6px)) rotate(-4deg);
}

@keyframes pw-float {
  0%, 100% { transform: translate(calc(var(--i) * 4px), calc(var(--i) * -4px)) rotate(calc(var(--i) * 4deg)); }
  50% { transform: translate(calc(var(--i) * 4px), calc(var(--i) * -4px - 4px)) rotate(calc(var(--i) * 4deg - 3deg)); }
}

.pw-pack-title { font-size: 13px; font-weight: 900; letter-spacing: -0.02em; }

.pw-badge {
  position: absolute;
  top: -10px;
  right: -16px;
  z-index: 1;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: var(--accent);
  color: var(--on-accent);
  box-shadow: 0 0 0 3px var(--surface), 0 0 14px rgb(var(--accent-rgb) / 0.7);
}

.pw-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pw-title { font-size: 18px; font-weight: 900; line-height: 1.2; }
.pw-sub { font-size: 13px; }
.pw-cta { flex: none; }

@media (max-width: 560px) {
  .packs-widget { gap: 14px; padding: 14px 16px; }
  .pw-title { font-size: 16px; }
  .pw-cta { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .packs-widget.ready .pw-pack:last-of-type { animation: none; }
}
</style>
