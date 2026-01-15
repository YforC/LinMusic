<template>
  <!-- 无 UI 的音频控制组件 -->
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

Howler.autoSuspend = false

const updateMediaSessionMetadata = (song: Song) => {
  if (!('mediaSession' in navigator)) return
  const artwork = song.coverUrl
    ? [{ src: song.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
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
  navigator.mediaSession.setPositionState({
    duration,
    playbackRate: howl.rate(),
    position
  })
}

// 跳转到指定时间
function seek(time: number) {
  if (howl) {
    howl.seek(time)
  }
}

// 注册 seek 处理器
onMounted(() => {
  playerStore.setSeekHandler(seek)
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => {
      if (!playerStore.isPlaying) playerStore.togglePlay()
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      if (playerStore.isPlaying) playerStore.togglePlay()
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      playerStore.playPrev()
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      playerStore.playNext()
    })
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') {
        playerStore.seekTo(details.seekTime)
      }
    })
  }
})

// 播放歌曲
async function playSong() {
  if (!currentSong.value) return

  const song = currentSong.value

  // 停止当前播放并完全清理
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
  playerStore.currentTime = 0

  try {
    updateMediaSessionMetadata(song)
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

    // 获取播放链接
    const url = getPlayUrl(song.id, song.platform, audioQuality.value)

    // 创建 Howl 实例
    howl = new Howl({
      src: [url],
      html5: true,
      format: ['mp3', 'flac', 'wav', 'ogg'],
      volume: volume.value,
      onload: () => {
        playerStore.duration = howl?.duration() || 0
        playerStore.isLoading = false
        updateMediaSessionPosition()
      },
      onplay: () => {
        playerStore.isPlaying = true
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
        const advanced = handleSongEnd()
        if (!advanced) {
          playerStore.isPlaying = false
        }
      },
      onloaderror: (id, error) => {
        console.error('Load error:', id, error)
        playerStore.isLoading = false
      },
      onplayerror: (id, error) => {
        console.error('Play error:', id, error)
        howl?.once('unlock', () => {
          howl?.play()
        })
      }
    })

    // 开始播放
    howl.play()

    // 加载歌词
    loadLyrics(song.id, song.platform)
  } catch (error) {
    console.error('Play failed:', error)
    playerStore.isLoading = false
  }
}

// 更新播放进度
function updateProgress() {
  if (howl && playerStore.isPlaying) {
    playerStore.currentTime = howl.seek() as number
    playerStore.updateLyricIndex()
    const now = Date.now()
    if (now - lastPositionUpdate > 1000) {
      updateMediaSessionPosition()
      lastPositionUpdate = now
    }
    animationId = requestAnimationFrame(updateProgress)
  }
}

// 歌曲结束处理
function handleSongEnd(): boolean {
  const mode = playMode.value
  const playlist = playerStore.playlist
  const currentIndex = playerStore.currentIndex

  if (!playlist.length) return false

  switch (mode) {
    case 'single':
      // 单曲循环
      if (howl) {
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
})

// 监听音量变化
watch(volume, (newVolume) => {
  howl?.volume(newVolume)
})

// 监听当前歌曲变化
watch(currentSong, (newSong, oldSong) => {
  if (newSong && (!oldSong || newSong.id !== oldSong.id || newSong.platform !== oldSong.platform)) {
    playSong()
  }
})

// 清理
onUnmounted(() => {
  if (howl) {
    howl.unload()
    howl = null
  }
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>
