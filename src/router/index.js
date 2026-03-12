import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import DriversView from '@/views/DriversView.vue'
import SeasonView from '@/views/SeasonView.vue'
import TeamsView from '@/views/TeamsView.vue'
import NewsView from '@/views/NewsView.vue'
import DriverDetail from '@/views/DriverDetail.vue'
import TeamDetail from '@/views/TeamDetail.vue'
import RaceDetail from '@/views/RaceDetail.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/drivers', component: DriversView },
  { path: '/drivers/:id', component: DriverDetail },
  { path: '/season', component: SeasonView },
  { path: '/season/:id', component: RaceDetail },
  { path: '/teams', component: TeamsView },
  { path: '/teams/:id', component: TeamDetail },
  { path: '/news', component: NewsView }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
