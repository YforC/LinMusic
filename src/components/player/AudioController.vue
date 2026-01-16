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
    @canplay="handleCanPlay"
    @canplaythrough="handleCanPlayThrough"
    @play="handlePlay"
    @pause="handlePause"
    @error="handleError"
    @waiting="handleWaiting"
    @playing="handlePlaying"
    @seeked="handleSeeked"
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
// 标记是否正在 seek，防止 timeupdate 覆盖目标位置
let isSeeking = false
// 重试计数器
let retryCount = 0
const MAX_RETRIES = 3
// 标记是否正在切换歌曲
let isSwitchingSong = false
// 当前加载的歌曲 ID，用于防止竞态条件
let currentLoadingSongId = ''
// 标记是否需要在 canplay 后自动播放
let shouldPlayOnCanPlay = false
// 播放重试定时器
let playRetryTimer: number | null = null

const updateMediaSessionMetadata = (song: Song) => {
  if (!('mediaSession' in navigator)) return

  // 不设置 artwork，避免 iOS 锁屏页点击跳转问题
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.name || 'Unknown',
      artist: song.artist || 'Unknown Artist',
      album: song.album || ''
      // 移除 artwork，防止 iOS 点击跳转
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
    // 忽略 position state 错误
  }
}

// 尝试播放音频
function tryPlay() {
  if (!audioRef.value || !audioRef.value.src) return

  // 清除之前的重试定时器
  if (playRetryTimer) {
    clearTimeout(playRetryTimer)
    playRetryTimer = null
  }

  audioRef.value.play().catch(e => {
    console.warn('Play attempt failed:', e.name, e.message)

    // 如果是 NotAllowedError，设置重试
    if (e.name === 'NotAllowedError') {
      shouldPlayOnCanPlay = true
      playerStore.isPlaying = true // 保持状态

      // 500ms 后重试
      playRetryTimer = window.setTimeout(() => {
        if (audioRef.value && audioRef.value.paused && playerStore.isPlaying) {
          tryPlay()
        }
      }, 500)
    }
  })
}

// 时间更新事件
const handleTimeUpdate = () => {
  if (isSeeking || isSwitchingSong) return
  if (!audioRef.value) return
  const position = audioRef.value.currentTime
  if (!Number.isFinite(position)) return

  // 检查音频是否真正在播放（有声音）
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

// 播放结束事件
const handleEnded = () => {
  if (endHandled) return
  endHandled = true
  handleSongEnd()
}

// 元数据加载完成
const handleLoadedMetadata = () => {
  if (!audioRef.value) return
  playerStore.duration = audioRef.value.duration || 0
  updateMediaSessionPosition()
}

// 可以播放
const handleCanPlay = () => {
  playerStore.isLoading = false
  isSwitchingSong = false
  retryCount = 0

  // 如果需要自动播放，在这里触发
  if (shouldPlayOnCanPlay && audioRef.value) {
    shouldPlayOnCanPlay = false
    tryPlay()
  }
}

// 可以完整播放
const handleCanPlayThrough = () => {
  playerStore.isLoading = false

  // 再次尝试播放，确保音频开始
  if (playerStore.isPlaying && audioRef.value?.paused) {
    tryPlay()
  }
}

// 播放开始
const handlePlay = () => {
  playerStore.isPlaying = true
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'playing'
  }
}

// 暂停
const handlePause = () => {
  // 只有在非 seek 状态且非切换歌曲状态下才更新 isPlaying
  if (!isSeeking && !isSwitchingSong && !shouldPlayOnCanPlay) {
    playerStore.isPlaying = false
  }
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused'
  }
}

// 错误处理
const handleError = () => {
  console.error('Audio error:', audioRef.value?.error)
  handleLoadError()
}

// 等待缓冲
const handleWaiting = () => {
  playerStore.isLoading = true
}

// 正在播放（缓冲结束）
const handlePlaying = () => {
  playerStore.isLoading = false
  playerStore.isPlaying = true
  shouldPlayOnCanPlay = false

  // 清除重试定时器
  if (playRetryTimer) {
    clearTimeout(playRetryTimer)
    playRetryTimer = null
  }
}

// seek 完成
const handleSeeked = () => {
  // seek 完成后，如果应该播放，确保播放
  if (playerStore.isPlaying && audioRef.value?.paused) {
    tryPlay()
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
    if (playRetryTimer) {
      clearTimeout(playRetryTimer)
      playRetryTimer = null
    }
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
    if (playRetryTimer) {
      clearTimeout(playRetryTimer)
      playRetryTimer = null
    }
    audioRef.value?.pause()
  })
}

