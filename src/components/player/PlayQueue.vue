<template>
  <Transition name="queue-slide">
    <div
      v-if="isOpen"
      class="fixed right-0 top-0 bottom-[90px] w-[380px] bg-[#121212] border-l border-white/10 z-40 flex flex-col shadow-2xl"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-white/10">
        <h2 class="text-lg font-bold text-white">播放队列</h2>
        <button
          class="btn-icon text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10"
          @click="$emit('close')"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Now Playing -->
      <div v-if="currentSong" class="p-4 border-b border-white/10">
        <h3 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">正在播放</h3>
        <div class="flex items-center gap-3">
          <img
            v-if="currentSong.coverUrl"
            :src="currentSong.coverUrl"
            :alt="currentSong.name"
            class="w-12 h-12 rounded object-cover"
          />
          <div v-else class="w-12 h-12 rounded bg-white/10 flex items-center justify-center">
            <span class="material-symbols-outlined text-white/30">music_note</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-white font-medium truncate">{{ currentSong.name }}</p>
            <p class="text-white/50 text-sm truncate">{{ currentSong.artist }}</p>
          </div>
          <div class="flex items-center gap-1">
            <span class="material-symbols-outlined text-primary text-xl animate-pulse">equalizer</span>
          </div>
        </div>
      </div>

      <!-- Queue List -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="upcomingSongs.length > 0" class="p-4">
          <h3 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">
            接下来播放 · {{ upcomingSongs.length }} 首
          </h3>
          <div class="flex flex-col gap-1">
            <div
              v-for="(song, index) in upcomingSongs"
              :key="`${song.platform}-${song.id}-${index}`"
              class="flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer group transition-colors"
              @click="playAt(currentIndex + 1 + index)"
            >
              <div class="w-6 text-center text-white/30 text-sm group-hover:hidden">
                {{ index + 1 }}
              </div>
              <span class="material-symbols-outlined text-white hidden group-hover:block w-6 text-center">
                play_arrow
              </span>
              <img
                v-if="song.coverUrl"
                :src="song.coverUrl"
                :alt="song.name"
                class="w-10 h-10 rounded object-cover"
              />
              <div v-else class="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                <span class="material-symbols-outlined text-white/30 text-sm">music_note</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-white text-sm font-medium truncate">{{ song.name }}</p>
                <p class="text-white/50 text-xs truncate">{{ song.artist }}</p>
              </div>
              <button
                class="btn-icon text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop="removeFromQueue(currentIndex + 1 + index)"
              >
                <span class="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="flex flex-col items-center justify-center h-full text-white/30 p-8">
          <span class="material-symbols-outlined text-5xl mb-4">queue_music</span>
          <p class="text-center">队列为空</p>
          <p class="text-sm text-center mt-1">播放歌曲后会显示在这里</p>
        </div>
      </div>

      <!-- Footer Actions -->
      <div v-if="playlist.length > 0" class="p-4 border-t border-white/10">
        <button
          class="w-full py-2 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
          @click="clearQueue"
        >
          清空队列
        </button>
      </div>
    </div>
  </Transition>

  <!-- Backdrop -->
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/50 z-30"
      @click="$emit('close')"
    ></div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'

defineProps<{
  isOpen: boolean
}>()

defineEmits<{
  close: []
}>()

const playerStore = usePlayerStore()
const { currentSong, playlist, currentIndex } = storeToRefs(playerStore)

// 接下来要播放的歌曲
const upcomingSongs = computed(() => {
  if (currentIndex.value < 0) return playlist.value
  return playlist.value.slice(currentIndex.value + 1)
})

// 播放指定索引
const playAt = (index: number) => {
  playerStore.playAt(index)
}

// 从队列移除
const removeFromQueue = (index: number) => {
  const newPlaylist = [...playlist.value]
  newPlaylist.splice(index, 1)
  playerStore.playlist = newPlaylist

  // 调整当前索引
  if (index < currentIndex.value) {
    playerStore.currentIndex = currentIndex.value - 1
  }
}

// 清空队列
const clearQueue = () => {
  playerStore.clearPlaylist()
}
</script>

<style scoped>
.queue-slide-enter-active,
.queue-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.queue-slide-enter-from,
.queue-slide-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
