<template>
  <div class="relative min-h-full bg-background-base">
    <!-- Background Gradient -->
    <div
      v-if="!isLoading && currentToplistCover"
      class="absolute top-0 left-0 w-full h-[340px] z-0 pointer-events-none opacity-80 transition-colors duration-700"
      :style="{ background: `linear-gradient(180deg, ${dominantColor} 0%, #121212 100%)` }"
    ></div>

    <!-- Header -->
    <div class="relative z-10 px-6 md:px-8 pt-8 pb-6 flex flex-col md:flex-row items-end gap-6">
      <div
        class="size-[192px] md:size-[232px] shrink-0 shadow-[0_8px_40px_rgba(0,0,0,0.5)] flex items-center justify-center rounded-lg overflow-hidden bg-white/5"
      >
        <img
          v-if="currentToplistCover && !isLoading"
          ref="coverImgRef"
          :src="currentToplistCover"
          :alt="currentToplist?.name"
          class="w-full h-full object-cover"
          @load="extractColor"
        />
        <div v-else class="w-full h-full flex items-center justify-center">
          <span v-if="isLoading" class="material-symbols-outlined text-white/30 text-[60px] animate-pulse">music_note</span>
          <span v-else class="material-symbols-outlined text-white/30 text-[60px]">trophy</span>
        </div>
      </div>

      <div class="flex flex-col gap-2 w-full pb-2">
        <span class="text-xs font-bold uppercase tracking-wider mt-4 md:mt-0 hidden md:block text-white/60">排行榜</span>
        <h1 v-if="currentToplist?.name" class="text-3xl md:text-[72px] lg:text-[86px] md:leading-none font-black tracking-tighter text-white mb-2 line-clamp-2">
          {{ currentToplist.name }}
        </h1>
        <div v-else class="h-16 md:h-24 bg-white/5 rounded-lg w-3/4 skeleton"></div>
        <p v-if="currentToplist" class="text-white/70 text-sm font-medium">{{ getPlatformName(currentPlatform) }} 上目前播放次数最多的歌曲。每日更新。</p>
        <div v-if="currentToplist" class="flex items-center gap-1 mt-2 text-sm font-bold flex-wrap">
          <div class="bg-primary text-black size-6 rounded-full flex items-center justify-center text-[10px] font-black">L</div>
          <span class="hover:underline cursor-pointer">LinMusic</span>
          <span class="text-white/70 font-normal">• {{ songs.length }} 首歌曲</span>
        </div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="relative z-10 px-6 md:px-8 py-6 bg-background-base/30 backdrop-blur-sm sticky -top-[1px] md:static">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-4 md:gap-6">
          <button
            class="btn-play size-14 shadow-lg"
            :disabled="isLoading || songs.length === 0"
            @click="playAll"
          >
            <span class="material-symbols-outlined text-[32px] fill-1">play_arrow</span>
          </button>
          <button
            class="btn-icon text-white/50 hover:text-white"
            title="添加到播放列表"
            :disabled="isLoading || songs.length === 0"
            @click="addAllToQueue"
          >
            <span class="material-symbols-outlined text-[28px]">playlist_add</span>
          </button>
        </div>

        <!-- Platform Tabs -->
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-white/50 uppercase tracking-widest mr-2 hidden sm:block">平台</span>
          <div class="flex items-center bg-white/10 rounded-full p-1">
            <button
              v-for="platform in platforms"
              :key="platform.id"
              class="px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200"
              :class="currentPlatform === platform.id
                ? 'bg-white text-black shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/5'"
              @click="changePlatform(platform.id)"
            >
              {{ platform.name }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toplist Selector -->
    <div class="relative z-10 px-6 md:px-8 py-4 border-b border-white/10">
      <div
        ref="toplistScrollRef"
        class="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin"
        style="-webkit-overflow-scrolling: touch;"
      >
        <button
          v-for="toplist in toplists"
          :key="toplist.id"
          class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0"
          :class="currentToplist?.id === toplist.id
            ? 'bg-white text-black'
            : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'"
          @click="selectToplist(toplist)"
        >
          {{ toplist.name }}
        </button>
      </div>
    </div>

    <!-- Table Header -->
    <div class="px-6 md:px-8 sticky top-0 bg-background-base z-20 border-b border-white/10 pb-2 pt-2 mb-2 shadow-sm">
      <div class="grid grid-cols-[16px_1fr_40px] md:grid-cols-[16px_4fr_3fr_minmax(60px,1fr)] gap-4 text-sm font-normal text-white/50 items-center px-4">
        <div class="text-center text-base">#</div>
        <div class="text-xs font-medium uppercase tracking-wider">标题</div>
        <div class="hidden md:block text-xs font-medium uppercase tracking-wider">专辑</div>
        <div class="justify-self-end">
          <span class="material-symbols-outlined text-[18px]">schedule</span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="px-6 md:px-8 pb-32 flex flex-col gap-1">
      <div
        v-for="i in 10"
        :key="i"
        class="grid grid-cols-[16px_1fr_40px] md:grid-cols-[16px_4fr_3fr_minmax(60px,1fr)] gap-4 items-center px-4 py-2"
      >
        <div class="flex items-center justify-center">
          <div class="w-4 h-4 bg-white/10 rounded skeleton"></div>
        </div>
        <div class="flex items-center gap-4">
          <div class="size-10 rounded bg-white/10 skeleton"></div>
          <div class="flex flex-col gap-2 flex-1">
            <div class="h-4 bg-white/10 rounded w-3/4 skeleton"></div>
            <div class="h-3 bg-white/10 rounded w-1/2 skeleton"></div>
          </div>
        </div>
        <div class="hidden md:block">
          <div class="h-3 bg-white/10 rounded w-2/3 skeleton"></div>
        </div>
        <div class="justify-self-end">
          <div class="h-3 bg-white/10 rounded w-10 skeleton"></div>
        </div>
      </div>
    </div>

    <!-- Songs List -->
    <div v-else class="px-6 md:px-8 pb-32 flex flex-col gap-1">
      <div
        v-for="(song, index) in songs"
        :key="`${song.platform}-${song.id}`"
        class="song-row group grid grid-cols-[16px_1fr_auto] md:grid-cols-[16px_4fr_3fr_minmax(60px,1fr)_auto] gap-4 items-center px-4 py-2 cursor-pointer"
        @click="playSong(song, index)"
      >
        <div class="flex items-center justify-center text-white/50 font-medium text-base w-full">
          <span class="rank-num" :class="{ 'text-primary font-bold': index < 3 }">{{ index + 1 }}</span>
          <span class="rank-play text-white material-symbols-outlined text-[20px] fill-1">play_arrow</span>
        </div>

        <div class="flex items-center gap-4 overflow-hidden">
          <img
            v-if="song.coverUrl"
            :src="song.coverUrl"
            :alt="song.name"
            class="size-10 rounded shadow-sm object-cover shrink-0"
            loading="lazy"
          />
          <div v-else class="size-10 rounded bg-white/5 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-white/30">music_note</span>
          </div>

          <div class="flex flex-col truncate pr-2">
            <span class="text-white font-medium truncate text-base mb-0.5">{{ song.name }}</span>
            <span class="text-sm text-white/50 group-hover:text-white/80 hover:underline truncate transition-colors">{{ song.artist }}</span>
          </div>
        </div>

        <div class="hidden md:block text-white/50 text-sm group-hover:text-white/80 hover:underline truncate transition-colors">
          {{ song.album || '-' }}
        </div>

        <div class="hidden md:block justify-self-end text-white/50 text-sm tabular-nums">
          {{ formatSongDuration(song.duration) }}
        </div>

        <div class="flex items-center gap-1">
          <button
            class="btn-icon text-white/30 hover:text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200"
            title="添加到播放列表"
            @click.stop="addToQueue(song)"
          >
            <span class="material-symbols-outlined text-[20px]">playlist_add</span>
          </button>
          <SongMenu
            :song="song"
            button-class="opacity-100 md:opacity-0 md:group-hover:opacity-100"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="songs.length === 0 && !isLoading" class="flex flex-col items-center justify-center py-20 text-white/50">
        <span class="material-symbols-outlined text-6xl mb-4">music_off</span>
        <p>暂无歌曲</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { getTopLists, getTopListSongs, getCoverUrl, type Platform, type TopList } from '@/api/music'
import { globalToast } from '@/composables/useToast'
import { normalizeDuration, normalizeImageUrl } from '@/utils/format'
import SongMenu from '@/components/music/SongMenu.vue'
import type { Song } from '@/api/types'

defineOptions({
  name: 'ChartsView'
})

const playerStore = usePlayerStore()
const route = useRoute()

const platforms = [
  { id: 'netease' as Platform, name: '网易云' },
  { id: 'kuwo' as Platform, name: '酷我' },
  { id: 'qq' as Platform, name: 'QQ音乐' }
]

const currentPlatform = ref<Platform>('netease')
const toplists = ref<TopList[]>([])
const currentToplist = ref<TopList | null>(null)
const songs = ref<Song[]>([])
const isLoading = ref(false)
const dominantColor = ref('#121212')
const coverImgRef = ref<HTMLImageElement | null>(null)
const toplistScrollRef = ref<HTMLElement | null>(null)

const resolveSongId = (item: any): string => {
  const value = item.id ?? item.songId ?? item.song_id ?? item.rid ?? item.musicId ?? item.mid ?? item.musicrid ?? item.musicRid ?? item.hash
  return value ? String(value) : ''
}

const resolveSongName = (item: any): string => {
  return item.name || item.songName || item.song_name || item.title || '未知歌曲'
}

const resolveCoverUrl = (item: any, platform: Platform, songId?: string): string | undefined => {
  const candidates = [
    item.pic,
    item.coverUrl,
    item.cover,
    item.image,
    item.img,
    item.picUrl,
    item.pic_url,
    item.pic120,
    item.pic300,
    item.albumPic,
    item.album_pic
  ]
  const direct = candidates.find((value) => typeof value === 'string' && value.trim().length > 0)
  const normalized = normalizeImageUrl(direct)
  if (normalized) return normalized
  if (songId) return normalizeImageUrl(getCoverUrl(songId, platform))
  return undefined
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

// 当前排行榜封面（使用第一首歌的封面）
const currentToplistCover = computed(() => {
  if (songs.value.length > 0 && songs.value[0].coverUrl) {
    return songs.value[0].coverUrl
  }
  return null
})

// 格式化歌曲时长
const formatSongDuration = (duration?: number): string => {
  const normalized = normalizeDuration(duration)
  if (!normalized || normalized <= 0) return '-'
  const mins = Math.floor(normalized / 60)
  const secs = Math.floor(normalized % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 获取平台名称
const getPlatformName = (platform: Platform): string => {
  const names: Record<Platform, string> = {
    netease: '网易云音乐',
    kuwo: '酷我音乐',
    qq: 'QQ音乐'
  }
  return names[platform]
}

// 从图片提取主色调
const getRoutePlatform = (): Platform | null => {
  const value = route.query.platform
  if (typeof value !== 'string') return null
  return platforms.some((platform) => platform.id === value) ? (value as Platform) : null
}

const getRouteToplistId = (): string | null => {
  const value = route.query.toplistId
  if (typeof value !== 'string') return null
  return value.trim() ? value : null
}

const extractColor = () => {
  const img = coverImgRef.value
  if (!img) return

  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 50
    canvas.height = 50
    ctx.drawImage(img, 0, 0, 50, 50)

    const imageData = ctx.getImageData(0, 0, 50, 50).data
    let r = 0, g = 0, b = 0, count = 0

    for (let i = 0; i < imageData.length; i += 16) {
      r += imageData[i]
      g += imageData[i + 1]
      b += imageData[i + 2]
      count++
    }

    r = Math.floor(r / count)
    g = Math.floor(g / count)
    b = Math.floor(b / count)

    // 确保颜色不会太亮或太暗
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    if (brightness > 180) {
      r = Math.floor(r * 0.6)
      g = Math.floor(g * 0.6)
      b = Math.floor(b * 0.6)
    } else if (brightness < 30) {
      r = Math.min(255, r + 40)
      g = Math.min(255, g + 40)
      b = Math.min(255, b + 40)
    }

    dominantColor.value = `rgb(${r}, ${g}, ${b})`
  } catch (error) {
    // 跨域图片无法提取颜色，使用默认颜色
    dominantColor.value = '#121212'
  }
}

// 切换平台
const changePlatform = async (platform: Platform, targetToplistId?: string | null) => {
  if (platform === currentPlatform.value) return
  currentPlatform.value = platform
  dominantColor.value = '#121212'
  currentToplist.value = null
  await loadToplists(targetToplistId || undefined)
}

// 加载排行榜列表
const loadToplists = async (targetToplistId?: string) => {
  isLoading.value = true
  songs.value = []

  try {
    toplists.value = await getTopLists(currentPlatform.value)

    if (toplists.value.length > 0) {
      const target = targetToplistId
        ? toplists.value.find((item) => item.id === targetToplistId)
        : null
      await selectToplist(target || toplists.value[0])
    }
  } catch (error) {
    console.error('Failed to load toplists:', error)
  } finally {
    isLoading.value = false
  }
}

// 选择排行榜
const syncFromRoute = async () => {
  const targetPlatform = getRoutePlatform()
  const targetToplistId = getRouteToplistId()

  if (targetPlatform && targetPlatform !== currentPlatform.value) {
    await changePlatform(targetPlatform, targetToplistId)
    return
  }

  if (targetToplistId) {
    if (toplists.value.length === 0) {
      await loadToplists(targetToplistId)
      return
    }
    const target = toplists.value.find((item) => item.id === targetToplistId)
    if (target) {
      await selectToplist(target)
    }
  }
}

const selectToplist = async (toplist: TopList) => {
  if (currentToplist.value?.id === toplist.id) return

  currentToplist.value = toplist
  isLoading.value = true
  songs.value = []
  dominantColor.value = '#121212'

  try {
    const songList = await getTopListSongs(toplist.id, currentPlatform.value)

    songs.value = songList.map((item: any) => {
      const songId = resolveSongId(item)
      const coverUrl = resolveCoverUrl(item, currentPlatform.value, songId)
      return {
        id: songId,
        platform: currentPlatform.value,
        name: resolveSongName(item),
        artist: resolveArtist(item),
        album: resolveAlbum(item),
        duration: resolveDuration(item),
        coverUrl
      }
    })
  } catch (error) {
    console.error('Failed to load toplist songs:', error)
  } finally {
    isLoading.value = false
  }
}

// 播放歌曲
const playSong = (song: Song, index: number) => {
  const targetIndex = songs.value.findIndex(
    (item) => item.id === song.id && item.platform === song.platform
  )
  const resolvedIndex = targetIndex >= 0 ? targetIndex : index
  playerStore.clearPlaylist()
  playerStore.addToPlaylist(songs.value)
  playerStore.playAt(resolvedIndex)
}

// 添加到播放列表
const addToQueue = (song: Song) => {
  playerStore.addToPlaylist(song)
  globalToast.success('已添加到播放列表')
}

// 播放全部
const playAll = () => {
  if (songs.value.length > 0) {
    playerStore.clearPlaylist()
    playerStore.addToPlaylist(songs.value)
    playerStore.playAt(0)
  }
}

// 添加全部到播放队列
const addAllToQueue = () => {
  if (songs.value.length > 0) {
    playerStore.addToPlaylist(songs.value)
    globalToast.success('已添加到播放列表')
  }
}

watch(
  () => [route.query.platform, route.query.toplistId],
  () => {
    syncFromRoute()
  }
)

onMounted(() => {
  const routePlatform = getRoutePlatform()
  if (routePlatform) {
    currentPlatform.value = routePlatform
  }
  loadToplists(getRouteToplistId() || undefined)
})
</script>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.5);
}
</style>
