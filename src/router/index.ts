import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SeasonView from "../views/SeasonView.vue";
import GrandPrixDetails from "../views/GrandPrixDetails.vue";
import DriverStandings from "@/views/DriverStandings.vue";
import TeamStandings from "@/views/TeamStandings.vue";
import DriverDetailsView from "@/views/DriverDetailsView.vue";

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
    },
    {
      path: '/drivers',
      name: 'drivers',
      component: DriverStandings
    },
    {
      path: '/drivers/:id',
      name: 'driverDetails',
      component: DriverDetailsView
    },
    {
      path: '/teams',
      name: 'teams',
      component: TeamStandings
    }
  ]
})

export default router
