// 歌曲信息类型
export interface Song {
  id: string
  platform: 'netease' | 'kuwo' | 'qq'
  name: string
  artist: string
  album?: string
  duration?: number
  coverUrl?: string
  playlistSongId?: number
}

// 歌单类型
export interface Playlist {
  id: number
  name: string
  description?: string
  coverUrl?: string
  songCount?: number
  createdAt?: string
  updatedAt?: string
}

// 歌词行类型
export interface LyricLine {
  time: number
  text: string
}

// 播放模式
export type PlayMode = 'sequence' | 'loop' | 'shuffle' | 'single'

// 音质选项
export type AudioQuality = '128k' | '320k' | 'flac' | 'flac24bit'

// 用户设置
export interface UserSettings {
  audioQuality: AudioQuality
  crossfade: number
  gaplessPlayback: boolean
  autoPlay: boolean
  theme: 'dark' | 'light' | 'system'
  language: string
}

// API 响应类型
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp?: string
}

// 搜索结果
export interface SearchResult {
  id: string
  name: string
  artist: string
  album?: string
  platform: 'netease' | 'kuwo' | 'qq'
  url?: string
}

// 排行榜
export interface TopList {
  id: string
  name: string
  updateFrequency?: string
}

// 歌曲信息响应
export interface SongInfoResponse {
  name: string
  artist: string
  album: string
  url: string
  pic: string
  lrc: string
}
