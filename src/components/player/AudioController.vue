<template>
  <!-- 无 UI 组件，仅处理音频播放 -->
  <audio
    ref="audioRef"
    preload="auto"
    playsinline
    webkit-playsinline
    x-webkit-airplay="allow"
    @timeupdate="handleTimeUpdate"
    @ended="handleEnded"
    @loadedmetadata="handleLoadedMetadata"
    @loadeddata="handleLoadedData"
    @canplay="handleCanPlay"
    @canplaythrough="handleCanPlayThrough"
    @play="handlePlay"
    @pause="handlePause"
    @error="handleError"
    @waiting="handleWaiting"
    @playing="handlePlaying"
    @seeked="handleSeeked"
    @stalled="handleStalled"
    @suspend="handleSuspend"
  ></audio>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { getPlayUrl, getLyrics, getSongInfo, getCoverUrl } from '@/api/music'
import { parseLrc } from '@/utils/lrc-parser'
import { storeToRefs } from 'pinia'
import type { Song } from '@/api/types'

const playerStore = usePlayerStore()
const { currentSong, isPlaying, volume, playMode, audioQuality } = storeToRefs(playerStore)

const audioRef = ref<HTMLAudioElement | null>(null)

let lastPositionUpdate = 0
let endHandled = false
let isSeeking = false
let retryCount = 0
const MAX_RETRIES = 3
let isSwitchingSong = false
let currentLoadingSongId = ''
let shouldPlayOnCanPlay = false
let playRetryTimer: number | null = null
// 上一次的播放位置，用于检测是否真正在播放
let lastPlayPosition = 0
let lastPlayPositionTime = 0
// 检测播放状态的定时器
let playCheckTimer: number | null = null

const updateMediaSessionMetadata = (song: Song) => {
  if (!('mediaSession' in navigator)) return

  // 不设置 artwork，关闭 iOS 锁屏页点击跳转功能
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.name || 'Unknown',
      artist: song.artist || 'Unknown Artist',
      album: song.album || ''
    })
  } catch (e) {
    console.warn('Failed to set media session metadata:', e)
  }
}

const updateMediaSessionPosition = () => {
  if (!('mediaSession' in navigator)) return
  if (!audioRef.value || typeof navigator.mediaSession.setPositionState !== 'function') return
  const duration = audioRef.value.duration
  const position = audioRef.value.currentTime
  if (!Number.isFinite(duration) || duration === 0 || !Number.isFinite(position)) return
  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: audioRef.value.playbackRate,
      position: Math.min(position, duration)
    })
  } catch (e) {
    // 忽略错误
  }
}

// 清除所有定时器
function clearAllTimers() {
  if (playRetryTimer) {
    clearTimeout(playRetryTimer)
    playRetryTimer = null
  }
  if (playCheckTimer) {
    clearInterval(playCheckTimer)
    playCheckTimer = null
  }
}

// 开始播放状态检测
function startPlayCheck() {
  clearAllTimers()

  // 每秒检查一次播放状态
  playCheckTimer = window.setInterval(() => {
    if (!audioRef.value || !playerStore.isPlaying) {
      return
    }

    const currentPos = audioRef.value.currentTime
    const now = Date.now()

    // 如果位置没有变化超过 2 秒，说明可能卡住了
    if (lastPlayPosition === currentPos && now - lastPlayPositionTime > 2000) {
      console.warn('Playback seems stuck, trying to recover...')

      // 如果音频暂停了，尝试播放
      if (audioRef.value.paused) {
        tryPlay()
      } else {
        // 如果没暂停但位置不动，可能是缓冲问题，尝试重新加载
        const currentTime = audioRef.value.currentTime
        audioRef.value.load()
        audioRef.value.currentTime = currentTime
        tryPlay()
      }
    }

    lastPlayPosition = currentPos
    lastPlayPositionTime = now
  }, 1000)
}

// 尝试播放音频
function tryPlay() {
  if (!audioRef.value || !audioRef.value.src) return

  if (playRetryTimer) {
    clearTimeout(playRetryTimer)
    playRetryTimer = null
  }

  // 确保音频已加载
  if (audioRef.value.readyState < 2) {
    // HAVE_CURRENT_DATA
    shouldPlayOnCanPlay = true
    return
  }

  audioRef.value.play().catch(e => {
    console.warn('Play attempt failed:', e.name, e.message)

    if (e.name === 'NotAllowedError') {
      shouldPlayOnCanPlay = true
      playerStore.isPlaying = true

      playRetryTimer = window.setTimeout(() => {
        if (audioRef.value && audioRef.value.paused && playerStore.isPlaying) {
          tryPlay()
        }
      }, 500)
    } else if (e.name === 'AbortError') {
      // 忽略中断错误
    } else {
      // 其他错误，延迟重试
      playRetryTimer = window.setTimeout(() => {
        if (audioRef.value && playerStore.isPlaying) {
          tryPlay()
        }
      }, 1000)
    }
  })
}

