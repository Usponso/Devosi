import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import App from './App.vue'
import { reveal } from './directives/reveal'
import { countup } from './directives/countup'
import './assets/global.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.directive('reveal', reveal)
app.directive('countup', countup)
app.mount('#app')
