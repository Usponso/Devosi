<template>
  <div v-if="visible" class="install-banner">
    <img src="/icons/icon-192.png" alt="" class="app-icon" />
    <span class="text">
      <b>Installe l'appli Devosi</b>
      <span class="muted">Plein écran, accès en un geste depuis ton écran d'accueil, et notifications.</span>
    </span>
    <span class="actions">
      <button class="btn btn-ghost" @click="dismiss">Plus tard</button>
      <button class="btn" @click="onInstall">Installer</button>
    </span>

    <!-- iPhone : étapes manuelles -->
    <ol v-if="showSteps" class="steps">
      <li><span class="num">1</span> Touche <b>Partager</b> en bas de Safari</li>
      <li><span class="num">2</span> Choisis <b>Sur l'écran d'accueil</b></li>
      <li><span class="num">3</span> Ouvre Devosi depuis l'icône</li>
    </ol>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useInstall } from '@/composables/useInstall'

/** Invitation à installer l'appli (masquée une fois installée ou repoussée) */
const KEY = 'devosi:install-banner'

const { canInstall, iosSteps, install } = useInstall()
const showSteps = ref(false)
const dismissed = ref(read())

function read() {
  try {
    return Boolean(localStorage.getItem(KEY))
  } catch {
    return false
  }
}

const visible = computed(() => canInstall.value && !dismissed.value)

async function onInstall() {
  if (iosSteps.value) {
    showSteps.value = true
    return
  }
  await install()
}

function dismiss() {
  dismissed.value = true
  try {
    localStorage.setItem(KEY, String(Date.now()))
  } catch {
    /* navigation privée : l'invitation reviendra */
  }
}
</script>

<style scoped>
.install-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
  margin-bottom: 24px;
  padding: 14px 16px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--surface);
}

.app-icon { width: 44px; height: 44px; border-radius: 11px; flex-shrink: 0; }
.text { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 2px; font-size: 14px; }
.actions { display: flex; gap: 8px; }
.actions .btn { padding: 8px 14px; font-size: 13px; }

.steps {
  flex-basis: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
}

.steps li { display: flex; align-items: center; gap: 10px; }

.num {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: var(--accent);
}
</style>
