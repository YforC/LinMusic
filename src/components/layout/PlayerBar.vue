<template>
  <div class="fixed bottom-0 left-0 right-0 h-[90px] player-bar px-4 flex items-center justify-between z-50">
    <!-- Left: Now Playing -->
    <div class="flex items-center gap-4 w-[30%] min-w-0">
      <div
        v-if="currentSong"
        class="album-cover relative group cursor-pointer w-14 h-14 rounded-md overflow-hidden flex-shrink-0"
        @click="goToLyrics"
      >
        <img
          v-if="currentSong.coverUrl"
          :src="currentSong.coverUrl"
          :alt="currentSong.name"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full bg-[#282828] flex items-center justify-center">
          <span class="material-symbols-outlined text-white/40 text-2xl">music_note</span>
        </div>
        <div class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <span class="material-symbols-outlined text-white text-xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">expand_less</span>
        </div>
      </div>

      <div v-if="currentSong" class="flex flex-col justify-center min-w-0">
        <span class="text-white font-medium text-sm hover:underline truncate cursor-pointer transition-colors duration-200">
          {{ currentSong.name }}
        </span>
        <span class="text-white/50 text-xs hover:text-white/80 hover:underline truncate cursor-pointer transition-colors duration-200">
          {{ currentSong.artist }}
        </span>
      </div>

      <div v-else class="flex flex-col justify-center">
        <span class="text-white/40 text-sm">未播放</span>
      </div>

      <button
        v-if="currentSong"
        class="btn-icon ml-2 flex-shrink-0 transition-all duration-300"
        :class="isLiked ? 'text-primary' : 'text-white/40 hover:text-primary'"
        @click="toggleLike"
      >
        <span
          class="material-symbols-outlined text-[20px] transition-all duration-300"
          :class="[
            { 'fill-1': isLiked },
            isLiked ? 'scale-110' : 'scale-100 hover:scale-110'
          ]"
        >favorite</span>
      </button>
    </div>

    <!-- Center: Controls -->
    <div class="flex flex-col items-center max-w-[40%] w-full gap-1">
      <div class="flex items-center gap-5 mb-1">
        <button
          class="btn-icon p-2 rounded-full transition-all duration-300"
          :class="playMode === 'shuffle' ? 'text-primary bg-primary/10' : 'text-white/50 hover:text-white hover:bg-white/5'"
          title="随机播放"
          @click="toggleShuffleMode"
        >
          <span class="material-symbols-outlined text-[20px]">shuffle</span>
        </button>

        <button
          class="btn-icon text-white/70 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all duration-300"
          title="上一首"
          @click="handlePrev"
        >
          <span class="material-symbols-outlined text-[28px]">skip_previous</span>
        </button>

        <button
          class="btn-play btn-play-large group"
          title="播放/暂停"
          @click="handleTogglePlay"
        >
          <Transition name="play-icon" mode="out-in">
            <span
              :key="isPlaying ? 'pause' : 'play'"
              class="material-symbols-outlined text-[24px] fill-1"
            >
              {{ isPlaying ? 'pause' : 'play_arrow' }}
            </span>
          </Transition>
        </button>

        <button
          class="btn-icon text-white/70 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all duration-300"
          title="下一首"
          @click="handleNext"
        >
          <span class="material-symbols-outlined text-[28px]">skip_next</span>
        </button>

        <button
          class="btn-icon p-2 rounded-full relative transition-all duration-300"
          :class="playMode === 'loop' || playMode === 'single' ? 'text-primary bg-primary/10' : 'text-white/50 hover:text-white hover:bg-white/5'"
          title="循环播放"
          @click="toggleRepeatMode"
        >
          <span class="material-symbols-outlined text-[20px]">
            {{ playMode === 'single' ? 'repeat_one' : 'repeat' }}
          </span>
          <Transition name="dot-fade">
            <div
              v-if="playMode === 'loop' || playMode === 'single'"
              class="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
            ></div>
          </Transition>
        </button>
      </div>

      <!-- Progress Bar -->
      <div class="w-full flex items-center gap-2 text-[11px] font-medium text-white/50 tabular-nums">
        <span class="w-10 text-right transition-colors duration-200" :class="{ 'text-white/70': isDraggingProgress }">{{ formattedCurrentTime }}</span>
        <div
          ref="progressBarRef"
          class="progress-bar group relative flex-1"
          :class="{ 'is-dragging': isDraggingProgress }"
          @mousedown="startProgressDrag"
        >
          <div
            class="progress-bar-fill"
            :style="{ width: `${displayProgress}%` }"
          >
            <div class="progress-bar-thumb"></div>
          </div>
        </div>
        <span class="w-10 transition-colors duration-200" :class="{ 'text-white/70': isDraggingProgress }">{{ formattedDuration }}</span>
      </div>
    </div>

    <!-- Right: Volume & Extras -->
    <div class="flex items-center justify-end gap-2 w-[30%]">
      <button
        class="btn-icon p-2 rounded-full transition-all duration-300"
        :class="isQueueOpen ? 'text-primary bg-primary/10' : 'text-white/50 hover:text-white hover:bg-white/5'"
        title="播放队列"
        @click="toggleQueue"
      >
        <span class="material-symbols-outlined text-[20px]">queue_music</span>
      </button>

      <!-- Volume Control -->
      <div class="flex items-center gap-2 w-28 group">
        <button
          class="btn-icon text-white/50 hover:text-white transition-all duration-300"
          @click="toggleMute"
        >
          <Transition name="volume-icon" mode="out-in">
            <span :key="volumeIcon" class="material-symbols-outlined text-[20px]">
              {{ volumeIcon }}
            </span>
          </Transition>
        </button>
        <div
          ref="volumeBarRef"
          class="volume-slider flex-1"
          @mousedown="startVolumeDrag"
        >
          <div
            class="volume-slider-fill"
            :style="{ width: `${volume * 100}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Play Queue Panel -->
  <PlayQueue :is-open="isQueueOpen" @close="isQueueOpen = false" />
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { likeSong, unlikeSong, checkLikedSongs } from '@/api/liked'
import { storeToRefs } from 'pinia'
import PlayQueue from '@/components/player/PlayQueue.vue'

