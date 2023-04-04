import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SeasonView from "../views/SeasonView.vue";
import GrandPrixDetails from "../views/GrandPrixDetails.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/season',
      name: 'season',
      component: SeasonView
    },
    {
      path: '/gp/:round',
      name: 'gp',
      component: GrandPrixDetails
    }
  ]
})

export default router
