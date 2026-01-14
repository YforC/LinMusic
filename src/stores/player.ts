import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Song, LyricLine, PlayMode, AudioQuality } from '@/api/types'

export const usePlayerStore = defineStore('player', () => {
  // 当前播放歌曲
  const currentSong = ref<Song | null>(null)

  // 播放列表
  const playlist = ref<Song[]>([])

  // 当前播放索引
  const currentIndex = ref(-1)

  // 播放状态
  const isPlaying = ref(false)

  // 当前播放时间（秒）
  const currentTime = ref(0)

  // 歌曲总时长（秒）
  const duration = ref(0)

  // 音量 (0-1)
  const volume = ref(0.7)

  // 播放模式
  const playMode = ref<PlayMode>('sequence')

  // 当前歌词
  const lyrics = ref<LyricLine[]>([])

  // 当前歌词索引
  const currentLyricIndex = ref(-1)

  // 音质设置
  const audioQuality = ref<AudioQuality>('320k')

  // 是否正在加载
  const isLoading = ref(false)

  // 外部 seek 处理器（由 AudioController 设置）
  let externalSeekHandler: ((time: number) => void) | null = null

  // 播放进度百分比
  const progress = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
  })

  // 格式化当前时间
  const formattedCurrentTime = computed(() => formatTime(currentTime.value))

  // 格式化总时长
  const formattedDuration = computed(() => formatTime(duration.value))

  // 格式化时间
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 设置当前歌曲
  function setCurrentSong(song: Song) {
    currentSong.value = song
    currentTime.value = 0
    duration.value = song.duration || 0
  }

  // 添加到播放列表
  function addToPlaylist(songs: Song | Song[]) {
    const songsArray = Array.isArray(songs) ? songs : [songs]
    playlist.value.push(...songsArray)
  }

  // 清空播放列表
  function clearPlaylist() {
    playlist.value = []
    currentIndex.value = -1
  }

  // 播放指定索引的歌曲
  function playAt(index: number) {
    if (index >= 0 && index < playlist.value.length) {
      currentIndex.value = index
      setCurrentSong(playlist.value[index])
      isPlaying.value = true
    }
  }

  // 播放/暂停切换
  function togglePlay() {
    isPlaying.value = !isPlaying.value
  }

  // 下一首
  function playNext() {
    if (playlist.value.length === 0) return

    let nextIndex: number

    switch (playMode.value) {
      case 'shuffle':
        nextIndex = Math.floor(Math.random() * playlist.value.length)
        break
      case 'single':
        nextIndex = currentIndex.value
        break
      default:
        nextIndex = (currentIndex.value + 1) % playlist.value.length
    }

    playAt(nextIndex)
  }

  // 上一首
  function playPrev() {
    if (playlist.value.length === 0) return

    let prevIndex: number

    switch (playMode.value) {
      case 'shuffle':
        prevIndex = Math.floor(Math.random() * playlist.value.length)
        break
      default:
        prevIndex = currentIndex.value - 1
        if (prevIndex < 0) prevIndex = playlist.value.length - 1
    }

    playAt(prevIndex)
  }

  // 切换播放模式
  function togglePlayMode() {
    const modes: PlayMode[] = ['sequence', 'loop', 'shuffle', 'single']
    const currentModeIndex = modes.indexOf(playMode.value)
    playMode.value = modes[(currentModeIndex + 1) % modes.length]
  }

  // 设置音量
  function setVolume(value: number) {
    volume.value = Math.max(0, Math.min(1, value))
  }

  // 设置外部 seek 处理器
  function setSeekHandler(handler: (time: number) => void) {
    externalSeekHandler = handler
  }

  // 跳转到指定时间
  function seekTo(time: number) {
    const clampedTime = Math.max(0, Math.min(duration.value, time))
    currentTime.value = clampedTime
    // 调用外部处理器（如果存在）
    if (externalSeekHandler) {
      externalSeekHandler(clampedTime)
    }
  }

  // 设置歌词
  function setLyrics(lrc: LyricLine[]) {
    lyrics.value = lrc
    currentLyricIndex.value = -1
  }

  // 更新当前歌词索引
  function updateLyricIndex() {
    if (lyrics.value.length === 0) {
      currentLyricIndex.value = -1
      return
    }

    for (let i = lyrics.value.length - 1; i >= 0; i--) {
      if (currentTime.value >= lyrics.value[i].time) {
        currentLyricIndex.value = i
        return
      }
    }

    currentLyricIndex.value = -1
  }

  return {
    // State
    currentSong,
    playlist,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    playMode,
    lyrics,
    currentLyricIndex,
    audioQuality,
    isLoading,

    // Computed
    progress,
    formattedCurrentTime,
    formattedDuration,

    // Actions
    setCurrentSong,
    addToPlaylist,
    clearPlaylist,
    playAt,
    togglePlay,
    playNext,
    playPrev,
    togglePlayMode,
    setVolume,
    setSeekHandler,
    seekTo,
    setLyrics,
    updateLyricIndex
  }
})
