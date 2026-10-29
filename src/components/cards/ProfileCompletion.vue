<template>
  <section v-if="completion && !completion.rewarded" class="completion card" :class="{ full: done }">
    <div class="pc-head">
      <div class="pc-title">
        <Icon name="user-check" :size="18" />
        <span>Profil complété à <b class="mono">{{ completion.percent }} %</b></span>
      </div>
      <div class="pc-bar-wrap">
        <span class="pc-bar"><span :style="{ width: `${completion.percent}%` }"></span></span>
        <span class="muted small">+{{ completion.reward }} Pièces à 100 %</span>
      </div>
    </div>

    <div class="steps">
      <button
        v-for="s in steps"
        :key="s.id"
        class="step"
        :class="{ ok: s.done }"
        :disabled="s.done && !s.tab"
        @click="s.tab && $emit('edit', s.tab)"
      >
        <Icon :name="s.done ? 'check' : 'plus'" :size="14" />
        {{ s.label }}
      </button>
    </div>

    <div v-if="done" class="pc-claim">
      <button class="btn" :disabled="busy" @click="claim">
        Récupérer {{ completion.reward }} <Icon name="coin" :size="15" class="coin" />
      </button>
    </div>
    <p v-if="message" class="small" :class="messageError ? 'error' : 'success'">{{ message }}</p>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { economyMessage } from '@/utils/cards'

/** Mon profil : étapes restantes, chacune ouvre la fenêtre de la zone concernée (`edit`) */
defineEmits(['edit'])

const col = useCollectionStore()
const completion = computed(() => col.profile?.completion ?? null)
const done = computed(() => completion.value?.percent >= 100)

const steps = computed(() => {
  const c = completion.value
  return [
    { id: 'username', label: 'Pseudo', done: c.username },
    { id: 'avatar', label: 'Avatar', done: c.avatar, tab: 'avatar' },
    { id: 'team', label: 'Écurie', done: c.team, tab: 'team' },
    { id: 'showcase', label: `Vitrine ${c.showcase}/5`, done: c.showcase >= 5, tab: 'showcase' },
    { id: 'badges', label: `Badges ${c.badges}/3`, done: c.badges >= 3, tab: 'badges' },
  ]
})

const busy = ref(false)
const message = ref('')
const messageError = ref(false)

async function claim() {
  busy.value = true
  messageError.value = false
  try {
    const coins = await col.claimProfileReward()
    message.value = `Profil complet : +${coins} Pièces !`
  } catch (err) {
    messageError.value = true
    message.value = economyMessage(err)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.completion {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  border-color: rgb(var(--accent-rgb) / 0.35);
  background: linear-gradient(100deg, rgb(var(--accent-rgb) / 0.1), transparent 60%), var(--surface);
}

.completion.full { border-color: rgb(232 193 90 / 0.5); }

.pc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 20px;
}

.pc-title { display: flex; align-items: center; gap: 8px; font-weight: 700; }
.pc-title .icon { color: var(--accent); }

.pc-bar-wrap {
  flex: 1;
  min-width: 200px;
  max-width: 360px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.pc-bar { flex: 1; height: 7px; border-radius: 9px; background: var(--surface-3); overflow: hidden; }
.pc-bar span { display: block; height: 100%; background: var(--accent); transition: width 0.5s var(--ease); }

.steps { display: flex; flex-wrap: wrap; gap: 8px; }

.step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 99px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  background: transparent;
  border: 1px dashed var(--accent-line);
  cursor: pointer;
}

.step.ok { color: var(--success); border-style: solid; border-color: color-mix(in srgb, var(--success) 35%, transparent); }
.step:disabled { cursor: default; }
.pc-claim .btn:disabled { opacity: 0.55; }
.coin { color: #e8c15a; }
.small { font-size: 13px; }
.error { color: var(--danger); }
.success { color: var(--success); }
p { margin: 0; }
</style>
