// 内部 API - 喜欢的歌曲管理
import { ref } from 'vue'
import type { Song } from './types'

// ============ 本地存储方案（主要使用） ============

const LOCAL_LIKED_KEY = 'linmusic-liked'
const likedSongs = ref<Song[]>(getLocalLikedSongs())

export function useLikedSongs() {
  return likedSongs
}

function getLocalLikedSongs(): Song[] {
  try {
    const data = localStorage.getItem(LOCAL_LIKED_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function addLocalLikedSong(song: Song): boolean {
  try {
    const songs = getLocalLikedSongs()
    const exists = songs.some(s => s.id === song.id && s.platform === song.platform)
    if (!exists) {
      songs.unshift(song)
      localStorage.setItem(LOCAL_LIKED_KEY, JSON.stringify(songs))
    }
    likedSongs.value = songs
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('linmusic-liked-changed'))
    }
    return true
  } catch {
    return false
  }
}

function removeLocalLikedSong(platform: string, songId: string): boolean {
  try {
    const songs = getLocalLikedSongs()
    const filtered = songs.filter(s => !(s.id === songId && s.platform === platform))
    localStorage.setItem(LOCAL_LIKED_KEY, JSON.stringify(filtered))
    likedSongs.value = filtered
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('linmusic-liked-changed'))
    }
    return true
  } catch {
    return false
  }
}

function checkLocalLikedSongs(songs: Array<{ id: string; platform: string }>): Record<string, boolean> {
  const liked = getLocalLikedSongs()
  const result: Record<string, boolean> = {}
  for (const song of songs) {
    const key = `${song.platform}-${song.id}`
    result[key] = liked.some(s => s.id === song.id && s.platform === song.platform)
  }
  return result
}

// ============ 导出的 API 函数（直接使用本地存储） ============

// 获取喜欢的歌曲列表
export async function getLikedSongs(): Promise<Song[]> {
  likedSongs.value = getLocalLikedSongs()
  return likedSongs.value
}

// 添加喜欢的歌曲
export async function likeSong(song: Song): Promise<boolean> {
  return addLocalLikedSong(song)
}

// 取消喜欢
export async function unlikeSong(platform: string, songId: string): Promise<boolean> {
  return removeLocalLikedSong(platform, songId)
}

// 批量检查歌曲是否已喜欢
export async function checkLikedSongs(
  songs: Array<{ id: string; platform: string }>
): Promise<Record<string, boolean>> {
  return checkLocalLikedSongs(songs)
}
