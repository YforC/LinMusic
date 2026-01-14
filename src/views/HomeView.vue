<template>
  <div class="relative min-h-full">
    <!-- Background -->
    <div class="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-background-base pointer-events-none"></div>

    <!-- Content -->
    <div class="relative z-10 px-6 pb-8 pt-6 flex flex-col gap-8">
      <!-- 精选歌单 Section -->
      <section class="animate-fade-in">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold tracking-tight text-white hover:underline cursor-pointer">
            精选歌单
          </h2>
          <router-link to="/charts" class="text-sm font-bold text-white/50 hover:text-white hover:underline cursor-pointer transition-colors">
            查看全部
          </router-link>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingPlaylists" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <div v-for="i in 10" :key="i" class="bg-white/5 p-4 rounded-lg">
            <div class="w-full aspect-square mb-4 rounded-md bg-white/10 skeleton"></div>
            <div class="h-4 bg-white/10 rounded mb-2 w-3/4 skeleton"></div>
            <div class="h-3 bg-white/10 rounded w-1/2 skeleton"></div>
          </div>
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <PlaylistCard
            v-for="item in featuredPlaylists"
            :key="`${item.platform}-${item.id}`"
            :playlist="item"
            @click="handleClickPlaylist(item)"
            @play="handlePlayPlaylist(item)"
            @add="handleAddToQueue(item)"
          />
        </div>
      </section>

      <!-- Spacer for bottom player -->
      <div class="h-32"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PlaylistCard from '@/components/music/PlaylistCard.vue'
import type { Song } from '@/api/types'
import { usePlayerStore } from '@/stores/player'
import { globalToast } from '@/composables/useToast'
import { getTopLists, getTopListSongs, getCoverUrl, type Platform } from '@/api/music'
import { normalizeDuration } from '@/utils/format'

defineOptions({
  name: 'HomeView'
})

const router = useRouter()
const playerStore = usePlayerStore()

interface FeaturedPlaylist {
  id: string
  name: string
  description?: string
  coverUrl?: string
  platform: Platform
  songs?: Song[]
}

// 精选歌单
const featuredPlaylists = ref<FeaturedPlaylist[]>([])
const resolveCoverUrl = (item: any, platform: Platform): string | undefined => {
  const candidates = [item.pic, item.coverUrl, item.cover, item.image, item.img]
  const direct = candidates.find((value) => typeof value === 'string' && value.length > 0)
  return direct || getCoverUrl(item.id, platform)
}

const resolveArtist = (item: any): string => {
  if (item.artist) return item.artist
  if (item.singer) return item.singer
  if (item.singerName) return item.singerName
  if (item.author) return item.author
  if (Array.isArray(item.artists) && item.artists.length > 0) {
    return item.artists.map((artist: any) => artist.name || artist).join(' / ')
  }
  if (Array.isArray(item.ar) && item.ar.length > 0) {
    return item.ar.map((artist: any) => artist.name || artist).join(' / ')
  }
  return '未知歌手'
}

const resolveAlbum = (item: any): string | undefined => {
  return item.album || item.albumName || item.al?.name || item.album?.name
}

const resolveDuration = (item: any): number | undefined => {
  return normalizeDuration(item.duration ?? item.time ?? item.dt ?? item.length ?? item.songTime)
}

const isLoadingPlaylists = ref(true)

// 加载精选歌单（只从网易云和QQ音乐获取）
const loadFeaturedPlaylists = async () => {
  isLoadingPlaylists.value = true

  try {
    // 只使用网易云和QQ音乐
    const platforms: Platform[] = ['netease', 'qq']
    const allPlaylists: FeaturedPlaylist[] = []

    // 并行获取各平台排行榜
    const results = await Promise.all(
      platforms.map(async (platform) => {
        try {
          const toplists = await getTopLists(platform)
          return { platform, toplists: toplists.slice(0, 5) } // 每个平台取前5个
        } catch {
          return { platform, toplists: [] }
        }
      })
    )

    // 处理结果
    for (const { platform, toplists } of results) {
      for (const toplist of toplists) {
        allPlaylists.push({
          id: toplist.id,
          name: toplist.name,
          description: `${getPlatformName(platform)} · ${toplist.updateFrequency || '实时更新'}`,
          platform,
          coverUrl: undefined // 稍后加载
        })
      }
    }

    featuredPlaylists.value = allPlaylists.slice(0, 10)

    // 异步加载封面（使用第一首歌的封面）
    loadPlaylistCovers()
  } catch (error) {
    console.error('Failed to load featured playlists:', error)
  } finally {
    isLoadingPlaylists.value = false
  }
}

// 获取平台名称
const getPlatformName = (platform: Platform): string => {
  const names: Record<Platform, string> = {
    netease: '网易云',
    kuwo: '酷我',
    qq: 'QQ音乐'
  }
  return names[platform]
}

// 加载歌单封面
const loadPlaylistCovers = async () => {
  for (const playlist of featuredPlaylists.value) {
    if (!playlist.coverUrl) {
      try {
        const songs = await getTopListSongs(playlist.id, playlist.platform)
        if (songs.length > 0) {
          const firstSong = songs[0]
          playlist.coverUrl = resolveCoverUrl(firstSong, playlist.platform)
          // 缓存歌曲列表
          playlist.songs = songs.map((item: any) => ({
            id: item.id,
            platform: playlist.platform,
            name: item.name,
            artist: resolveArtist(item),
            album: resolveAlbum(item),
            duration: resolveDuration(item),
            coverUrl: resolveCoverUrl(item, playlist.platform)
          }))
        }
      } catch (error) {
        console.error(`Failed to load cover for ${playlist.name}:`, error)
      }
    }
  }
}

// 加载歌单歌曲
const loadPlaylistSongs = async (playlist: FeaturedPlaylist): Promise<Song[]> => {
  if (playlist.songs && playlist.songs.length > 0) {
    return playlist.songs
  }

  try {
    const songs = await getTopListSongs(playlist.id, playlist.platform)
    const songList: Song[] = songs.map((item: any) => ({
      id: item.id,
      platform: playlist.platform,
      name: item.name,
      artist: resolveArtist(item),
      album: resolveAlbum(item),
      duration: resolveDuration(item),
      coverUrl: resolveCoverUrl(item, playlist.platform)
    }))
    playlist.songs = songList
    return songList
  } catch (error) {
    console.error('Failed to load playlist songs:', error)
    return []
  }
}

// 点击歌单 - 跳转到排行榜页面
const handleClickPlaylist = (playlist: FeaturedPlaylist) => {
  router.push({
    name: 'charts',
    query: {
      platform: playlist.platform,
      toplistId: playlist.id
    }
  })
}

// 播放歌单
const handlePlayPlaylist = async (playlist: FeaturedPlaylist) => {
  const songs = await loadPlaylistSongs(playlist)
  if (songs.length > 0) {
    playerStore.clearPlaylist()
    playerStore.addToPlaylist(songs)
    playerStore.playAt(0)
  }
}

// 添加到播放列表
const handleAddToQueue = async (playlist: FeaturedPlaylist) => {
  const songs = await loadPlaylistSongs(playlist)
  if (songs.length > 0) {
    playerStore.addToPlaylist(songs)
    globalToast.success(`已添加 ${songs.length} 首歌曲到播放列表`)
  }
}

onMounted(() => {
  loadFeaturedPlaylists()
})
</script>
