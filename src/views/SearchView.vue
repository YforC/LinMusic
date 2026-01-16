<template>
  <div class="relative min-h-full">
    <!-- Background -->
    <div class="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-background-base pointer-events-none"></div>

    <div class="relative z-10 h-full flex flex-col">
      <!-- Search Header -->
      <div class="px-4 sm:px-6 md:px-8 py-5 sm:py-6 border-b border-white/10">
        <div class="flex flex-col gap-4">
          <!-- Search Input with Platform Selector -->
          <div class="flex items-center gap-3 w-full max-w-[600px]">
            <!-- Platform Selector -->
            <div class="relative shrink-0">
              <button
                class="flex items-center gap-2 h-12 px-4 rounded-full bg-white/10 hover:bg-white/15 transition-colors text-white text-sm font-medium"
                @click="showPlatformMenu = !showPlatformMenu"
              >
                <span>{{ currentPlatformLabel }}</span>
                <span class="material-symbols-outlined text-[18px]">expand_more</span>
              </button>
              <Transition name="menu-fade">
                <div
                  v-if="showPlatformMenu"
                  class="absolute left-0 top-full mt-2 bg-[#282828] rounded-lg shadow-2xl py-1 min-w-[140px] border border-white/10 z-50"
                >
                  <button
                    v-for="platform in platformOptions"
                    :key="platform.id"
                    class="w-full px-4 py-2.5 flex items-center gap-2 text-left transition-colors"
                    :class="currentPlatform === platform.id ? 'text-primary bg-white/5' : 'text-white/80 hover:text-white hover:bg-white/10'"
                    @click="selectPlatform(platform.id)"
                  >
                    <span class="material-symbols-outlined text-[18px]" :class="currentPlatform === platform.id ? 'opacity-100' : 'opacity-0'">check</span>
                    <span class="text-sm font-medium">{{ platform.name }}</span>
                  </button>
                </div>
              </Transition>
            </div>

            <!-- Search Input -->
            <div class="relative flex-1">
              <div class="relative flex items-center w-full h-12 rounded-full bg-white/10 hover:bg-white/15 focus-within:bg-white/15 transition-colors overflow-hidden">
                <div class="pl-4 pr-2 text-white/50">
                  <span class="material-symbols-outlined text-[22px]">search</span>
                </div>
                <input
                  v-model="searchKeyword"
                  type="text"
                  class="w-full h-full bg-transparent border-none text-white placeholder-white/50 text-sm font-medium focus:outline-none focus:ring-0 pr-4"
                  placeholder="搜索歌曲、歌手、专辑..."
                  @keyup.enter="handleSearch"
                />
                <button
                  v-if="searchKeyword"
                  class="pr-4 text-white/40 hover:text-white transition-colors"
                  @click="clearSearch"
                >
                  <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Hot Search Tags -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in hotTags"
              :key="tag"
              class="h-8 px-4 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 flex items-center justify-center"
              @click="searchByTag(tag)"
            >
              <span class="text-sm font-medium text-white/80">{{ tag }}</span>
            </button>
          </div>
        </div>
      </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-5 sm:py-6">
      <!-- Search Results -->
      <div v-if="searchResults.length > 0" class="flex flex-col gap-5 pb-32">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-white tracking-tight">搜索结果</h2>
          <span class="text-sm text-white/50">{{ searchResults.length }} 首歌曲</span>
        </div>

        <div class="flex flex-col">
          <div
            v-for="(song, index) in searchResults"
            :key="`${song.platform}-${song.id}`"
            class="song-row group grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 items-center cursor-pointer"
            @click="playSong(song)"
          >
            <div class="w-8 text-center text-white/40 relative flex items-center justify-center">
              <span class="rank-num font-medium">{{ index + 1 }}</span>
              <span class="rank-play material-symbols-outlined text-white text-lg">play_arrow</span>
            </div>

            <div class="flex items-center gap-4 min-w-0">
              <img
                v-if="song.coverUrl"
                :src="song.coverUrl"
                :alt="song.name"
                class="w-10 h-10 rounded shadow-sm object-cover flex-shrink-0"
                loading="lazy"
              />
              <div v-else class="w-10 h-10 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-white/30 text-lg">music_note</span>
              </div>

              <div class="flex flex-col min-w-0 flex-1">
                <span class="text-white font-medium truncate">{{ song.name }}</span>
                <span class="text-sm text-white/50 truncate">{{ song.artist }}</span>
              </div>

              <span class="text-xs text-white/40 px-2 py-1 bg-white/5 rounded hidden sm:block">
                {{ platformName(song.platform) }}
              </span>
            </div>

            <div class="flex items-center gap-2">
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
        </div>
      </div>

      <!-- Loading State -->
      <div v-else-if="isLoading" class="flex flex-col gap-5 pb-32">
        <h2 class="text-xl font-bold text-white tracking-tight">搜索中...</h2>
        <div class="flex flex-col gap-2">
          <div v-for="i in 8" :key="i" class="flex items-center gap-4 px-4 py-3">
            <div class="w-8 h-4 bg-white/10 rounded skeleton"></div>
            <div class="w-10 h-10 rounded bg-white/10 skeleton"></div>
            <div class="flex flex-col gap-2 flex-1">
              <div class="h-4 bg-white/10 rounded w-1/2 skeleton"></div>
              <div class="h-3 bg-white/10 rounded w-1/3 skeleton"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Browse Categories -->
      <div v-else class="flex flex-col gap-5 pb-32">
        <h2 class="text-xl font-bold text-white tracking-tight">浏览分类</h2>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div
            v-for="category in categories"
            :key="category.name"
            class="group relative aspect-[4/3] overflow-hidden rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer"
            :style="{ backgroundColor: category.color }"
            @click="searchByTag(category.name)"
          >
            <span class="absolute top-4 left-4 text-lg font-bold text-white z-10">{{ category.name }}</span>
            <div class="absolute bottom-2 right-2 text-white/20 transition-transform duration-300 group-hover:scale-110">
              <span class="material-symbols-outlined" style="font-size: 48px; transform: rotate(15deg);">{{ category.icon }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { aggregateSearch, searchSongs, type Platform } from '@/api/music'
import { getPlatformName, normalizeImageUrl } from '@/utils/format'
import { globalToast } from '@/composables/useToast'
import SongMenu from '@/components/music/SongMenu.vue'
import type { Song } from '@/api/types'

defineOptions({
  name: 'SearchView'
})

const playerStore = usePlayerStore()

const searchKeyword = ref('')
const searchResults = ref<Song[]>([])
const isLoading = ref(false)
const showPlatformMenu = ref(false)
const currentPlatform = ref<Platform | 'all'>('all')

// 平台选项
const platformOptions = [
  { id: 'all' as const, name: '全部平台' },
  { id: 'netease' as Platform, name: '网易云' },
  { id: 'qq' as Platform, name: 'QQ音乐' },
  { id: 'kuwo' as Platform, name: '酷我' }
]

// 当前平台标签
const currentPlatformLabel = computed(() => {
  const platform = platformOptions.find(p => p.id === currentPlatform.value)
  return platform?.name || '全部平台'
})

// 热门搜索标签
const hotTags = ['周杰伦', '林俊杰', '邓紫棋', '薛之谦', '华语流行', '英文歌曲']

// 分类
const categories = [
  { name: '流行', color: '#8c67ac', icon: 'music_note' },
  { name: '摇滚', color: '#e91429', icon: 'graphic_eq' },
  { name: '嘻哈', color: '#ba5d07', icon: 'mic_external_on' },
  { name: '电子', color: '#006450', icon: 'bolt' },
  { name: '独立音乐', color: '#608108', icon: 'nature_people' },
  { name: '放松', color: '#477d95', icon: 'spa' },
  { name: '爵士', color: '#d8b021', icon: 'piano' },
  { name: '古典', color: '#7d4b32', icon: 'history_edu' },
  { name: '节奏布鲁斯', color: '#dc148c', icon: 'favorite' },
  { name: '健身', color: '#148a08', icon: 'fitness_center' }
]

const searchFallbackPlatforms = async (keyword: string) => {
  const [netease, kuwo] = await Promise.all([
    searchSongs(keyword, 'netease', 20, { timeoutMs: 10000 }),
    searchSongs(keyword, 'kuwo', 20, { timeoutMs: 10000 })
  ])
  return [...netease, ...kuwo]
}

// 平台名称映射
const platformName = (platform: string) => getPlatformName(platform)

// 选择平台
const selectPlatform = (platform: Platform | 'all') => {
  currentPlatform.value = platform
  showPlatformMenu.value = false
  if (searchKeyword.value.trim()) {
    handleSearch()
  }
}

// 搜索
const handleSearch = async () => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return

  isLoading.value = true
  try {
    let results = []
    if (currentPlatform.value === 'all') {
      try {
        results = await aggregateSearch(keyword, { timeoutMs: 12000, throwOnError: true })
      } catch {
        results = []
      }
      if (results.length === 0) {
        const fallback = await searchFallbackPlatforms(keyword)
        if (fallback.length > 0) {
          results = fallback
          globalToast.warning('全平台搜索暂不可用，已展示其他平台结果')
        }
      }
    } else if (currentPlatform.value === 'qq') {
      try {
        results = await searchSongs(keyword, currentPlatform.value, 30, { timeoutMs: 10000, throwOnError: true })
      } catch {
        results = []
      }
      if (results.length === 0) {
        const fallback = await searchFallbackPlatforms(keyword)
        if (fallback.length > 0) {
          results = fallback
          globalToast.warning('QQ音乐搜索暂不可用，已展示其他平台结果')
        } else {
          globalToast.warning('QQ音乐搜索暂不可用，请稍后重试')
        }
      }
    } else {
      results = await searchSongs(keyword, currentPlatform.value, 30, { timeoutMs: 10000 })
    }
    searchResults.value = results.map(item => ({
      id: item.id,
      platform: item.platform,
      name: item.name,
      artist: item.artist,
      album: item.album,
      coverUrl: normalizeImageUrl(item.pic)
    }))
  } catch (error) {
    console.error('Search failed:', error)
  } finally {
    isLoading.value = false
  }
}

// 清空搜索
const clearSearch = () => {
  searchKeyword.value = ''
  searchResults.value = []
}

// 按标签搜索
const searchByTag = (tag: string) => {
  searchKeyword.value = tag
  handleSearch()
}

// 播放歌曲
const playSong = (song: Song) => {
  playerStore.clearPlaylist()
  playerStore.addToPlaylist(searchResults.value)
  const index = searchResults.value.findIndex(s => s.id === song.id && s.platform === song.platform)
  playerStore.playAt(index >= 0 ? index : 0)
}

// 添加到播放列表
const addToQueue = (song: Song) => {
  playerStore.addToPlaylist(song)
  globalToast.success('已添加到播放列表')
}

// 点击外部关闭菜单
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.relative')) {
    showPlatformMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all 0.15s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