// 时间更新事件
const handleTimeUpdate = () => {
  if (isSeeking || isSwitchingSong) return
  if (!audioRef.value) return
  const position = audioRef.value.currentTime
  if (!Number.isFinite(position)) return

  // 更新位置追踪
  if (position !== lastPlayPosition) {
    lastPlayPosition = position
    lastPlayPositionTime = Date.now()
  }

  // 如果 isPlaying 为 true 但音频暂停了，尝试恢复播放
  if (playerStore.isPlaying && audioRef.value.paused) {
    tryPlay()
  }

  playerStore.currentTime = position
  playerStore.updateLyricIndex()
  const now = Date.now()
  if (now - lastPositionUpdate > 1000) {
    updateMediaSessionPosition()
    lastPositionUpdate = now
  }
}

const handleEnded = () => {
  if (endHandled) return
  endHandled = true
  clearAllTimers()
  handleSongEnd()
}

const handleLoadedMetadata = () => {
  if (!audioRef.value) return
  playerStore.duration = audioRef.value.duration || 0
  updateMediaSessionPosition()
}

const handleLoadedData = () => {
  // 数据加载完成，尝试播放
  if (shouldPlayOnCanPlay && audioRef.value) {
    tryPlay()
  }
}

const handleCanPlay = () => {
  playerStore.isLoading = false
  isSwitchingSong = false
  retryCount = 0

  if (shouldPlayOnCanPlay && audioRef.value) {
    shouldPlayOnCanPlay = false
    tryPlay()
  }
}

const handleCanPlayThrough = () => {
  playerStore.isLoading = false

  if (playerStore.isPlaying && audioRef.value?.paused) {
    tryPlay()
  }
}

const handlePlay = () => {
  playerStore.isPlaying = true
  shouldPlayOnCanPlay = false
  lastPlayPosition = audioRef.value?.currentTime || 0
  lastPlayPositionTime = Date.now()
  startPlayCheck()

  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'playing'
  }
}

const handlePause = () => {
  if (!isSeeking && !isSwitchingSong && !shouldPlayOnCanPlay) {
    playerStore.isPlaying = false
    clearAllTimers()
  }
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused'
  }
}

const handleError = () => {
  console.error('Audio error:', audioRef.value?.error)
  handleLoadError()
}

const handleWaiting = () => {
  playerStore.isLoading = true
}

const handlePlaying = () => {
  playerStore.isLoading = false
  playerStore.isPlaying = true
  shouldPlayOnCanPlay = false
  lastPlayPosition = audioRef.value?.currentTime || 0
  lastPlayPositionTime = Date.now()

  if (playRetryTimer) {
    clearTimeout(playRetryTimer)
    playRetryTimer = null
  }

  startPlayCheck()
}

const handleSeeked = () => {
  if (playerStore.isPlaying && audioRef.value?.paused) {
    tryPlay()
  }
}

const handleStalled = () => {
  console.warn('Audio stalled')
  // 音频停滞，尝试恢复
  if (playerStore.isPlaying && audioRef.value) {
    tryPlay()
  }
}

const handleSuspend = () => {
  // 音频加载暂停，可能是 iOS 后台限制
  if (playerStore.isPlaying && audioRef.value?.paused) {
    shouldPlayOnCanPlay = true
  }
}

const setMediaSessionHandler = (
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null
) => {
  try {
    navigator.mediaSession.setActionHandler(action, handler)
  } catch (error) {
    console.warn(`MediaSession action not supported: ${action}`, error)
  }
}

const registerMediaSessionHandlers = () => {
  if (!('mediaSession' in navigator)) return

  setMediaSessionHandler('play', () => {
    if (audioRef.value) {
      tryPlay()
    }
  })

  setMediaSessionHandler('pause', () => {
    shouldPlayOnCanPlay = false
    clearAllTimers()
    audioRef.value?.pause()
  })

  setMediaSessionHandler('previoustrack', () => {
    playerStore.playPrev()
  })

  setMediaSessionHandler('nexttrack', () => {
    playerStore.playNext()
  })

  setMediaSessionHandler('seekto', (details) => {
    if (typeof details.seekTime === 'number') {
      seek(details.seekTime)
    }
  })

  setMediaSessionHandler('seekbackward', (details) => {
    const offset = details.seekOffset ?? 10
    const currentTime = audioRef.value?.currentTime ?? 0
    seek(Math.max(0, currentTime - offset))
  })

  setMediaSessionHandler('seekforward', (details) => {
    const offset = details.seekOffset ?? 10
    const currentTime = audioRef.value?.currentTime ?? 0
    const duration = audioRef.value?.duration ?? 0
    seek(Math.min(duration, currentTime + offset))
  })

  setMediaSessionHandler('stop', () => {
    shouldPlayOnCanPlay = false
    clearAllTimers()
    audioRef.value?.pause()
  })
}

