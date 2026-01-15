<template>
  <div class="h-screen flex flex-col bg-black font-display text-text-base overflow-hidden">
    <div class="flex flex-1 overflow-hidden">
      <div v-show="!isLyricsPage">
        <AppSidebar />
      </div>

      <main class="app-scroll flex-1 overflow-y-auto bg-background-base relative rounded-2xl md:rounded-lg mt-2 mx-2 md:mt-2 md:mr-2 md:mb-2 md:ml-0 overflow-x-hidden spotify-gradient">
        <div
          v-if="!isLyricsPage"
          class="md:hidden sticky top-0 z-20 flex items-center gap-3 px-3 py-3 bg-background-base/85 backdrop-blur border-b border-white/10 rounded-b-2xl shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
        >
          <button
            class="btn-icon p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
            @click="isMobileNavOpen = true"
            aria-label="Open menu"
          >
            <span class="material-symbols-outlined text-[22px]">menu</span>
          </button>
          <span class="text-base font-semibold text-white tracking-wide">LinMusic</span>
        </div>
        <router-view v-slot="{ Component }">
          <keep-alive include="ChartsView,HomeView,SearchView,LikedView,PlaylistView,SettingsView">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </main>
    </div>

    <div v-show="!isLyricsPage && hasCurrentSong">
      <PlayerBar />
    </div>

    <AudioController />
    <ToastContainer />

    <div v-if="showPwaLoader" class="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black">
      <div class="size-14 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
      <span class="mt-4 text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">Loading</span>
    </div>

    <div v-if="isMobileNavOpen && !isLyricsPage" class="fixed inset-0 z-[200] md:hidden">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="isMobileNavOpen = false"></div>
      <AppSidebar mobile @close="isMobileNavOpen = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import PlayerBar from '@/components/layout/PlayerBar.vue'
import AudioController from '@/components/player/AudioController.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { usePlayerStore } from '@/stores/player'

const route = useRoute()
const playerStore = usePlayerStore()

const isLyricsPage = computed(() => route.path === '/lyrics')
const isMobileNavOpen = ref(false)
const hasCurrentSong = computed(() => !!playerStore.currentSong)
const showPwaLoader = ref(false)

const isStandalone = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)')?.matches
    || (window.navigator as any).standalone === true
}

watch(
  () => route.path,
  () => {
    isMobileNavOpen.value = false
  }
)

onMounted(() => {
  if (!isStandalone()) return
  const startedAt = Date.now()
  const minDuration = 900
  showPwaLoader.value = true
  const finish = () => {
    const elapsed = Date.now() - startedAt
    const remaining = Math.max(0, minDuration - elapsed)
    window.setTimeout(() => {
      showPwaLoader.value = false
    }, remaining)
  }
  requestAnimationFrame(() => requestAnimationFrame(finish))
})
</script>
