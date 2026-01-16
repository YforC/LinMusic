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
import { useAppStore } from '@/stores/app'
import { getPlayUrl, getLyrics, getSongInfo, getCoverUrl, findAlternativeSong } from '@/api/music'
import { parseLrc } from '@/utils/lrc-parser'
import { normalizeImageUrl } from '@/utils/format'
import { storeToRefs } from 'pinia'
import type { Song, AudioQuality } from '@/api/types'

const playerStore = usePlayerStore()
const appStore = useAppStore()
const { currentSong, isPlaying, volume, playMode, audioQuality } = storeToRefs(playerStore)

// 同步 appStore 的音质设置到 playerStore
watch(
  () => appStore.settings.audioQuality,
  (newQuality) => {
    playerStore.audioQuality = newQuality
  },
  { immediate: true }
)

const audioRef = ref<HTMLAudioElement | null>(null)

let lastPositionUpdate = 0
let endHandled = false
let isSeeking = false
let retryCount = 0
const MAX_RETRIES = 3
let isSwitchingSong = false
let currentLoadingSongId = ''
let isAutoNexting = false
let hasTriedFallback = false
const QUALITY_FALLBACK_ORDER: AudioQuality[] = ['flac24bit', 'flac', '320k', '128k']
let playbackQuality: AudioQuality = '320k'

const getNextLowerQuality = (quality: AudioQuality): AudioQuality | null => {
  const currentIndex = QUALITY_FALLBACK_ORDER.indexOf(quality)
  if (currentIndex < 0 || currentIndex >= QUALITY_FALLBACK_ORDER.length - 1) return null
  return QUALITY_FALLBACK_ORDER[currentIndex + 1]
}

const updateMediaSessionMetadata = (song: Song) => {
  if (!('mediaSession' in navigator)) return

  // 构建封面 URL
  let artworkUrl = song.coverUrl || ''
  if (artworkUrl && !artworkUrl.startsWith('http')) {
    artworkUrl = window.location.origin + artworkUrl
  }

  const artwork = artworkUrl
    ? [
        { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '128x128', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '384x384', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' }
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
    // ignore
  }
}

const handleTimeUpdate = () => {
  if (isSeeking || isSwitchingSong) return
  if (!audioRef.value) return
  const position = audioRef.value.currentTime
  if (!Number.isFinite(position)) return

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
  handleSongEnd()
}

const handleLoadedMetadata = () => {
  if (!audioRef.value) return
  playerStore.duration = audioRef.value.duration || 0
  updateMediaSessionPosition()
}

const handleCanPlay = () => {
  playerStore.isLoading = false
  isSwitchingSong = false
  isAutoNexting = false
  retryCount = 0
}

const handlePlay = () => {
  playerStore.isPlaying = true
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'playing'
  }
}

