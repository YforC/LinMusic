import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/styles/main.css'
import { usePlayerStore } from '@/stores/player'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

router.beforeEach((to) => {
  if (to.path !== '/lyrics') return true
  const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches
    || (window.navigator as any).standalone === true
  if (!isStandalone) return true

  const playerStore = usePlayerStore(pinia)
  const current = (playerStore.currentSong as any)?.value ?? playerStore.currentSong
  if (!current) {
    return { path: '/' }
  }
  return true
})

app.mount('#app')
