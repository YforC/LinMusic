<template>
  <div class="h-screen flex flex-col bg-black font-display text-text-base overflow-hidden">
    <div class="flex flex-1 overflow-hidden">
      <div v-show="!isLyricsPage">
        <AppSidebar />
      </div>

      <main class="flex-1 overflow-y-auto bg-background-base relative rounded-lg mt-2 mr-2 mb-2 overflow-x-hidden spotify-gradient">
        <router-view v-slot="{ Component }">
          <keep-alive include="ChartsView,HomeView,SearchView,LikedView,PlaylistView,SettingsView">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </main>
    </div>

    <div v-show="!isLyricsPage">
      <PlayerBar />
    </div>

    <AudioController />
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import PlayerBar from '@/components/layout/PlayerBar.vue'
import AudioController from '@/components/player/AudioController.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'

const route = useRoute()

const isLyricsPage = computed(() => route.path === '/lyrics')
</script>
