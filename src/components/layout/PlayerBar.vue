<template>

  <div class="fixed bottom-0 left-0 right-0 player-bar px-3 sm:px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between z-50 gap-2 sm:gap-0 py-2 sm:py-0 h-auto sm:h-[90px] mb-2 sm:mb-0">

    <!-- Left: Now Playing -->

    <div class="flex items-center gap-3 sm:gap-4 w-full sm:w-[30%] min-w-0">

      <div

        v-if="currentSong"

        class="album-cover relative group cursor-pointer w-10 h-10 sm:w-14 sm:h-14 rounded-md overflow-hidden flex-shrink-0"

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

        <span class="text-white/40 text-sm">Not playing</span>

      </div>



      <div v-if="currentSong" class="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0">

        <button

          class="btn-icon transition-all duration-300"

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

        <button

          class="btn-icon p-2 rounded-full transition-all duration-300 sm:hidden"

          :class="isQueueOpen ? 'text-primary bg-primary/10' : 'text-white/50 hover:text-white hover:bg-white/5'"

          title="鎾斁闃熷垪"

          @click="toggleQueue"

        >

          <span class="material-symbols-outlined text-[20px]">queue_music</span>

        </button>

        <button

          class="btn-icon text-white/50 hover:text-white transition-all duration-300 sm:hidden"

          @click="toggleMute"

        >

          <Transition name="volume-icon" mode="out-in">

            <span :key="volumeIcon" class="material-symbols-outlined text-[20px]">

              {{ volumeIcon }}

            </span>

          </Transition>

        </button>

      </div>

    </div>



    <!-- Center: Controls -->

      <div class="flex flex-col items-center w-full sm:max-w-[40%] sm:w-full gap-1">

      <div class="flex items-center gap-2 sm:gap-5 mb-1">

        <button

          class="btn-icon p-2 rounded-full transition-all duration-300"

          :class="playMode === 'shuffle' ? 'text-primary bg-primary/10' : 'text-white/50 hover:text-white hover:bg-white/5'"

          title="闅忔満鎾斁"

          @click="toggleShuffleMode"

        >

          <span class="material-symbols-outlined text-[20px]">shuffle</span>

        </button>



        <button

          class="btn-icon text-white/70 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all duration-300"

          title="Previous"

          @click="handlePrev"

        >

          <span class="material-symbols-outlined text-[28px]">skip_previous</span>

        </button>



        <button

          class="btn-play w-12 h-12 sm:w-14 sm:h-14 group"

          title="鎾斁/鏆傚仠"

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

          title="Next"

          @click="handleNext"

        >

          <span class="material-symbols-outlined text-[28px]">skip_next</span>

        </button>



        <button

          class="btn-icon p-2 rounded-full relative transition-all duration-300"

          :class="playMode === 'loop' || playMode === 'single' ? 'text-primary bg-primary/10' : 'text-white/50 hover:text-white hover:bg-white/5'"

          title="寰幆鎾斁"

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

      <div class="w-full flex items-center gap-2 text-[10px] sm:text-[11px] font-medium text-white/50 tabular-nums">

        <span class="w-9 sm:w-10 text-right transition-colors duration-200" :class="{ 'text-white/70': isDraggingProgress }">{{ formattedCurrentTime }}</span>

        <div

          ref="progressBarRef"

          class="progress-bar group relative flex-1"

          :class="{ 'is-dragging': isDraggingProgress }"

          @mousedown="startProgressDrag"

          @touchstart.prevent="startProgressDrag"

        >

          <div

            class="progress-bar-fill"

            :style="{ width: `${displayProgress}%` }"

          >

            <div class="progress-bar-thumb"></div>

          </div>

        </div>

        <span class="w-9 sm:w-10 transition-colors duration-200" :class="{ 'text-white/70': isDraggingProgress }">{{ formattedDuration }}</span>

      </div>

    </div>



    <!-- Right: Volume & Extras -->

    <div class="hidden sm:flex items-center justify-between sm:justify-end gap-2 w-full sm:w-[30%]">

      <button

        class="btn-icon p-2 rounded-full transition-all duration-300"

        :class="isQueueOpen ? 'text-primary bg-primary/10' : 'text-white/50 hover:text-white hover:bg-white/5'"

        title="鎾斁闃熷垪"

        @click="toggleQueue"

      >

        <span class="material-symbols-outlined text-[20px]">queue_music</span>

      </button>



      <button

        class="btn-icon text-white/50 hover:text-white transition-all duration-300 sm:hidden"

        @click="toggleMute"

      >

        <Transition name="volume-icon" mode="out-in">

          <span :key="volumeIcon" class="material-symbols-outlined text-[20px]">

            {{ volumeIcon }}

          </span>

        </Transition>

      </button>



      <!-- Volume Control -->

      <div class="hidden sm:flex items-center gap-2 w-28 group">

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

          @touchstart.prevent="startVolumeDrag"

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



// 鏄惁宸插枩娆?

const isLiked = ref(false)



// 涔嬪墠鐨勯煶閲忥紙鐢ㄤ簬闈欓煶鍒囨崲锛?

const previousVolume = ref(0.7)



// 鎾斁闃熷垪鏄惁鎵撳紑

const isQueueOpen = ref(false)



// 鎷栧姩鐘舵�?

const isDraggingProgress = ref(false)

const isDraggingVolume = ref(false)

const dragProgress = ref(0)