const handlePause = () => {
  // 切歌、seeking、或自动切歌时不更新状态
  if (!isSeeking && !isSwitchingSong && !isAutoNexting) {
    playerStore.isPlaying = false
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
  isAutoNexting = false
}

const handleSeeked = () => {
  if (playerStore.isPlaying && audioRef.value?.paused) {
    audioRef.value.play().catch(e => {
      console.warn('Play after seeked failed:', e)
    })
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
    audioRef.value?.play()
  })

  setMediaSessionHandler('pause', () => {
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
      audioRef.value.play().catch(e => {
        console.warn('Play after seek failed:', e)
      })
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
    hasTriedFallback = false
    playbackQuality = audioQuality.value
    isSwitchingSong = true
    currentLoadingSongId = songId
  }

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
    const normalizedCover = normalizeImageUrl(song.coverUrl)
    if (normalizedCover && normalizedCover !== song.coverUrl) {
      song.coverUrl = normalizedCover
    }
    updateMediaSessionMetadata(song)

    void getSongInfo(song.id, song.platform)
      .then((info) => {
        if (!info) return
        if (currentLoadingSongId !== songId) return
        if (!song.coverUrl) {
          // 酷我来源使用 getCoverUrl 通过后端代理获取封面（避免 SSL 证书问题）
          song.coverUrl = song.platform === 'kuwo'
            ? getCoverUrl(song.id, song.platform)
            : (normalizeImageUrl(info.pic) || getCoverUrl(song.id, song.platform))
        }
        if (!song.album) {
          song.album = info.album
        }
        updateMediaSessionMetadata(song)
      })
      .catch((error) => {
        console.error('Get song info failed:', error)
      })

    const url = getPlayUrl(song.id, song.platform, playbackQuality)

    audioRef.value.src = url
    audioRef.value.load()

    try {
      await audioRef.value.play()
    } catch (playError: any) {
      if (playError.name === 'NotAllowedError') {
        console.warn('Playback requires user interaction')
        playerStore.isPlaying = true
      } else if (playError.name !== 'AbortError') {
        throw playError
      }
    }

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

  if (retryCount < MAX_RETRIES) {
    retryCount++
    console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`)
    setTimeout(() => {
      if (currentSong.value) {
        playSong(true)
      }
    }, 1000 * retryCount)
  } else if (currentSong.value) {
    const nextQuality = getNextLowerQuality(playbackQuality)
    if (nextQuality) {
      playbackQuality = nextQuality
      retryCount = 0
      console.log(`Retrying with lower quality: ${playbackQuality}`)
      setTimeout(() => {
        if (currentSong.value) {
          playSong(true)
        }
      }, 800)
      return
    }
  } else if (!hasTriedFallback && currentSong.value) {
    // 重试次数用完后，尝试从其他平台换源
    hasTriedFallback = true
    tryFallbackSource()
  } else {
    console.log('Max retries reached and fallback failed, trying next song')
    retryCount = 0
    hasTriedFallback = false
    const playlist = playerStore.playlist
    const currentIndex = playerStore.currentIndex
    if (playlist.length > 1 && currentIndex < playlist.length - 1) {
      playerStore.playNext()
    } else {
      playerStore.isPlaying = false
    }
  }
}

// 尝试从其他平台获取相同歌曲
async function tryFallbackSource() {
  const song = currentSong.value
  if (!song) return

  console.log(`Trying to find alternative source for: ${song.name} - ${song.artist}`)
  playerStore.isLoading = true

  try {
    const alternative = await findAlternativeSong(song.name, song.artist, song.platform)
    if (alternative) {
      console.log(`Found alternative: ${alternative.name} - ${alternative.artist} (${alternative.platform})`)
      // 更新当前歌曲信息为替代源
      const newSong: Song = {
        id: alternative.id,
        name: alternative.name,
        artist: alternative.artist,
        album: alternative.album || song.album,
        platform: alternative.platform,
        coverUrl: normalizeImageUrl(alternative.pic) || song.coverUrl,
        duration: song.duration
      }
      // 更新播放列表中的歌曲
      const playlist = playerStore.playlist
      const currentIndex = playerStore.currentIndex
      if (currentIndex >= 0 && currentIndex < playlist.length) {
        playlist[currentIndex] = newSong
      }
      // 重置重试计数并播放新源
      retryCount = 0
      playerStore.currentSong = newSong
      // currentSong 的 watch 会触发 playSong
    } else {
      console.log('No alternative source found')
      handleLoadError() // 会进入跳过逻辑
    }
  } catch (error) {
    console.error('Find alternative failed:', error)
    handleLoadError() // 会进入跳过逻辑
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

  // 标记正在自动切歌
  isAutoNexting = true
  isSwitchingSong = true

  switch (mode) {
    case 'single':
      if (audioRef.value) {
        endHandled = false
        audioRef.value.currentTime = 0
        audioRef.value.play().catch(e => {
          console.warn('Single loop play failed:', e)
          isAutoNexting = false
          isSwitchingSong = false
        })
      }
      break

    case 'loop':
    case 'shuffle':
      playNextDirectly()
      break

    default:
      if (currentIndex < playlist.length - 1) {
        playNextDirectly()
      } else {
        isAutoNexting = false
        isSwitchingSong = false
        playerStore.isPlaying = false
      }
      break
  }
}

// 直接播放下一首（用于后台自动切歌，保持音频会话连续）
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
    isAutoNexting = false
    isSwitchingSong = false
    playerStore.isPlaying = false
    return
  }

  // 更新 store 状态（不触发 watch，因为我们直接播放）
  const songId = `${nextSong.platform}-${nextSong.id}`
  currentLoadingSongId = songId
  endHandled = false

  playerStore.currentIndex = nextIndex
  playerStore.currentSong = nextSong
  playerStore.currentTime = 0
  playerStore.duration = 0
  playerStore.isLoading = true
  playbackQuality = audioQuality.value

  // 更新 MediaSession
  const normalizedCover = normalizeImageUrl(nextSong.coverUrl)
  if (normalizedCover && normalizedCover !== nextSong.coverUrl) {
    nextSong.coverUrl = normalizedCover
  }
  updateMediaSessionMetadata(nextSong)
  registerMediaSessionHandlers()

  // 异步获取歌曲信息
  void getSongInfo(nextSong.id, nextSong.platform)
    .then((info) => {
      if (!info || currentLoadingSongId !== songId) return
      if (!nextSong.coverUrl) {
        // 酷我来源使用 getCoverUrl 通过后端代理获取封面（避免 SSL 证书问题）
        nextSong.coverUrl = nextSong.platform === 'kuwo'
          ? getCoverUrl(nextSong.id, nextSong.platform)
          : (normalizeImageUrl(info.pic) || getCoverUrl(nextSong.id, nextSong.platform))
      }
      if (!nextSong.album) {
        nextSong.album = info.album
      }
      updateMediaSessionMetadata(nextSong)
    })
    .catch(() => {})

  // 直接设置 src 并播放
  const url = getPlayUrl(nextSong.id, nextSong.platform, playbackQuality)
  audioRef.value.src = url
  audioRef.value.load()
  audioRef.value.play().catch(e => {
    console.warn('Play next directly failed:', e)
  })

  loadLyrics(nextSong.id, nextSong.platform)
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
      audioRef.value.play().catch(e => {
        console.warn('Play failed:', e)
      })
    }
  } else {
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
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.src = ''
  }
})
</script>
