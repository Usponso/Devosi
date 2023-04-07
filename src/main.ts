import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { library } from '@fortawesome/fontawesome-svg-core'

import App from './App.vue';
import router from './router';
import '../public/assets/style/main.scss';

/* import specific icons */
import { faBars } from '@fortawesome/free-solid-svg-icons'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

library.add(faBars);
library.add(faXmark);

const app = createApp(App);

// app.use(createPinia())
app.use(router);

app.mount('#app');
