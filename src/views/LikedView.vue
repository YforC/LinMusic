<template>
  <div class="relative">
    <!-- Hero Section -->
    <div class="px-8 pb-6 pt-16 hero-gradient flex items-end gap-6 min-h-[240px]">
      <div
        class="w-[180px] h-[180px] shadow-2xl shadow-black/50 rounded-md bg-gradient-to-br from-indigo-800 to-indigo-400 flex items-center justify-center"
      >
        <span class="material-symbols-outlined text-white text-[80px] fill-1">favorite</span>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-bold uppercase tracking-wider">歌单</span>
        <h1 class="text-5xl md:text-7xl font-black tracking-tight text-white mb-2">我喜欢的音乐</h1>
        <div class="flex items-center gap-2 text-sm font-medium text-white/80">
          <div class="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-black font-bold text-xs">L</div>
          <span class="hover:underline cursor-pointer">LinMusic</span>
          <span>•</span>
          <span>{{ songs.length }} 首歌曲</span>
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="px-8 py-6 flex items-center justify-between bg-background-base/30 backdrop-blur-sm sticky top-0 z-10">
      <div class="flex items-center gap-6">
        <button
          class="w-14 h-14 rounded-full bg-primary hover:scale-105 hover:bg-primary/90 transition-all flex items-center justify-center shadow-lg shadow-black/40"
          @click="playAll"
        >
          <span class="material-symbols-outlined text-3xl text-black fill-1 ml-1">play_arrow</span>
        </button>
        <button class="text-text-subdued hover:text-white transition-colors">
          <span class="material-symbols-outlined text-3xl">shuffle</span>
        </button>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 text-text-subdued hover:text-white cursor-pointer transition-colors">
          <span class="material-symbols-outlined text-xl">search</span>
        </div>
      </div>
    </div>

    <!-- Songs List -->
    <div class="px-8 pb-8">
      <table class="w-full text-left border-collapse">
        <thead class="text-text-subdued text-sm border-b border-white/10 sticky top-[88px] bg-background-base z-10">
          <tr>
            <th class="font-normal py-2 px-3 w-12">#</th>
            <th class="font-normal py-2 px-3 w-[35%]">歌曲标题</th>
            <th class="font-normal py-2 px-3 w-[25%]">歌手</th>
            <th class="font-normal py-2 px-3 w-[25%] hidden md:table-cell">专辑</th>
            <th class="font-normal py-2 px-3 w-16 text-right">
              <span class="material-symbols-outlined text-lg align-middle">schedule</span>
            </th>
          </tr>
        </thead>

        <tbody class="text-sm font-medium">
          <tr
            v-for="(song, index) in songs"
            :key="`${song.platform}-${song.id}`"
            class="group hover:bg-white/10 rounded-md transition-colors border-b border-transparent cursor-pointer"
            @click="playSong(song, index)"
          >
            <td class="py-3 px-3 text-text-subdued group-hover:text-white relative w-12">
              <span class="group-hover:hidden">{{ index + 1 }}</span>
              <span class="hidden group-hover:block material-symbols-outlined text-lg text-white">play_arrow</span>
            </td>

            <td class="py-3 px-3">
              <div class="flex items-center gap-3">
                <img
                  v-if="song.coverUrl"
                  :src="song.coverUrl"
                  :alt="song.name"
                  class="w-10 h-10 rounded shadow-sm object-cover"
                />
                <div v-else class="w-10 h-10 rounded bg-surface-highlight flex items-center justify-center">
                  <span class="material-symbols-outlined text-text-subdued">music_note</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-white text-base font-normal truncate">{{ song.name }}</span>
                </div>
              </div>
            </td>

            <td class="py-3 px-3 text-text-subdued group-hover:text-white truncate">{{ song.artist }}</td>
            <td class="py-3 px-3 text-text-subdued group-hover:text-white hidden md:table-cell truncate">{{ song.album || '-' }}</td>

            <td class="py-3 px-3 text-text-subdued group-hover:text-white text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  class="btn-icon text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                  title="添加到播放列表"
                  @click.stop="addToQueue(song)"
                >
                  <span class="material-symbols-outlined text-[20px]">playlist_add</span>
                </button>
                <span
                  class="material-symbols-outlined text-primary text-lg fill-1 opacity-0 group-hover:opacity-100 cursor-pointer hover:scale-110 transition-transform"
                  @click.stop="unlikeSong(song)"
                >
                  favorite
                </span>
                <span class="text-white/50 w-12 text-right">{{ formatDuration(song.duration) }}</span>
                <SongMenu
                  :song="song"
                  button-class="opacity-0 group-hover:opacity-100"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="songs.length === 0 && !isLoading" class="flex flex-col items-center justify-center py-20 text-text-subdued">
        <span class="material-symbols-outlined text-6xl mb-4">favorite_border</span>
        <p class="text-lg">还没有喜欢的歌曲</p>
        <p class="text-sm mt-2">去搜索页面发现更多音乐吧</p>
      </div>
    </div>

    <!-- Spacer for bottom player -->
    <div class="h-24"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onActivated } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { getLikedSongs, unlikeSong as apiUnlikeSong, useLikedSongs } from '@/api/liked'
import { formatDuration } from '@/utils/format'
import { globalToast } from '@/composables/useToast'
import SongMenu from '@/components/music/SongMenu.vue'
import type { Song } from '@/api/types'

defineOptions({
  name: 'LikedView'
})

const playerStore = usePlayerStore()

const songs = useLikedSongs()
const isLoading = ref(false)

// 加载喜欢的歌曲
const loadLikedSongs = async () => {
  isLoading.value = true
  try {
    songs.value = await getLikedSongs()
  } catch (error) {
    console.error('Failed to load liked songs:', error)
  } finally {
    isLoading.value = false
  }
}

// 播放歌曲
const playSong = (song: Song, index: number) => {
  const targetIndex = songs.value.findIndex(
    (item) => item.id === song.id && item.platform === song.platform
  )
  const resolvedIndex = targetIndex >= 0 ? targetIndex : index
  playerStore.clearPlaylist()
  playerStore.addToPlaylist(songs.value)
  playerStore.playAt(resolvedIndex)
}

// 播放全部
const playAll = () => {
  if (songs.value.length > 0) {
    playerStore.clearPlaylist()
    playerStore.addToPlaylist(songs.value)
    playerStore.playAt(0)
  }
}

// 添加到播放列表
const addToQueue = (song: Song) => {
  playerStore.addToPlaylist(song)
  globalToast.success('已添加到播放列表')
}

// 取消喜欢
const unlikeSong = async (song: Song) => {
  const success = await apiUnlikeSong(song.platform, song.id)
  if (success) {
    songs.value = songs.value.filter(s => !(s.id === song.id && s.platform === song.platform))
  }
}

const handleLikedChanged = () => {
  loadLikedSongs()
}

onMounted(() => {
  loadLikedSongs()
  window.addEventListener('linmusic-liked-changed', handleLikedChanged)
})

onActivated(() => {
  loadLikedSongs()
})

onUnmounted(() => {
  window.removeEventListener('linmusic-liked-changed', handleLikedChanged)
})
</script>
