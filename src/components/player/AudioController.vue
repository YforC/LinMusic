<template>
  <!-- 无 UI 组件，仅处理音频播放 -->
  <div class="hidden"></div>
</template>

<script setup lang="ts">
import { watch, onUnmounted, onMounted } from 'vue'
import { Howl, Howler } from 'howler'
import { usePlayerStore } from '@/stores/player'
import { getPlayUrl, getLyrics, getSongInfo, getCoverUrl } from '@/api/music'
import { parseLrc } from '@/utils/lrc-parser'
import { storeToRefs } from 'pinia'
import type { Song } from '@/api/types'

const playerStore = usePlayerStore()
const { currentSong, isPlaying, volume, playMode, audioQuality } = storeToRefs(playerStore)

let howl: Howl | null = null
let animationId: number | null = null
let lastPositionUpdate = 0
let audioNode: HTMLAudioElement | null = null
let endHandled = false
// 标记是否正在 seek，防止 timeupdate 覆盖目标位置
let isSeeking = false
// 重试计数器
let retryCount = 0
const MAX_RETRIES = 3
// 标记是否正在切换歌曲
let isSwitchingSong = false

Howler.autoSuspend = false
Howler.autoUnlock = true

const updateMediaSessionMetadata = (song: Song) => {
  if (!('mediaSession' in navigator)) return
  const artworkSrc = getCoverUrl(song.id, song.platform)
  const artwork = artworkSrc
    ? [{ src: artworkSrc, sizes: '512x512', type: 'image/jpeg' }]
    : []
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.name,
    artist: song.artist,
    album: song.album || '',
    artwork
  })
}

const updateMediaSessionPosition = () => {
  if (!('mediaSession' in navigator)) return
  if (!howl || typeof navigator.mediaSession.setPositionState !== 'function') return
  const duration = howl.duration()
  const position = howl.seek() as number
  if (!Number.isFinite(duration) || duration === 0 || !Number.isFinite(position)) return
  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: howl.rate(),
      position: Math.min(position, duration)
    })
  } catch (e) {
    // 忽略 position state 错误
  }
}

const handleNativeTimeUpdate = () => {
  // 如果正在 seek 或切换歌曲，不更新 currentTime
  if (isSeeking || isSwitchingSong) return
  if (!audioNode) return
  const position = audioNode.currentTime
  if (!Number.isFinite(position)) return
  playerStore.currentTime = position
  playerStore.updateLyricIndex()
  const now = Date.now()
  if (now - lastPositionUpdate > 1000) {
    updateMediaSessionPosition()
    lastPositionUpdate = now
  }
}

const handleNativeEnded = () => {
  handleTrackEnd()
}

const detachAudioNodeListeners = () => {
  if (!audioNode) return
  audioNode.removeEventListener('timeupdate', handleNativeTimeUpdate)
  audioNode.removeEventListener('ended', handleNativeEnded)
  if (audioNode.dataset.lmusicAttached === 'true' && audioNode.parentElement) {
    audioNode.parentElement.removeChild(audioNode)
  }
  audioNode = null
}

const bindAudioNodeListeners = () => {
  detachAudioNodeListeners()
  const node = (howl as any)?._sounds?.[0]?._node as HTMLAudioElement | undefined
  if (!node) return
  audioNode = node
  audioNode.preload = 'auto'
  audioNode.setAttribute('playsinline', 'true')
  audioNode.setAttribute('webkit-playsinline', 'true')
  audioNode.setAttribute('x-webkit-airplay', 'allow')
  if (!audioNode.parentElement && document.body) {
    audioNode.dataset.lmusicAttached = 'true'
    audioNode.style.position = 'fixed'
    audioNode.style.left = '-9999px'
    audioNode.style.width = '1px'
    audioNode.style.height = '1px'
    audioNode.style.opacity = '0'
    audioNode.style.pointerEvents = 'none'
    document.body.appendChild(audioNode)
  }
  audioNode.addEventListener('timeupdate', handleNativeTimeUpdate)
  audioNode.addEventListener('ended', handleNativeEnded)
}