const router = useRouter()
const playerStore = usePlayerStore()

const {
  currentSong,
  isPlaying,
  duration,
  volume,
  playMode,
  progress,
  formattedCurrentTime,
  formattedDuration
} = storeToRefs(playerStore)

// 是否已喜欢
const isLiked = ref(false)

// 之前的音量（用于静音切换）
const previousVolume = ref(0.7)

// 播放队列是否打开
const isQueueOpen = ref(false)

// 拖动状态
const isDraggingProgress = ref(false)
const isDraggingVolume = ref(false)
const dragProgress = ref(0)
const progressBarRef = ref<HTMLElement | null>(null)
const volumeBarRef = ref<HTMLElement | null>(null)

// 显示的进度（拖动时显示拖动进度，否则显示实际进度）
const displayProgress = computed(() => {
  return isDraggingProgress.value ? dragProgress.value : progress.value
})

// 音量图标
const volumeIcon = computed(() => {
  if (volume.value === 0) return 'volume_off'
  if (volume.value < 0.3) return 'volume_mute'
  if (volume.value < 0.7) return 'volume_down'
  return 'volume_up'
})

// 检查当前歌曲是否已喜欢
const checkCurrentSongLiked = async () => {
  if (!currentSong.value) {
    isLiked.value = false
    return
  }

  const result = await checkLikedSongs([{
    id: currentSong.value.id,
    platform: currentSong.value.platform
  }])

  isLiked.value = !!result[`${currentSong.value.platform}-${currentSong.value.id}`]
}

// 监听当前歌曲变化
watch(currentSong, () => {
  checkCurrentSongLiked()
}, { immediate: true })

// 切换喜欢状态
const toggleLike = async () => {
  if (!currentSong.value) return

  if (isLiked.value) {
    const success = await unlikeSong(currentSong.value.platform, currentSong.value.id)
    if (success) isLiked.value = false
  } else {
    const success = await likeSong(currentSong.value)
    if (success) isLiked.value = true
  }
}

// 播放/暂停
const handleTogglePlay = () => {
  playerStore.togglePlay()
}

// 上一首
const handlePrev = () => {
  playerStore.playPrev()
}

// 下一首
const handleNext = () => {
  playerStore.playNext()
}

// 切换循环模式
const toggleRepeatMode = () => {
  const modes = ['sequence', 'loop', 'single'] as const
  const currentIndex = modes.indexOf(playMode.value as any)
  const nextMode = modes[(currentIndex + 1) % modes.length]
  playerStore.playMode = nextMode
}

// 切换随机模式
const toggleShuffleMode = () => {
  if (playMode.value === 'shuffle') {
    playerStore.playMode = 'sequence'
  } else {
    playerStore.playMode = 'shuffle'
  }
}

// 切换静音
const toggleMute = () => {
  if (volume.value > 0) {
    previousVolume.value = volume.value
    playerStore.setVolume(0)
  } else {
    playerStore.setVolume(previousVolume.value)
  }
}

// 进度条拖动
const startProgressDrag = (e: MouseEvent) => {
  isDraggingProgress.value = true
  updateProgressFromEvent(e)
}

const updateProgressFromEvent = (e: MouseEvent) => {
  if (!progressBarRef.value) return
  const rect = progressBarRef.value.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  dragProgress.value = percent * 100
}

// 音量条拖动
const startVolumeDrag = (e: MouseEvent) => {
  isDraggingVolume.value = true
  updateVolumeFromEvent(e)
}

const updateVolumeFromEvent = (e: MouseEvent) => {
  if (!volumeBarRef.value) return
  const rect = volumeBarRef.value.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  playerStore.setVolume(percent)
}

// 鼠标移动和释放处理
const handleMouseMove = (e: MouseEvent) => {
  if (isDraggingProgress.value) {
    updateProgressFromEvent(e)
  }
  if (isDraggingVolume.value) {
    updateVolumeFromEvent(e)
  }
}

const handleMouseUp = () => {
  if (isDraggingProgress.value) {
    // 拖动结束时 seek 到目标位置
    const targetTime = (dragProgress.value / 100) * duration.value
    playerStore.seekTo(targetTime)
  }
  isDraggingProgress.value = false
  isDraggingVolume.value = false
}

// 跳转到歌词页
const goToLyrics = () => {
  if (currentSong.value) {
    router.push('/lyrics')
  }
}

// 切换播放队列
const toggleQueue = () => {
  isQueueOpen.value = !isQueueOpen.value
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped>
/* Play/Pause icon transition */
.play-icon-enter-active,
.play-icon-leave-active {
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.play-icon-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.play-icon-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* Volume icon transition */
.volume-icon-enter-active,
.volume-icon-leave-active {
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.volume-icon-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.volume-icon-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* Progress bar dragging state */
.progress-bar.is-dragging {
  height: 6px;
}

.progress-bar.is-dragging .progress-bar-fill {
  background: linear-gradient(90deg, var(--primary) 0%, var(--primary-hover) 100%);
  box-shadow: 0 0 12px var(--primary-glow);
}

.progress-bar.is-dragging .progress-bar-thumb {
  transform: translateY(-50%) scale(1.15);
}
</style>