const progressBarRef = ref<HTMLElement | null>(null)

const volumeBarRef = ref<HTMLElement | null>(null)



// 鏄剧ず鐨勮繘搴︼紙鎷栧姩鏃舵樉绀烘嫋鍔ㄨ繘搴︼紝鍚﹀垯鏄剧ず瀹為檯杩涘害锛?

const displayProgress = computed(() => {

  return isDraggingProgress.value ? dragProgress.value : progress.value

})



// 闊抽噺鍥炬爣

const volumeIcon = computed(() => {

  if (volume.value === 0) return 'volume_off'

  if (volume.value < 0.3) return 'volume_mute'

  if (volume.value < 0.7) return 'volume_down'

  return 'volume_up'

})



// 妫�鏌ュ綋鍓嶆瓕鏇叉槸鍚﹀凡鍠滄

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



// 鐩戝惉褰撳墠姝屾洸鍙樺寲

watch(currentSong, () => {

  checkCurrentSongLiked()

}, { immediate: true })



// 鍒囨崲鍠滄鐘舵�?

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



// 鎾斁/鏆傚仠

const handleTogglePlay = () => {

  playerStore.togglePlay()

}



// 涓婁竴棣?

const handlePrev = () => {

  playerStore.playPrev()

}



// 涓嬩竴棣?

const handleNext = () => {

  playerStore.playNext()

}



// 鍒囨崲寰幆妯″紡

const toggleRepeatMode = () => {

  const modes = ['sequence', 'loop', 'single'] as const

  const currentIndex = modes.indexOf(playMode.value as any)

  const nextMode = modes[(currentIndex + 1) % modes.length]

  playerStore.playMode = nextMode

}



// 鍒囨崲闅忔満妯″紡

const toggleShuffleMode = () => {

  if (playMode.value === 'shuffle') {

    playerStore.playMode = 'sequence'

  } else {

    playerStore.playMode = 'shuffle'

  }

}



// 鍒囨崲闈欓煶

const toggleMute = () => {

  if (volume.value > 0) {

    previousVolume.value = volume.value

    playerStore.setVolume(0)

  } else {

    playerStore.setVolume(previousVolume.value)

  }

}



// 杩涘害鏉℃嫋鍔?

const getClientX = (event: MouseEvent | TouchEvent) => {

  if ('touches' in event) {

    const touch = event.touches[0] || event.changedTouches[0]

    return touch ? touch.clientX : null

  }

  return event.clientX

}



// è???o|?????–???

const startProgressDrag = (e: MouseEvent | TouchEvent) => {

  if ('preventDefault' in e) e.preventDefault()

  isDraggingProgress.value = true

  updateProgressFromEvent(e)

}



const updateProgressFromEvent = (e: MouseEvent | TouchEvent) => {

  if (!progressBarRef.value) return

  const clientX = getClientX(e)

  if (clientX === null) return

  const rect = progressBarRef.value.getBoundingClientRect()

  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))

  dragProgress.value = percent * 100

}



// é?3é???????–???

const startVolumeDrag = (e: MouseEvent | TouchEvent) => {

  if ('preventDefault' in e) e.preventDefault()

  isDraggingVolume.value = true

  updateVolumeFromEvent(e)

}



const updateVolumeFromEvent = (e: MouseEvent | TouchEvent) => {

  if (!volumeBarRef.value) return

  const clientX = getClientX(e)

  if (clientX === null) return

  const rect = volumeBarRef.value.getBoundingClientRect()

  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))

  playerStore.setVolume(percent)

}



// é?????/è§|??§?§???¨?’?é???”??¤????

const handlePointerMove = (e: MouseEvent | TouchEvent) => {
  const isDragging = isDraggingProgress.value || isDraggingVolume.value
  if (isDraggingProgress.value) {
    updateProgressFromEvent(e)
  }
  if (isDraggingVolume.value) {
    updateVolumeFromEvent(e)
  }
  if (isDragging && 'touches' in e) {
    e.preventDefault()
  }
}



const handlePointerUp = (e?: TouchEvent | MouseEvent) => {
  const wasDragging = isDraggingProgress.value || isDraggingVolume.value
  if (isDraggingProgress.value) {
    const targetTime = (dragProgress.value / 100) * duration.value
    playerStore.seekTo(targetTime)
  }
  isDraggingProgress.value = false
  isDraggingVolume.value = false
  if (wasDragging && e && 'touches' in e) {
    e.preventDefault()
  }
}



const goToLyrics = () => {

  if (currentSong.value) {

    router.push('/lyrics')

  }

}



// 鍒囨崲鎾斁闃熷垪

const toggleQueue = () => {

  isQueueOpen.value = !isQueueOpen.value

}



onMounted(() => {

  document.addEventListener('mousemove', handlePointerMove)

  document.addEventListener('mouseup', handlePointerUp)

  document.addEventListener('touchmove', handlePointerMove, { passive: false })

  document.addEventListener('touchend', handlePointerUp, { passive: false })

  document.addEventListener('touchcancel', handlePointerUp, { passive: false })

})



onUnmounted(() => {

  document.removeEventListener('mousemove', handlePointerMove)

  document.removeEventListener('mouseup', handlePointerUp)

  document.removeEventListener('touchmove', handlePointerMove)

  document.removeEventListener('touchend', handlePointerUp)

  document.removeEventListener('touchcancel', handlePointerUp)

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