const resumeAudioContext = async () => {
  if (!Howler.ctx || Howler.ctx.state !== 'suspended') return
  try {
    await Howler.ctx.resume()
  } catch (error) {
    console.warn('Audio context resume failed:', error)
  }
}

const resumePlaybackFromGesture = () => {
  if (!currentSong.value || !playerStore.isPlaying) return
  void resumeAudioContext()
  if (!howl) {
    if (!playerStore.isLoading) {
      playSong()
    }
    return
  }
  if (!howl.playing()) {
    howl.play()
  }
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    resumePlaybackFromGesture()
  }
}

const getSeekBase = () => {
  if (howl) {
    const position = howl.seek() as number
    if (Number.isFinite(position)) return position
  }
  return playerStore.currentTime
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
    if (!playerStore.isPlaying) playerStore.togglePlay()
  })
  setMediaSessionHandler('pause', () => {
    if (playerStore.isPlaying) playerStore.togglePlay()
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
    seek(Math.max(0, getSeekBase() - offset))
  })
  setMediaSessionHandler('seekforward', (details) => {
    const offset = details.seekOffset ?? 10
    const duration = playerStore.duration
    seek(Math.min(duration, getSeekBase() + offset))
  })
  setMediaSessionHandler('stop', () => {
    if (playerStore.isPlaying) playerStore.togglePlay()
  })
}

// 跳转到指定时间
function seek(time: number) {
  if (!howl) return

  isSeeking = true
  const clampedTime = Math.max(0, Math.min(playerStore.duration, time))

  // 立即同步 currentTime，避免进度条跳动
  playerStore.currentTime = clampedTime

  // 直接操作底层 audio 元素以获得更精确的 seek
  if (audioNode) {
    try {
      audioNode.currentTime = clampedTime
    } catch (e) {
      // 忽略 seek 错误
    }
  }

  try {
    howl.seek(clampedTime)
  } catch (e) {
    // 忽略 seek 错误
  }

  updateMediaSessionPosition()

  // 延迟重置 isSeeking，等待 seek 完成
  setTimeout(() => {
    isSeeking = false
  }, 500)
}

// 注册 seek 处理器
onMounted(() => {
  playerStore.setSeekHandler(seek)
  document.addEventListener('touchend', resumePlaybackFromGesture, { passive: true })
  document.addEventListener('click', resumePlaybackFromGesture)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  registerMediaSessionHandlers()
})

function handleTrackEnd() {
  if (endHandled) return
  endHandled = true

  // 直接调用，不使用 Promise，避免 iOS 后台问题
  const advanced = handleSongEnd()
  if (!advanced) {
    playerStore.isPlaying = false
  }
}

