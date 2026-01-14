import type { Song, Playlist } from './types'

const BASE_URL = import.meta.env.DEV ? 'http://localhost:8788/api' : '/api'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

const toPlaylist = (item: any): Playlist => ({
  id: item.id,
  name: item.name,
  description: item.description || undefined,
  coverUrl: item.coverUrl || item.cover_url || undefined,
  songCount: item.songCount ?? item.song_count ?? 0,
  createdAt: item.createdAt || item.created_at,
  updatedAt: item.updatedAt || item.updated_at
})

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    })
  } catch {
    throw new Error('API unavailable. Run `npx wrangler pages dev --port 8788` for local API.')
  }
  const contentType = response.headers.get('content-type') || ''
  const bodyText = await response.text()
  if (!contentType.includes('application/json')) {
    throw new Error('API unavailable. Run `npx wrangler pages dev --port 8788` for local API.')
  }
  const payload = JSON.parse(bodyText) as ApiResponse<T>

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || 'Request failed')
  }

  return payload.data as T
}

export async function getPlaylists(): Promise<Playlist[]> {
  try {
    const data = await request<any[]>('/playlists')
    return data.map(toPlaylist)
  } catch (error) {
    console.error('Get playlists failed:', error)
    return []
  }
}

export async function getPlaylist(id: number): Promise<{ playlist: Playlist; songs: Song[] } | null> {
  try {
    const data = await request<{ playlist: any; songs: Song[] }>(`/playlists/${id}`)
    return {
      playlist: toPlaylist(data.playlist),
      songs: data.songs || []
    }
  } catch (error) {
    console.error('Get playlist failed:', error)
    return null
  }
}

export async function createPlaylist(name: string, description?: string): Promise<Playlist | null> {
  try {
    const data = await request<any>('/playlists', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    })
    return toPlaylist({ ...data, song_count: 0 })
  } catch (error) {
    console.error('Create playlist failed:', error)
    return null
  }
}

export async function updatePlaylist(
  id: number,
  updates: { name?: string; description?: string; coverUrl?: string }
): Promise<boolean> {
  try {
    await request(`/playlists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
    return true
  } catch (error) {
    console.error('Update playlist failed:', error)
    return false
  }
}

export async function deletePlaylist(id: number): Promise<boolean> {
  try {
    await request(`/playlists/${id}`, { method: 'DELETE' })
    return true
  } catch (error) {
    console.error('Delete playlist failed:', error)
    return false
  }
}

export async function addSongToPlaylist(playlistId: number, song: Song): Promise<boolean> {
  try {
    const songToAdd: Song = {
      id: String(song.id),
      platform: song.platform,
      name: song.name || '未知歌曲',
      artist: song.artist || '未知歌手',
      album: song.album,
      duration: song.duration,
      coverUrl: song.coverUrl
    }

    await request('/playlist-songs', {
      method: 'POST',
      body: JSON.stringify({ playlistId, ...songToAdd })
    })
    return true
  } catch (error) {
    console.error('Add song to playlist failed:', error)
    return false
  }
}

export async function removeSongFromPlaylist(
  playlistId: number,
  songId: string,
  platform: string,
  playlistSongId?: number
): Promise<boolean> {
  try {
    let entryId = playlistSongId

    if (!entryId) {
      const data = await getPlaylist(playlistId)
      const match = data?.songs.find(
        (item) => item.id === songId && item.platform === platform
      )
      if (match && typeof match.playlistSongId === 'number') {
        entryId = match.playlistSongId
      }
    }

    if (!entryId) return false

    await request(`/playlist-songs/${entryId}`, { method: 'DELETE' })
    return true
  } catch (error) {
    console.error('Remove song from playlist failed:', error)
    return false
  }
}
