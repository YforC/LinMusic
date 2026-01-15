<template>
  <Transition name="lyrics-page" appear>
  <div v-if="showPage" class="fixed inset-0 z-50 bg-black overflow-hidden flex flex-col text-white">
    <!-- Background Layer: Blurred Album Art with enhanced effects -->
    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <Transition name="bg-fade" mode="out-in">
        <div
          :key="currentSong?.coverUrl || 'default'"
          class="absolute inset-0 bg-cover bg-center blur-[100px] scale-150 opacity-60 transition-all duration-[1.5s]"
          :style="{ backgroundImage: currentSong?.coverUrl ? `url(${currentSong.coverUrl})` : 'none' }"
        ></div>
      </Transition>
      <!-- Gradient overlays for depth -->
      <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70"></div>
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,rgba(0,0,0,0.3)_70%)]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,0.5)_0%,transparent_60%)]"></div>
      <!-- Subtle noise texture -->
      <div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');"></div>
    </div>

    <!-- Main Layout Container -->
    <div class="relative z-10 flex flex-col h-full w-full max-w-[1600px] mx-auto p-4 sm:p-5 md:p-10">
      <!-- Header -->
      <header class="flex items-center justify-between w-full h-14 sm:h-16 shrink-0 z-20 animate-slide-down">
        <button
          class="flex items-center justify-center size-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 text-white group hover:scale-105 active:scale-95 border border-white/5"
          @click="goBack"
        >
          <span class="material-symbols-outlined group-hover:-translate-y-0.5 transition-transform duration-300" style="font-size: 24px;">keyboard_arrow_down</span>
        </button>

        <div class="flex flex-col items-center gap-1">
          <span class="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">正在播放</span>
          <span class="text-base font-semibold text-white/90 max-w-[300px] truncate">{{ currentSong?.name || '未播放' }}</span>
        </div>

        <button
          class="flex items-center justify-center size-10 rounded-full bg-transparent hover:bg-white/10 transition-all duration-300 text-white/70 hover:text-white hover:scale-105 active:scale-95"
          title="全屏"
          @click="toggleFullscreen"
        >
          <span class="material-symbols-outlined" style="font-size: 22px;">{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</span>
        </button>
      </header>

      <!-- Main Content Area: Split View -->
      <main class="flex-1 overflow-hidden min-h-0 py-2 md:py-4">
        <div class="flex h-full w-full flex-row items-stretch gap-6 md:gap-16 overflow-x-auto md:overflow-visible no-scrollbar snap-x snap-mandatory md:snap-none touch-pan-x">
        <!-- Left: Album Art -->
        <div class="w-full md:w-5/12 lg:w-4/12 flex items-center justify-center md:justify-end shrink-0 min-w-full md:min-w-0 max-h-[45vh] md:max-h-full animate-slide-up snap-start md:snap-none" style="animation-delay: 0.1s;">
          <div class="relative aspect-square w-full max-w-[380px] md:max-w-[450px] group">
            <!-- Glow effect behind album -->
            <div
              class="absolute inset-0 rounded-2xl blur-3xl opacity-40 transition-opacity duration-1000"
              :style="{ backgroundColor: dominantColor }"
            ></div>
            <!-- Album container -->
            <div class="absolute inset-0 rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
              <Transition name="cover-fade" mode="out-in">
                <img
                  v-if="currentSong?.coverUrl"
                  :key="currentSong.coverUrl"
                  :src="currentSong.coverUrl"
                  :alt="currentSong.name"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full bg-white/5 flex items-center justify-center">
                  <span class="material-symbols-outlined text-white/20 text-[100px]">music_note</span>
                </div>
              </Transition>
            </div>
            <!-- Subtle border and shine -->
            <div class="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none"></div>
            <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <div class="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-[11px] text-white/70 flex items-center gap-1 md:hidden">
              <span class="material-symbols-outlined text-[14px]">swipe</span>
              左滑查看歌词
            </div>
          </div>
        </div>

        <!-- Right: Lyrics -->
        <div
          ref="lyricsContainer"
          class="w-full md:w-7/12 lg:w-6/12 h-full flex flex-col justify-center relative overflow-hidden animate-slide-up snap-start md:snap-none min-w-full md:min-w-0"
          style="animation-delay: 0.2s;"
        >
          <div class="lyrics-mask h-full w-full overflow-y-auto no-scrollbar scroll-smooth py-20 sm:py-24 md:py-28 px-4 md:px-6">
            <div class="flex flex-col gap-6 md:gap-8 items-start justify-start">
              <p
                v-for="(line, index) in lyrics"
                :key="index"
                :ref="el => setLyricRef(el, index)"
                class="lyric-line font-semibold cursor-pointer select-none leading-relaxed"
                :class="[
                  index === currentLyricIndex
                    ? 'text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] text-white py-2 active'
                    : index === currentLyricIndex - 1 || index === currentLyricIndex + 1
                      ? 'text-lg sm:text-xl md:text-2xl text-white/35 hover:text-white/55'
                      : 'text-base sm:text-lg md:text-xl text-white/20 hover:text-white/40'
                ]"
                @click="seekToLyric(line.time)"
              >
                {{ line.text }}
              </p>

              <!-- Empty State -->
              <div v-if="lyrics.length === 0" class="text-white/25 text-xl text-center w-full py-20">
                <span class="material-symbols-outlined text-6xl mb-4 block opacity-40">lyrics</span>
                <p class="font-medium">暂无歌词</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>

      <!-- Footer: Playback Controls -->
      <footer class="relative w-full shrink-0 flex flex-col justify-center z-20 animate-slide-up py-2 md:py-0 md:h-28" style="animation-delay: 0.3s;">
        <div class="flex flex-col items-center gap-3 md:gap-4 w-full">
          <!-- Mobile top row -->
          <div class="flex items-center justify-between w-full md:hidden">
            <button
              class="btn-icon transition-all duration-300"
              :class="isLiked ? 'text-primary' : 'text-white/30 hover:text-primary'"
              @click="toggleLike"
            >
              <span
                class="material-symbols-outlined transition-all duration-300"
                :class="[{ 'fill-1': isLiked }, isLiked ? 'scale-110' : 'scale-100']"
                style="font-size: 24px;"
              >favorite</span>
            </button>
            <div class="flex items-center gap-2">
              <button class="btn-icon text-white/40 hover:text-white transition-all duration-300" @click="toggleMute">
                <Transition name="volume-icon" mode="out-in">
                  <span :key="volumeIcon" class="material-symbols-outlined" style="font-size: 20px;">{{ volumeIcon }}</span>
                </Transition>
              </button>
              <div
                class="volume-slider h-1 w-20 flex-1 cursor-pointer"
                @mousedown="startVolumeDrag"
              >
                <div
                  class="volume-slider-fill"
                  :style="{ width: `${volume * 100}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Main Player Controls -->
          <div class="flex items-center gap-5 md:gap-7">
            <button
              class="btn-icon p-2 rounded-full transition-all duration-300"
              :class="playMode === 'shuffle' ? 'text-primary bg-primary/10' : 'text-white/40 hover:text-white hover:bg-white/5'"
              @click="toggleShuffle"
            >
              <span class="material-symbols-outlined" style="font-size: 20px;">shuffle</span>
            </button>
            <button class="btn-icon text-white/60 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all duration-300" @click="handlePrev">
              <span class="material-symbols-outlined fill-1" style="font-size: 30px;">skip_previous</span>
            </button>
            <button
              class="btn-play size-14 md:size-16 group"
              @click="handleTogglePlay"
            >
              <Transition name="play-icon" mode="out-in">
                <span
                  :key="isPlaying ? 'pause' : 'play'"
                  class="material-symbols-outlined fill-1"
                  style="font-size: 32px;"
                >
                  {{ isPlaying ? 'pause' : 'play_arrow' }}
                </span>
              </Transition>
            </button>
            <button class="btn-icon text-white/60 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all duration-300" @click="handleNext">
              <span class="material-symbols-outlined fill-1" style="font-size: 30px;">skip_next</span>
            </button>
            <button
              class="btn-icon p-2 rounded-full relative transition-all duration-300"
              :class="playMode === 'loop' || playMode === 'single' ? 'text-primary bg-primary/10' : 'text-white/40 hover:text-white hover:bg-white/5'"
              @click="toggleRepeat"
            >
              <span class="material-symbols-outlined" style="font-size: 20px;">
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
          <div class="w-full flex items-center gap-3 text-[11px] font-medium text-white/40 tabular-nums">
            <span class="w-9 text-right transition-colors duration-200" :class="{ 'text-white/60': isDraggingProgress }">{{ formattedCurrentTime }}</span>
            <div
              ref="progressBarRef"
              class="progress-bar relative group h-1.5 w-full"
              :class="{ 'is-dragging': isDraggingProgress }"
              @mousedown="startProgressDrag"
            >
              <div
                class="progress-bar-fill h-full"
                :style="{ width: `${displayProgress}%` }"
              >
                <div class="progress-bar-thumb"></div>
              </div>
            </div>
            <span class="w-9 transition-colors duration-200" :class="{ 'text-white/60': isDraggingProgress }">{{ formattedDuration }}</span>
          </div>

          <!-- Desktop Side Controls -->
          <div class="hidden md:flex items-center gap-2 absolute left-6 md:left-10">
            <button
              class="btn-icon transition-all duration-300"
              :class="isLiked ? 'text-primary' : 'text-white/30 hover:text-primary'"
              @click="toggleLike"
            >
              <span
                class="material-symbols-outlined transition-all duration-300"
                :class="[{ 'fill-1': isLiked }, isLiked ? 'scale-110' : 'scale-100']"
                style="font-size: 26px;"
              >favorite</span>
            </button>
          </div>
          <div class="hidden md:flex items-center gap-2 absolute right-6 md:right-10">
            <div class="flex items-center gap-2 w-28 group">
              <button class="btn-icon text-white/40 hover:text-white transition-all duration-300" @click="toggleMute">
                <Transition name="volume-icon" mode="out-in">
                  <span :key="volumeIcon" class="material-symbols-outlined" style="font-size: 22px;">{{ volumeIcon }}</span>
                </Transition>
              </button>
              <div
                class="volume-slider h-1 flex-1 cursor-pointer"
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
      </footer>
    </div>
  </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { likeSong, unlikeSong, checkLikedSongs } from '@/api/liked'