// 跳转到指定时间
function seek(time: number) {
  if (!audioRef.value) return

  const wasPlaying = !audioRef.value.paused || playerStore.isPlaying
  isSeeking = true

  const duration = audioRef.value.duration || playerStore.duration
  const clampedTime = Math.max(0, Math.min(duration, time))

  // 立即同步 currentTime，避免进度条跳动
  playerStore.currentTime = clampedTime

  try {
    audioRef.value.currentTime = clampedTime
  } catch (e) {
    console.warn('Seek error:', e)
  }

  updateMediaSessionPosition()

  // 延迟重置 isSeeking，并在之后恢复播放
  setTimeout(() => {
    isSeeking = false
    // 如果之前是播放状态，确保继续播放
    if (wasPlaying && audioRef.value?.paused) {
      tryPlay()
    }
  }, 100)
}

// 注册 seek 处理器
onMounted(() => {
  playerStore.setSeekHandler(seek)
  registerMediaSessionHandlers()

  // 设置初始音量
  if (audioRef.value) {
    audioRef.value.volume = volume.value
  }
})

// 播放歌曲
async function playSong(isRetry = false) {
  if (!currentSong.value || !audioRef.value) return

  const song = currentSong.value
  const songId = `${song.platform}-${song.id}`

  if (!isRetry) {
    retryCount = 0
    isSwitchingSong = true
    currentLoadingSongId = songId
    shouldPlayOnCanPlay = true

    // 清除之前的重试定时器
    if (playRetryTimer) {
      clearTimeout(playRetryTimer)
      playRetryTimer = null
    }
  }

  // 检查是否是同一首歌
  if (currentLoadingSongId !== songId) {
    return
  }

  endHandled = false
  registerMediaSessionHandlers()

  playerStore.isLoading = true
  if (!isRetry) {
    playerStore.currentTime = 0
  }

  try {
    updateMediaSessionMetadata(song)

    // 异步获取歌曲信息，不阻塞播放
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

    // 停止当前播放
    audioRef.value.pause()

    // 设置新的音频源
    audioRef.value.src = url

    // 加载
    audioRef.value.load()

    // 尝试播放
    tryPlay()

    // 加载歌词
    loadLyrics(song.id, song.platform)
  } catch (error) {
    console.error('Play failed:', error)
    if (currentLoadingSongId === songId) {
      handleLoadError()
    }
  }
}

// 处理加载错误
function handleLoadError() {
  playerStore.isLoading = false
  isSwitchingSong = false
  shouldPlayOnCanPlay = false

  if (playRetryTimer) {
    clearTimeout(playRetryTimer)
    playRetryTimer = null
  }

  if (retryCount < MAX_RETRIES) {
    retryCount++
    console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`)
    // 延迟重试
    setTimeout(() => {
      if (currentSong.value) {
        playSong(true)
      }
    }, 1000 * retryCount)
  } else {
    // 重试次数用完，尝试播放下一首
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

// 处理歌曲结束后的播放逻辑
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
      // 单曲循环
      if (audioRef.value) {
        endHandled = false
        audioRef.value.currentTime = 0
        shouldPlayOnCanPlay = true
        tryPlay()
      }
      break

    case 'loop':
      // 列表循环
      playerStore.playNext()
      break

    case 'shuffle':
      // 随机播放
      playerStore.playNext()
      break

    default:
      // 顺序播放
      if (currentIndex < playlist.length - 1) {
        playerStore.playNext()
      } else {
        playerStore.isPlaying = false
      }
      break
  }
}

// 加载歌词
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

// 监听播放状态变化
watch(isPlaying, (playing) => {
  if (!audioRef.value) return

  if (playing) {
    if (audioRef.value.paused && audioRef.value.src) {
      tryPlay()
    }
  } else {
    shouldPlayOnCanPlay = false
    if (playRetryTimer) {
      clearTimeout(playRetryTimer)
      playRetryTimer = null
    }
    if (!audioRef.value.paused) {
      audioRef.value.pause()
    }
  }
}, { flush: 'sync' })

// 监听音量变化
watch(volume, (newVolume) => {
  if (audioRef.value) {
    audioRef.value.volume = newVolume
  }
})

// 监听当前歌曲变化
watch(currentSong, (newSong, oldSong) => {
  if (newSong && (!oldSong || newSong.id !== oldSong.id || newSong.platform !== oldSong.platform)) {
    playSong()
  }
}, { flush: 'sync' })

// 清理
onUnmounted(() => {
  if (playRetryTimer) {
    clearTimeout(playRetryTimer)
  }
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.src = ''
  }
})
</script>