function seek(time: number) {
  if (!audioRef.value) return

  const wasPlaying = !audioRef.value.paused || playerStore.isPlaying
  isSeeking = true

  const duration = audioRef.value.duration || playerStore.duration
  const clampedTime = Math.max(0, Math.min(duration, time))

  playerStore.currentTime = clampedTime

  try {
    audioRef.value.currentTime = clampedTime
  } catch (e) {
    console.warn('Seek error:', e)
  }

  updateMediaSessionPosition()

  setTimeout(() => {
    isSeeking = false
    if (wasPlaying && audioRef.value?.paused) {
      tryPlay()
    }
  }, 100)
}

onMounted(() => {
  playerStore.setSeekHandler(seek)
  registerMediaSessionHandlers()

  if (audioRef.value) {
    audioRef.value.volume = volume.value
  }
})

async function playSong(isRetry = false) {
  if (!currentSong.value || !audioRef.value) return

  const song = currentSong.value
  const songId = `${song.platform}-${song.id}`

  if (!isRetry) {
    retryCount = 0
    isSwitchingSong = true
    currentLoadingSongId = songId
    shouldPlayOnCanPlay = true
    clearAllTimers()
  }

  if (currentLoadingSongId !== songId) {
    return
  }

  endHandled = false
  registerMediaSessionHandlers()

  playerStore.isLoading = true
  playerStore.isPlaying = true // 保持播放状态
  if (!isRetry) {
    playerStore.currentTime = 0
  }

  try {
    updateMediaSessionMetadata(song)

    void getSongInfo(song.id, song.platform)
      .then((info) => {
        if (!info) return
        if (currentLoadingSongId !== songId) return
        if (!song.coverUrl) {
          song.coverUrl = info.pic || getCoverUrl(song.id, song.platform)
        }
        if (!song.album) {
          song.album = info.album
        }
        updateMediaSessionMetadata(song)
      })
      .catch((error) => {
        console.error('Get song info failed:', error)
      })

    const url = getPlayUrl(song.id, song.platform, audioQuality.value)

    // 不要 pause，直接设置新的 src
    audioRef.value.src = url
    audioRef.value.load()

    // 重置位置追踪
    lastPlayPosition = 0
    lastPlayPositionTime = Date.now()

    // 立即尝试播放，并启动检测
    tryPlay()
    startPlayCheck()

    loadLyrics(song.id, song.platform)
  } catch (error) {
    console.error('Play failed:', error)
    if (currentLoadingSongId === songId) {
      handleLoadError()
    }
  }
}

function handleLoadError() {
  playerStore.isLoading = false
  isSwitchingSong = false
  shouldPlayOnCanPlay = false
  clearAllTimers()

  if (retryCount < MAX_RETRIES) {
    retryCount++
    console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`)
    setTimeout(() => {
      if (currentSong.value) {
        playSong(true)
      }
    }, 1000 * retryCount)
  } else {
    console.log('Max retries reached, trying next song')
    retryCount = 0
    const playlist = playerStore.playlist
    const currentIndex = playerStore.currentIndex
    if (playlist.length > 1 && currentIndex < playlist.length - 1) {
      playerStore.playNext()
    } else {
      playerStore.isPlaying = false
    }
  }
}

function handleSongEnd() {
  const mode = playMode.value
  const playlist = playerStore.playlist
  const currentIndex = playerStore.currentIndex

  if (!playlist.length) {
    playerStore.isPlaying = false
    return
  }

  switch (mode) {
    case 'single':
      if (audioRef.value) {
        endHandled = false
        audioRef.value.currentTime = 0
        shouldPlayOnCanPlay = true
        lastPlayPosition = 0
        lastPlayPositionTime = Date.now()
        tryPlay()
      }
      break

    case 'loop':
      playerStore.playNext()
      break

    case 'shuffle':
      playerStore.playNext()
      break

    default:
      if (currentIndex < playlist.length - 1) {
        playerStore.playNext()
      } else {
        playerStore.isPlaying = false
      }
      break
  }
}

async function loadLyrics(id: string, platform: string) {
  try {
    const lrcText = await getLyrics(id, platform as any)
    const lyrics = parseLrc(lrcText)
    playerStore.setLyrics(lyrics)
  } catch (error) {
    console.error('Load lyrics failed:', error)
    playerStore.setLyrics([])
  }
}

watch(isPlaying, (playing) => {
  if (!audioRef.value) return

  if (playing) {
    if (audioRef.value.paused && audioRef.value.src) {
      tryPlay()
    }
    startPlayCheck()
  } else {
    shouldPlayOnCanPlay = false
    clearAllTimers()
    if (!audioRef.value.paused) {
      audioRef.value.pause()
    }
  }
}, { flush: 'sync' })

watch(volume, (newVolume) => {
  if (audioRef.value) {
    audioRef.value.volume = newVolume
  }
})

watch(currentSong, (newSong, oldSong) => {
  if (newSong && (!oldSong || newSong.id !== oldSong.id || newSong.platform !== oldSong.platform)) {
    playSong()
  }
}, { flush: 'sync' })

onUnmounted(() => {
  clearAllTimers()
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.src = ''
  }
})
</script>
