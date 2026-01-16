<template>
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
    @playing="handlePlaying"
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
let currentLoadingSongId = ''
let pendingSeekTime = -1
let isLoadingNextSong = false

const updateMediaSessionMetadata = (song: Song) => {
  if (!('mediaSession' in navigator)) return

  let artworkSrc = song.coverUrl || ''
  let fullArtworkUrl = artworkSrc
  if (artworkSrc && !artworkSrc.startsWith('http')) {
    fullArtworkUrl = window.location.origin + artworkSrc
  }

  const artwork = fullArtworkUrl
    ? [
        { src: fullArtworkUrl, sizes: '96x96', type: 'image/jpeg' },
        { src: fullArtworkUrl, sizes: '128x128', type: 'image/jpeg' },
        { src: fullArtworkUrl, sizes: '192x192', type: 'image/jpeg' },
        { src: fullArtworkUrl, sizes: '256x256', type: 'image/jpeg' },
        { src: fullArtworkUrl, sizes: '384x384', type: 'image/jpeg' },
        { src: fullArtworkUrl, sizes: '512x512', type: 'image/jpeg' }
      ]
    : []

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.name || 'Unknown',
      artist: song.artist || 'Unknown Artist',
      album: song.album || '',
      artwork
    })
  } catch (e) {
    // ignore
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
    // ignore
  }
}

const handleTimeUpdate = () => {
  if (!audioRef.value) return
  const position = audioRef.value.currentTime
  if (!Number.isFinite(position)) return

  // 只有音频真正在播放时才更新
  if (!audioRef.value.paused) {
    playerStore.currentTime = position
    playerStore.updateLyricIndex()
  }

  const now = Date.now()
  if (now - lastPositionUpdate > 1000) {
    updateMediaSessionPosition()
    lastPositionUpdate = now
  }
}

const handleEnded = () => {
  if (endHandled) return
  endHandled = true

  const mode = playMode.value
  const playlist = playerStore.playlist
  const currentIndex = playerStore.currentIndex

  if (!playlist.length) {
    playerStore.isPlaying = false
    return
  }

  if (mode === 'single') {
    // 单曲循环
    if (audioRef.value) {
      endHandled = false
      audioRef.value.currentTime = 0
      audioRef.value.play().catch(() => {})
    }
  } else if (mode === 'loop' || mode === 'shuffle' || currentIndex < playlist.length - 1) {
    // 播放下一首
    playNextDirectly()
  } else {
    playerStore.isPlaying = false
  }
}

const handleLoadedMetadata = () => {
  if (!audioRef.value) return
  playerStore.duration = audioRef.value.duration || 0

  // 如果有待恢复的播放位置
  if (pendingSeekTime >= 0) {
    audioRef.value.currentTime = pendingSeekTime
    pendingSeekTime = -1
  }

  updateMediaSessionPosition()
}

const handleCanPlay = () => {
  // canplay 比 canplaythrough 更早触发，在后台时更可靠
  if (playerStore.isPlaying && audioRef.value?.paused) {
    audioRef.value.play().catch(() => {})
  }
}

const handleCanPlayThrough = () => {
  playerStore.isLoading = false
  isLoadingNextSong = false

  // 如果应该播放但当前暂停，尝试播放
  if (playerStore.isPlaying && audioRef.value?.paused) {
    audioRef.value.play().catch(() => {})
  }
}

const handlePlay = () => {
  playerStore.isPlaying = true
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'playing'
  }
}

const handlePause = () => {
  // 切歌过程中不更新状态
  if (isLoadingNextSong) return

  playerStore.isPlaying = false
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused'
  }
}

const handleError = () => {
  console.error('Audio error:', audioRef.value?.error)
  playerStore.isLoading = false
}

const handlePlaying = () => {
  playerStore.isLoading = false
  playerStore.isPlaying = true
}

const registerMediaSessionHandlers = () => {
  if (!('mediaSession' in navigator)) return

  try {
    navigator.mediaSession.setActionHandler('play', () => {
      resumePlayback()
    })

    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.value?.pause()
    })

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      playerStore.playPrev()
    })

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      playNextDirectly()
    })

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (audioRef.value && typeof details.seekTime === 'number') {
        audioRef.value.currentTime = details.seekTime
        playerStore.currentTime = details.seekTime
        updateMediaSessionPosition()
      }
    })
  } catch (e) {
    // ignore
  }
}

// 恢复播放（处理 iOS 后台暂停后重新播放）
async function resumePlayback() {
  if (!audioRef.value || !currentSong.value) return

  playerStore.isPlaying = true

  // 先尝试直接播放
  try {
    await audioRef.value.play()
    return
  } catch (e) {
    console.warn('Direct play failed, reloading...')
  }

  // 直接播放失败，重新加载
  const savedTime = playerStore.currentTime
  const url = getPlayUrl(currentSong.value.id, currentSong.value.platform, audioQuality.value)

  pendingSeekTime = savedTime
  playerStore.isLoading = true
  isLoadingNextSong = true

  audioRef.value.src = url
  audioRef.value.load()

  try {
    await audioRef.value.play()
    isLoadingNextSong = false
    playerStore.isLoading = false
  } catch (e) {
    console.warn('Reload play failed:', e)
    // 等待 canplaythrough 事件
  }
}