import { storeToRefs } from 'pinia'

const router = useRouter()
const playerStore = usePlayerStore()

const {
  currentSong,
  isPlaying,
  volume,
  playMode,
  lyrics,
  currentLyricIndex,
  progress,
  formattedCurrentTime,
  formattedDuration,
  duration
} = storeToRefs(playerStore)

const isLiked = ref(false)
const previousVolume = ref(0.7)
const lyricsContainer = ref<HTMLElement | null>(null)
const lyricRefs = ref<(HTMLElement | null)[]>([])
const isFullscreen = ref(false)
const progressBarRef = ref<HTMLElement | null>(null)
const activeVolumeBar = ref<HTMLElement | null>(null)
const isDraggingProgress = ref(false)
const isDraggingVolume = ref(false)
const dragProgress = ref(0)
const showPage = ref(true)
let leaveTimer: number | null = null

// Dominant color for glow effect (simplified - uses a default warm color)
const dominantColor = ref('#4a3728')

// Display progress (shows drag progress when dragging, otherwise actual progress)
const displayProgress = computed(() => {
  return isDraggingProgress.value ? dragProgress.value : progress.value
})

// 设置歌词元素引用
const setLyricRef = (el: any, index: number) => {
  if (el) {
    lyricRefs.value[index] = el
  }
}

