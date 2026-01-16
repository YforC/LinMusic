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
  retryCount = 0

  // 如果需要在 canplay 时播放（自动切歌场景）
  if (shouldPlayOnCanPlay && audioRef.value) {
    shouldPlayOnCanPlay = false
    audioRef.value.play().catch(e => {
      console.warn('Play on canplay failed:', e)
    })
  }
}

const handlePlay = () => {
  playerStore.isPlaying = true
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'playing'
  }
}

const handlePause = () => {
  if (!isSeeking && !isSwitchingSong) {
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

    audioRef.value.src = url
    audioRef.value.load()

    // 设置标志，如果 play() 失败，在 canplay 时重试
    shouldPlayOnCanPlay = true

    try {
      await audioRef.value.play()
      shouldPlayOnCanPlay = false
    } catch (playError: any) {
      if (playError.name === 'NotAllowedError') {
        console.warn('Playback requires user interaction')
        shouldPlayOnCanPlay = false
        playerStore.isPlaying = true
      } else if (playError.name === 'AbortError') {
        // 播放被中断，保持 shouldPlayOnCanPlay = true，等待 canplay 事件
        console.warn('Play aborted, will retry on canplay')
      } else {
        shouldPlayOnCanPlay = false
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
        audioRef.value.play().catch(e => {
          console.warn('Single loop play failed:', e)
        })
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