// 直接播放下一首（用于后台自动切歌）
function playNextDirectly() {
  if (!audioRef.value) return

  const playlist = playerStore.playlist
  const currentIndex = playerStore.currentIndex

  let nextIndex: number
  if (playMode.value === 'shuffle') {
    const count = playlist.length
    if (count <= 1) {
      nextIndex = 0
    } else {
      nextIndex = Math.floor(Math.random() * count)
      if (nextIndex === currentIndex) {
        nextIndex = (currentIndex + 1) % count
      }
    }
  } else {
    nextIndex = (currentIndex + 1) % playlist.length
  }

  const nextSong = playlist[nextIndex]
  if (!nextSong) {
    playerStore.isPlaying = false
    return
  }

  // 标记正在切歌
  isLoadingNextSong = true

  // 更新状态
  const songId = `${nextSong.platform}-${nextSong.id}`
  currentLoadingSongId = songId
  endHandled = false

  playerStore.currentIndex = nextIndex
  playerStore.currentSong = nextSong
  playerStore.currentTime = 0
  playerStore.duration = 0
  playerStore.isLoading = true
  playerStore.isPlaying = true  // 保持播放状态

  // 更新 MediaSession
  updateMediaSessionMetadata(nextSong)
  registerMediaSessionHandlers()

  // 异步获取歌曲信息
  void getSongInfo(nextSong.id, nextSong.platform)
    .then((info) => {
      if (!info || currentLoadingSongId !== songId) return
      if (!nextSong.coverUrl) {
        nextSong.coverUrl = info.pic || getCoverUrl(nextSong.id, nextSong.platform)
      }
      if (!nextSong.album) {
        nextSong.album = info.album
      }
      updateMediaSessionMetadata(nextSong)
    })
    .catch(() => {})

  // 加载并播放 - 不使用 await，让事件处理
  const url = getPlayUrl(nextSong.id, nextSong.platform, audioQuality.value)
  audioRef.value.src = url
  audioRef.value.load()
  audioRef.value.play().catch(() => {
    // 播放失败，canplaythrough 会处理
  })

  loadLyrics(nextSong.id, nextSong.platform)
}

async function playSong() {
  if (!currentSong.value || !audioRef.value) return

  const song = currentSong.value
  const songId = `${song.platform}-${song.id}`
  currentLoadingSongId = songId
  endHandled = false

  playerStore.isLoading = true
  playerStore.currentTime = 0

  registerMediaSessionHandlers()
  updateMediaSessionMetadata(song)

  // 异步获取歌曲信息
  void getSongInfo(song.id, song.platform)
    .then((info) => {
      if (!info || currentLoadingSongId !== songId) return
      if (!song.coverUrl) {
        song.coverUrl = info.pic || getCoverUrl(song.id, song.platform)
      }
      if (!song.album) {
        song.album = info.album
      }
      updateMediaSessionMetadata(song)
    })
    .catch(() => {})

  const url = getPlayUrl(song.id, song.platform, audioQuality.value)
  audioRef.value.src = url
  audioRef.value.load()

  try {
    await audioRef.value.play()
  } catch (e: any) {
    if (e?.name === 'NotAllowedError') {
      // 需要用户交互，设置状态等待用户点击
      playerStore.isPlaying = true
      playerStore.isLoading = false
    }
    // 其他错误等待 canplaythrough 事件
  }

  loadLyrics(song.id, song.platform)
}

async function loadLyrics(id: string, platform: string) {
  try {
    const lrcText = await getLyrics(id, platform as any)
    const lyrics = parseLrc(lrcText)
    playerStore.setLyrics(lyrics)
  } catch (error) {
    playerStore.setLyrics([])
  }
}

function seek(time: number) {
  if (!audioRef.value) return
  const duration = audioRef.value.duration || playerStore.duration
  const clampedTime = Math.max(0, Math.min(duration, time))
  audioRef.value.currentTime = clampedTime
  playerStore.currentTime = clampedTime
  updateMediaSessionPosition()
}

onMounted(() => {
  playerStore.setSeekHandler(seek)
  registerMediaSessionHandlers()
  if (audioRef.value) {
    audioRef.value.volume = volume.value
  }
})

watch(isPlaying, (playing) => {
  if (!audioRef.value) return

  if (playing) {
    if (audioRef.value.paused) {
      if (audioRef.value.src) {
        resumePlayback()
      } else if (currentSong.value) {
        playSong()
      }
    }
  } else {
    if (!audioRef.value.paused) {
      audioRef.value.pause()
    }
  }
})

watch(volume, (newVolume) => {
  if (audioRef.value) {
    audioRef.value.volume = newVolume
  }
})

watch(currentSong, (newSong, oldSong) => {
  if (newSong && (!oldSong || newSong.id !== oldSong.id || newSong.platform !== oldSong.platform)) {
    playSong()
  }
})

onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.src = ''
  }
})
</script>