// 音量图标
const volumeIcon = computed(() => {
  if (volume.value === 0) return 'volume_off'
  if (volume.value < 0.3) return 'volume_mute'
  if (volume.value < 0.7) return 'volume_down'
  return 'volume_up'
})

// 检查喜欢状态
const checkLiked = async () => {
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
  checkLiked()
}, { immediate: true })

// 监听歌词索引变化，自动滚动
watch(currentLyricIndex, (index) => {
  if (index >= 0 && lyricRefs.value[index]) {
    nextTick(() => {
      lyricRefs.value[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    })
  }
})

// 监听全屏变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  if (leaveTimer) {
    clearTimeout(leaveTimer)
  }
})

const goBack = () => {
  router.back()
}

const startLeave = (next?: () => void) => {
  if (!showPage.value) {
    next?.()
    return
  }
  showPage.value = false
  if (next) {
    leaveTimer = window.setTimeout(() => {
      next()
    }, 420)
  }
}

onBeforeRouteLeave((to, from, next) => {
  void to
  void from
  startLeave(next)
})

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

const handleTogglePlay = () => {
  playerStore.togglePlay()
}

const handlePrev = () => {
  playerStore.playPrev()
}

const handleNext = () => {
  playerStore.playNext()
}

const toggleShuffle = () => {
  if (playMode.value === 'shuffle') {
    playerStore.playMode = 'sequence'
  } else {
    playerStore.playMode = 'shuffle'
  }
}

const toggleRepeat = () => {
  const modes = ['sequence', 'loop', 'single'] as const
  const currentIndex = modes.indexOf(playMode.value as any)
  playerStore.playMode = modes[(currentIndex + 1) % modes.length]
}

const toggleMute = () => {
  if (volume.value > 0) {
    previousVolume.value = volume.value
    playerStore.setVolume(0)
  } else {
    playerStore.setVolume(previousVolume.value)
  }
}

// 全屏切换
const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  } catch (error) {
    console.error('Fullscreen error:', error)
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
  activeVolumeBar.value = e.currentTarget as HTMLElement
  updateVolumeFromEvent(e)
}

const updateVolumeFromEvent = (e: MouseEvent) => {
  const target = activeVolumeBar.value
  if (!target) return
  const rect = target.getBoundingClientRect()
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
  activeVolumeBar.value = null
}

const seekToLyric = (time: number) => {
  playerStore.seekTo(time)
}
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
