<template>
  <div class="relative">
    <!-- Background Gradient -->
    <div class="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-[#2e5c46] to-background-base pointer-events-none opacity-60"></div>

    <!-- Header Content -->
    <header class="relative px-8 pt-16 pb-6 flex flex-col md:flex-row gap-6 items-end z-10">
      <!-- Cover Art -->
      <div class="shrink-0 shadow-2xl shadow-black/50 group cursor-pointer relative">
        <div
          class="size-48 md:size-60 bg-surface-highlight rounded-lg bg-cover bg-center shadow-lg transition-all duration-300 group-hover:scale-[1.02]"
          :style="{ backgroundImage: playlist?.coverUrl ? `url(${playlist.coverUrl})` : 'none' }"
        >
          <div v-if="!playlist?.coverUrl" class="w-full h-full flex items-center justify-center">
            <span class="material-symbols-outlined text-text-subdued text-6xl">music_note</span>
          </div>
        </div>
      </div>

      <!-- Info -->
      <div class="flex flex-col gap-2 w-full">
        <span class="text-xs font-bold uppercase tracking-wide text-white/90">歌单</span>
        <h1 class="text-4xl md:text-6xl font-black text-white tracking-tight py-2">{{ playlist?.name || '加载中...' }}</h1>
        <p class="text-gray-300 text-sm md:text-base font-medium mt-2">
          {{ playlist?.description || '' }} • LinMusic • {{ songs.length }}首歌曲
        </p>
      </div>
    </header>

    <!-- Actions Bar -->
    <div class="relative px-8 py-6 z-30 flex items-center gap-6">
      <button
        class="size-14 bg-primary hover:scale-105 hover:bg-primary/90 transition-all rounded-full flex items-center justify-center text-black shadow-lg shadow-primary/20"
        :disabled="songs.length === 0"
        @click="playAll"
      >
        <span class="material-symbols-outlined text-4xl ml-1 fill-1">play_arrow</span>
      </button>
      <div class="relative" ref="menuRef">
        <button
          class="text-text-subdued hover:text-white transition-colors"
          @click="showMenu = !showMenu"
        >
          <span class="material-symbols-outlined text-3xl">more_horiz</span>
        </button>

        <!-- Playlist Menu -->
        <Transition name="menu-fade">
          <div
            v-if="showMenu"
            class="absolute left-0 top-full mt-2 bg-[#282828] rounded-lg shadow-2xl py-1 min-w-[180px] border border-white/10 z-[100]"
          >
            <button
              class="w-full px-4 py-3 flex items-center gap-3 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              @click="openEditModal"
            >
              <span class="material-symbols-outlined text-[20px]">edit</span>
              <span class="text-sm font-medium">编辑歌单</span>
            </button>
            <button
              class="w-full px-4 py-3 flex items-center gap-3 text-left text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors"
              @click="handleDeletePlaylist"
            >
              <span class="material-symbols-outlined text-[20px]">delete</span>
              <span class="text-sm font-medium">删除歌单</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Songs List Table -->
    <div class="relative z-10 px-8 pb-32">
      <div class="w-full">
        <!-- Table Header -->
        <div class="grid grid-cols-[auto_4fr_3fr_3fr_auto] gap-4 px-4 py-2 border-b border-white/10 text-text-subdued text-sm font-medium uppercase tracking-wider sticky top-0 bg-background-base/95 backdrop-blur-sm z-20">
          <div class="w-8 text-center">#</div>
          <div>标题</div>
          <div class="hidden md:block">专辑</div>
          <div class="hidden sm:block">歌手</div>
          <div class="w-32 text-right">
            <span class="material-symbols-outlined text-lg">schedule</span>
          </div>
        </div>

        <!-- Rows -->
        <div class="flex flex-col mt-2">
          <div
            v-for="(song, index) in songs"
            :key="`${song.platform}-${song.id}`"
            class="group grid grid-cols-[auto_4fr_3fr_3fr_auto] gap-4 px-4 py-3 hover:bg-white/10 rounded-md items-center transition-colors cursor-pointer"
            @click="playSong(song, index)"
          >
            <div class="w-8 text-center text-text-subdued relative flex items-center justify-center">
              <span class="group-hover:hidden font-medium" :class="{ 'text-primary': isCurrentSong(song) }">{{ index + 1 }}</span>
              <span class="material-symbols-outlined hidden group-hover:block text-white text-lg">play_arrow</span>
            </div>

            <div class="flex flex-col justify-center min-w-0">
              <span
                class="font-medium text-base truncate"
                :class="isCurrentSong(song) ? 'text-primary' : 'text-white'"
              >
                {{ song.name }}
              </span>
            </div>

            <div class="hidden md:block text-text-subdued text-sm truncate">{{ song.album || '-' }}</div>
            <div class="hidden sm:block text-text-subdued text-sm truncate hover:text-white cursor-pointer hover:underline">{{ song.artist }}</div>
            <div class="w-32 text-right text-text-subdued text-sm">
              <div class="flex items-center justify-end gap-2">
                <button
                  class="btn-icon text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                  title="添加到播放列表"
                  @click.stop="addToQueue(song)"
                >
                  <span class="material-symbols-outlined text-[20px]">playlist_add</span>
                </button>
                <button
                  class="btn-icon text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
                  title="从歌单移除"
                  @click.stop="removeSong(song)"
                >
                  <span class="material-symbols-outlined text-[20px]">remove_circle_outline</span>
                </button>
                <span class="text-white/50 w-12 text-right tabular-nums">{{ formatDuration(song.duration) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="songs.length === 0 && !isLoading" class="flex flex-col items-center justify-center py-20 text-text-subdued">
          <span class="material-symbols-outlined text-6xl mb-4">queue_music</span>
          <p class="text-lg">歌单为空</p>
        </div>
      </div>
    </div>

    <!-- Edit Playlist Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showEditModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/70" @click="showEditModal = false"></div>
          <div class="relative bg-[#282828] rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 class="text-xl font-bold text-white mb-4">编辑歌单</h2>
            <div class="flex flex-col gap-4">
              <div>
                <label class="text-sm text-white/70 mb-1 block">歌单名称</label>
                <input
                  v-model="editName"
                  type="text"
                  class="w-full h-12 px-4 rounded-md bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-colors"
                  placeholder="歌单名称"
                />
              </div>
              <div>
                <label class="text-sm text-white/70 mb-1 block">歌单描述</label>
                <textarea
                  v-model="editDescription"
                  class="w-full h-24 px-4 py-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-colors resize-none"
                  placeholder="添加描述（可选）"
                ></textarea>
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button
                class="px-6 py-2 rounded-full text-white/70 hover:text-white font-medium transition-colors"
                @click="showEditModal = false"
              >
                取消
              </button>
              <button
                class="px-6 py-2 rounded-full bg-primary text-black font-bold hover:bg-[#1ed760] transition-colors"
                :disabled="!editName.trim()"
                @click="savePlaylist"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { getPlaylist, updatePlaylist, deletePlaylist, removeSongFromPlaylist } from '@/api/playlist'
import { formatDuration } from '@/utils/format'
import { globalToast } from '@/composables/useToast'
import type { Song, Playlist } from '@/api/types'

defineOptions({
  name: 'PlaylistView'
})

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()

const playlist = ref<Playlist | null>(null)
const songs = ref<Song[]>([])
const isLoading = ref(false)
const showMenu = ref(false)
const showEditModal = ref(false)
const editName = ref('')
const editDescription = ref('')
const menuRef = ref<HTMLElement | null>(null)

// 判断是否是当前播放歌曲
const isCurrentSong = (song: Song) => {
  return playerStore.currentSong?.id === song.id && playerStore.currentSong?.platform === song.platform
}

// 加载歌单
const loadPlaylist = async () => {
  const id = parseInt(route.params.id as string)
  if (isNaN(id)) return

  isLoading.value = true

  try {
    const data = await getPlaylist(id)
    if (data) {
      playlist.value = data.playlist
      songs.value = data.songs
    }
  } catch (error) {
    console.error('Failed to load playlist:', error)
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

// 播放全部
const playAll = () => {
  if (songs.value.length > 0) {
    playerStore.clearPlaylist()
    playerStore.addToPlaylist(songs.value)
    playerStore.playAt(0)
  }
}

// 添加到播放列表
const addToQueue = (song: Song) => {
  playerStore.addToPlaylist(song)
  globalToast.success('已添加到播放列表')
}

// 打开编辑弹窗
const openEditModal = () => {
  if (playlist.value) {
    editName.value = playlist.value.name
    editDescription.value = playlist.value.description || ''
  }
  showMenu.value = false
  showEditModal.value = true
}

// 保存歌单
const savePlaylist = async () => {
  if (!playlist.value || !editName.value.trim()) return

  const success = await updatePlaylist(playlist.value.id, {
    name: editName.value.trim(),
    description: editDescription.value.trim() || undefined
  })

  if (success) {
    playlist.value.name = editName.value.trim()
    playlist.value.description = editDescription.value.trim() || undefined
    globalToast.success('歌单已更新')
  } else {
    globalToast.error('更新失败')
  }

  showEditModal.value = false
}

// 删除歌单
const handleDeletePlaylist = async () => {
  if (!playlist.value) return

  if (confirm(`确定要删除歌单"${playlist.value.name}"吗？此操作无法撤消。`)) {
    const success = await deletePlaylist(playlist.value.id)
    if (success) {
      globalToast.success('歌单已删除')
      router.push('/')
    } else {
      globalToast.error('删除失败')
    }
  }
  showMenu.value = false
}

// 从歌单移除歌曲
const removeSong = async (song: Song) => {
  if (!playlist.value) return

  const success = await removeSongFromPlaylist(
    playlist.value.id,
    song.id,
    song.platform,
    song.playlistSongId
  )
  if (success) {
    songs.value = songs.value.filter(s => !(s.id === song.id && s.platform === song.platform))
    globalToast.success('已从歌单移除')
  } else {
    globalToast.error('移除失败')
  }
}

// 点击外部关闭菜单
const handleClickOutside = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    showMenu.value = false
  }
}

watch(
  () => route.params.id,
  () => {
    loadPlaylist()
  },
  { immediate: true }
)

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

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
}
</style>
