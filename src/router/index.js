import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/standings', component: () => import('@/views/StandingsView.vue') },
  { path: '/season', component: () => import('@/views/SeasonView.vue') },
  { path: '/season/:id', component: () => import('@/views/RaceDetail.vue') },
  { path: '/drivers', component: () => import('@/views/DriversView.vue') },
  { path: '/drivers/:id', component: () => import('@/views/DriverDetail.vue') },
  { path: '/teams', component: () => import('@/views/TeamsView.vue') },
  { path: '/teams/:id', component: () => import('@/views/TeamDetail.vue') },
  { path: '/packs', component: () => import('@/views/PacksView.vue') },
  { path: '/collection', component: () => import('@/views/CollectionView.vue') },
  { path: '/collection/album/:id', component: () => import('@/views/AlbumView.vue') },
  { path: '/atelier', component: () => import('@/views/AtelierView.vue') },
  { path: '/joueurs', component: () => import('@/views/PlayersView.vue') },
  { path: '/joueurs/:username', component: () => import('@/views/PlayerView.vue') },
  { path: '/news', component: () => import('@/views/NewsView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.path === from.path) return false
    return { top: 0 }
  },
})
