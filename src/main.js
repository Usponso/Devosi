import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import App from './App.vue'
import { reveal } from './directives/reveal'
import { countup } from './directives/countup'
import { registerServiceWorker } from './services/push'
// Écoute la proposition d'installation du navigateur dès le chargement
import './composables/useInstall'
import './assets/global.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.directive('reveal', reveal)
app.directive('countup', countup)
app.mount('#app')

// Service worker : notifications push (aucun cache hors ligne)
registerServiceWorker()
