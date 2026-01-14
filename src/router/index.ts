import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchView.vue')
  },
  {
    path: '/charts',
    name: 'charts',
    component: () => import('@/views/ChartsView.vue')
  },
  {
    path: '/playlist/:id',
    name: 'playlist',
    component: () => import('@/views/PlaylistView.vue')
  },
  {
    path: '/liked',
    name: 'liked',
    component: () => import('@/views/LikedView.vue')
  },
  {
    path: '/lyrics',
    name: 'lyrics',
    component: () => import('@/views/LyricsView.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
