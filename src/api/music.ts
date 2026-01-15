// TuneHub API 灏佽
const isIosStandalone = () => {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent || ''
  const isIos = /iPad|iPhone|iPod/.test(ua)
  const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches
    || (window.navigator as any).standalone === true
  return isIos && isStandalone
}

const BASE_URL = import.meta.env.DEV && !isIosStandalone()
  ? '/music-api/api'
  : '/api/music'

export type Platform = 'netease' | 'kuwo' | 'qq'
export type AudioQuality = '128k' | '320k' | 'flac' | 'flac24bit'

export interface SearchResult {
  id: string
  name: string
  artist: string
  album?: string
  platform: Platform
  pic?: string
}

export interface SongInfo {
  name: string
  artist: string
  album: string
  url: string
  pic: string
  lrc: string
}

export interface TopList {
  id: string
  name: string
  updateFrequency?: string
}

export interface PlaylistInfo {
  name: string
  author?: string
}

export interface PlaylistSong {
  id: string
  name: string
  types?: string[]
}

// 鎼滅储姝屾洸锛堝崟骞冲彴锛?
export async function searchSongs(
  keyword: string,
  platform: Platform = 'netease',
  limit: number = 20
): Promise<SearchResult[]> {
  try {
    const url = `${BASE_URL}/?source=${platform}&type=search&keyword=${encodeURIComponent(keyword)}&limit=${limit}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.code === 200 && data.data?.results) {
      return data.data.results.map((item: any) => ({
        id: item.id,
        name: item.name,
        artist: item.artist,
        album: item.album,
        platform: item.platform || platform,
        pic: item.pic
      }))
    }
    return []
  } catch (error) {
    console.error('Search failed:', error)
    return []
  }
}

// 鑱氬悎鎼滅储锛堝骞冲彴锛?
export async function aggregateSearch(keyword: string): Promise<SearchResult[]> {
  try {
    const url = `${BASE_URL}/?type=aggregateSearch&keyword=${encodeURIComponent(keyword)}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.code === 200 && data.data?.results) {
      return data.data.results.map((item: any) => ({
        id: item.id,
        name: item.name,
        artist: item.artist,
        album: item.album,
        platform: item.platform,
        pic: item.pic
      }))
    }
    return []
  } catch (error) {
    console.error('Aggregate search failed:', error)
    return []
  }
}

// 鑾峰彇姝屾洸淇℃伅
export async function getSongInfo(id: string, platform: Platform): Promise<SongInfo | null> {
  try {
    const url = `${BASE_URL}/?source=${platform}&id=${id}&type=info`
    const response = await fetch(url)
    const data = await response.json()

    if (data.code === 200 && data.data) {
      return data.data
    }
    return null
  } catch (error) {
    console.error('Get song info failed:', error)
    return null
  }
}

// 鑾峰彇鎾斁閾炬帴
export function getPlayUrl(id: string, platform: Platform, quality: AudioQuality = '320k'): string {
  return `${BASE_URL}/?source=${platform}&id=${id}&type=url&br=${quality}`
}

// 鑾峰彇灏侀潰鍥剧墖閾炬帴
export function getCoverUrl(id: string, platform: Platform): string {
  return `${BASE_URL}/?source=${platform}&id=${id}&type=pic`
}

// 鑾峰彇姝岃瘝閾炬帴
export function getLyricsUrl(id: string, platform: Platform): string {
  return `${BASE_URL}/?source=${platform}&id=${id}&type=lrc`
}

// 鑾峰彇姝岃瘝鍐呭
export async function getLyrics(id: string, platform: Platform): Promise<string> {
  try {
    const url = getLyricsUrl(id, platform)
    const response = await fetch(url)
    return await response.text()
  } catch (error) {
    console.error('Get lyrics failed:', error)
    return ''
  }
}

// 鑾峰彇鎺掕姒滃垪琛?
export async function getTopLists(platform: Platform): Promise<TopList[]> {
  try {
    const url = `${BASE_URL}/?source=${platform}&type=toplists`
    const response = await fetch(url)
    const data = await response.json()

    if (data.code === 200 && data.data?.list) {
      return data.data.list
    }
    return []
  } catch (error) {
    console.error('Get toplists failed:', error)
    return []
  }
}

// 鑾峰彇鎺掕姒滄瓕鏇?
export async function getTopListSongs(id: string, platform: Platform): Promise<PlaylistSong[]> {
  try {
    const url = `${BASE_URL}/?source=${platform}&id=${id}&type=toplist`
    const response = await fetch(url)
    const data = await response.json()

    if (data.code === 200 && data.data?.list) {
      return data.data.list
    }
    return []
  } catch (error) {
    console.error('Get toplist songs failed:', error)
    return []
  }
}

// 鑾峰彇澶栭儴姝屽崟璇︽儏
export async function getExternalPlaylist(
  id: string,
  platform: Platform
): Promise<{ info: PlaylistInfo; songs: PlaylistSong[] } | null> {
  try {
    const url = `${BASE_URL}/?source=${platform}&id=${id}&type=playlist`
    const response = await fetch(url)
    const data = await response.json()

    if (data.code === 200 && data.data) {
      return {
        info: data.data.info,
        songs: data.data.list || []
      }
    }
    return null
  } catch (error) {
    console.error('Get playlist failed:', error)
    return null
  }
}