// 播放歌曲（带重试机制）
async function playSong(isRetry = false) {
  if (!currentSong.value) return

  const song = currentSong.value

  if (!isRetry) {
    retryCount = 0
    isSwitchingSong = true
  }

  endHandled = false
  detachAudioNodeListeners()
  registerMediaSessionHandlers()

  if (howl) {
    howl.stop()
    howl.unload()
    howl = null
  }

  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  playerStore.isLoading = true
  if (!isRetry) {
    playerStore.currentTime = 0
  }

  void resumeAudioContext()

  try {
    updateMediaSessionMetadata(song)

    // 异步获取歌曲信息，不阻塞播放
    void getSongInfo(song.id, song.platform)
      .then((info) => {
        if (!info) return
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

    howl = new Howl({
      src: [url],
      html5: true,
      format: ['mp3', 'flac', 'wav', 'ogg'],
      volume: volume.value,
      preload: true,
      onload: () => {
        playerStore.duration = howl?.duration() || 0
        playerStore.isLoading = false
        isSwitchingSong = false
        retryCount = 0
        updateMediaSessionPosition()
        bindAudioNodeListeners()
      },
      onplay: () => {
        bindAudioNodeListeners()
        playerStore.isPlaying = true
        isSwitchingSong = false
        updateProgress()
      },
      onpause: () => {
        playerStore.isPlaying = false
        if (animationId) {
          cancelAnimationFrame(animationId)
          animationId = null
        }
      },
      onstop: () => {
        playerStore.isPlaying = false
        if (animationId) {
          cancelAnimationFrame(animationId)
          animationId = null
        }
      },
      onend: () => {
        if (animationId) {
          cancelAnimationFrame(animationId)
          animationId = null
        }
        handleTrackEnd()
      },
      onloaderror: (id, error) => {
        console.error('Load error:', id, error)
        handleLoadError()
      },
      onplayerror: (id, error) => {
        console.error('Play error:', id, error)
        handlePlayError()
      }
    })

    howl.play()
    loadLyrics(song.id, song.platform)
  } catch (error) {
    console.error('Play failed:', error)
    handleLoadError()
  }
}

// 处理加载错误
function handleLoadError() {
  playerStore.isLoading = false
  isSwitchingSong = false

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

// 处理播放错误
function handlePlayError() {
  // 尝试解锁并重新播放
  howl?.once('unlock', () => {
    howl?.play()
  })

  // 如果 3 秒后还没播放，尝试重新加载
  setTimeout(() => {
    if (howl && !howl.playing() && playerStore.isPlaying) {
      handleLoadError()
    }
  }, 3000)
}

function updateProgress() {
  if (howl && playerStore.isPlaying) {
    // 如果正在 seek 或切换歌曲，不要覆盖 currentTime
    if (!isSeeking && !isSwitchingSong) {
      const pos = howl.seek() as number
      if (Number.isFinite(pos)) {
        playerStore.currentTime = pos
      }
    }
    playerStore.updateLyricIndex()
    const now = Date.now()
    if (now - lastPositionUpdate > 1000) {
      updateMediaSessionPosition()
      lastPositionUpdate = now
    }
    animationId = requestAnimationFrame(updateProgress)
  }
}

// 处理歌曲结束后的播放逻辑
function handleSongEnd(): boolean {
  const mode = playMode.value
  const playlist = playerStore.playlist
  const currentIndex = playerStore.currentIndex

  if (!playlist.length) return false

  // 同步恢复 audio context（不使用 await，避免 iOS 后台问题）
  void resumeAudioContext()

  switch (mode) {
    case 'single':
      // 单曲循环
      if (howl) {
        endHandled = false
        howl.seek(0)
        howl.play()
        return true
      }
      return false

    case 'loop':
      // 列表循环
      playerStore.playNext()
      return true

    case 'shuffle':
      // 随机播放
      playerStore.playNext()
      return true

    default:
      // 顺序播放
      if (currentIndex < playlist.length - 1) {
        playerStore.playNext()
        return true
      }
      return false
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
  if (!howl) return

  if (playing) {
    void resumeAudioContext()
    if (!howl.playing()) {
      howl.play()
    }
  } else {
    if (howl.playing()) {
      howl.pause()
    }
  }

  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }
}, { flush: 'sync' })

// 监听音量变化
watch(volume, (newVolume) => {
  howl?.volume(newVolume)
})

// 监听当前歌曲变化
watch(currentSong, (newSong, oldSong) => {
  if (newSong && (!oldSong || newSong.id !== oldSong.id || newSong.platform !== oldSong.platform)) {
    playSong()
  }
}, { flush: 'sync' })

// 清理
onUnmounted(() => {
  document.removeEventListener('touchend', resumePlaybackFromGesture)
  document.removeEventListener('click', resumePlaybackFromGesture)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  detachAudioNodeListeners()
  if (howl) {
    howl.unload()
    howl = null
  }
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>
