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
    @loadeddata="handleLoadedData"
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

  // 只有当音频真正在播放时才更新进度
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
  handleSongEnd()
}

const handleLoadedMetadata = () => {
  if (!audioRef.value) return
  playerStore.duration = audioRef.value.duration || 0
  updateMediaSessionPosition()
}

const handleLoadedData = () => {
  // loadeddata 在第一帧数据加载后触发，是后台播放的关键时机
  if (shouldPlayOnCanPlay && audioRef.value && audioRef.value.paused) {
    audioRef.value.play().catch(e => {
      console.warn('Play on loadeddata failed:', e)
    })
  }
}

const handleCanPlay = () => {
  playerStore.isLoading = false
  isSwitchingSong = false
  retryCount = 0

  // 如果需要在 canplay 时播放（自动切歌场景）
  if (shouldPlayOnCanPlay && audioRef.value && audioRef.value.paused) {
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
  // 切歌时、seeking 时、或等待 canplay 播放时，不要重置播放状态
  if (!isSeeking && !isSwitchingSong && !shouldPlayOnCanPlay) {
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

  setMediaSessionHandler('play', async () => {
    if (!audioRef.value) return

    try {
      await audioRef.value.play()
    } catch (e: any) {
      console.warn('MediaSession play failed:', e?.name)
      // iOS 后台暂停后可能需要重新加载
      if (currentSong.value && audioRef.value) {
        const url = getPlayUrl(currentSong.value.id, currentSong.value.platform, audioQuality.value)
        const currentTime = playerStore.currentTime
        audioRef.value.src = url
        audioRef.value.load()
        audioRef.value.currentTime = currentTime
        try {
          await audioRef.value.play()
        } catch (e2) {
          console.warn('MediaSession play retry failed:', e2)
        }
      }
    }
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
    case 'shuffle':
      // iOS 后台播放：直接在这里切歌并播放，不通过 store
      playNextSongDirectly()
      break

    default:
      if (currentIndex < playlist.length - 1) {
        playNextSongDirectly()
      } else {
        playerStore.isPlaying = false
      }
      break
  }
}

// iOS 后台播放专用：直接播放下一首，不中断音频会话
async function playNextSongDirectly() {
  if (!audioRef.value) return

  const playlist = playerStore.playlist
  const currentIndex = playerStore.currentIndex

  let nextIndex: number
  if (playMode.value === 'shuffle') {
    // 随机模式
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
    // 顺序或循环模式
    nextIndex = (currentIndex + 1) % playlist.length
  }

  const nextSong = playlist[nextIndex]
  if (!nextSong) {
    playerStore.isPlaying = false
    return
  }

  // 更新 store 状态
  playerStore.currentIndex = nextIndex
  playerStore.currentSong = nextSong
  playerStore.currentTime = 0
  playerStore.duration = 0

  const songId = `${nextSong.platform}-${nextSong.id}`
  currentLoadingSongId = songId
  endHandled = false
  isSwitchingSong = true
  shouldPlayOnCanPlay = true
  playerStore.isLoading = true

  // 更新 MediaSession
  updateMediaSessionMetadata(nextSong)
  registerMediaSessionHandlers()

  // 获取歌曲信息（异步，不阻塞播放）
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

  // 直接设置新的 src 并播放
  const url = getPlayUrl(nextSong.id, nextSong.platform, audioQuality.value)
  audioRef.value.src = url
  audioRef.value.load()

  try {
    await audioRef.value.play()
    shouldPlayOnCanPlay = false
    isSwitchingSong = false
    playerStore.isLoading = false
  } catch (e: any) {
    console.warn('Direct play next failed:', e?.name)
    // 保持 shouldPlayOnCanPlay = true，等待 canplay 事件
  }

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

watch(isPlaying, async (playing) => {
  if (!audioRef.value) return

  if (playing) {
    if (audioRef.value.paused && audioRef.value.src) {
      try {
        await audioRef.value.play()
      } catch (e: any) {
        console.warn('Play failed:', e?.name)
        // iOS 后台暂停后可能需要重新加载
        if (currentSong.value) {
          const url = getPlayUrl(currentSong.value.id, currentSong.value.platform, audioQuality.value)
          const currentTime = playerStore.currentTime
          audioRef.value.src = url
          audioRef.value.load()
          audioRef.value.currentTime = currentTime
          try {
            await audioRef.value.play()
          } catch (e2) {
            console.warn('Play retry failed:', e2)
          }
        }
      }
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
