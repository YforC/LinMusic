<template>
  <div class="relative" ref="menuRef">
    <button
      class="btn-icon text-white/30 hover:text-white transition-all duration-200"
      :class="buttonClass"
      @click.stop="toggleMenu"
    >
      <span class="material-symbols-outlined text-[20px]">more_horiz</span>
    </button>

    <Teleport to="body">
      <Transition name="menu-fade">
        <div
          v-if="isOpen"
          class="fixed z-[200]"
          :style="menuPosition"
        >
          <div
            class="bg-[#282828] rounded-lg shadow-2xl py-1 min-w-[200px] border border-white/10 overflow-hidden"
            @click.stop
          >
            <!-- Add to Queue -->
            <button
              class="menu-item w-full px-4 py-3 flex items-center gap-3 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              @click="addToQueue"
            >
              <span class="material-symbols-outlined text-[20px]">playlist_add</span>
              <span class="text-sm font-medium">添加到播放列表</span>
            </button>

            <!-- Add to Playlist -->
            <div class="relative" @mouseenter="openPlaylistSubmenu" @mouseleave="closePlaylistSubmenu">
              <button
                class="menu-item w-full px-4 py-3 flex items-center justify-between text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                ref="playlistMenuItemRef"
                @click.stop="togglePlaylistSubmenu"
              >
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[20px]">library_add</span>
                  <span class="text-sm font-medium">添加到歌单</span>
                </div>
                <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>

              <!-- Playlist Submenu -->
              <div
                v-if="showPlaylistSubmenu"
                class="absolute right-0 top-full mt-1 bg-[#282828] rounded-lg shadow-2xl py-1 w-[180px] border border-white/10 z-[250] sm:left-full sm:right-auto sm:top-0 sm:mt-0 sm:ml-1"
              >
                <button
                  class="menu-item w-full px-4 py-3 flex items-center gap-3 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors border-b border-white/10"
                  @click="createNewPlaylist"
                >
                  <span class="material-symbols-outlined text-[20px]">add</span>
                  <span class="text-sm font-medium">新建歌单</span>
                </button>
                <div class="max-h-[200px] overflow-y-auto">
                  <button
                    v-for="playlist in playlists"
                    :key="playlist.id"
                    class="menu-item w-full px-4 py-2.5 flex items-center gap-3 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    @click="addToPlaylist(playlist.id)"
                  >
                    <span class="material-symbols-outlined text-[18px] text-white/50">queue_music</span>
                    <span class="text-sm truncate">{{ playlist.name }}</span>
                  </button>
                  <div v-if="playlists.length === 0" class="px-4 py-3 text-sm text-white/40">
                    暂无歌单，请先创建
                  </div>
                </div>
              </div>
            </div>

            <div class="h-px bg-white/10 my-1"></div>

            <!-- Like -->
            <button
              class="menu-item w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/10 transition-colors"
              :class="isLiked ? 'text-primary' : 'text-white/80 hover:text-white'"
              @click="toggleLike"
            >
              <span class="material-symbols-outlined text-[20px]" :class="{ 'fill-1': isLiked }">favorite</span>
              <span class="text-sm font-medium">{{ isLiked ? '取消喜欢' : '喜欢' }}</span>
            </button>

            <!-- Download -->
            <button
              class="menu-item w-full px-4 py-3 flex items-center gap-3 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              @click="downloadSong"
            >
              <span class="material-symbols-outlined text-[20px]">download</span>
              <span class="text-sm font-medium">下载</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Create Playlist Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreatePlaylist" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/70" @click="showCreatePlaylist = false"></div>
          <div class="relative bg-[#282828] rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 class="text-xl font-bold text-white mb-4">新建歌单</h2>
            <input
              v-model="newPlaylistName"
              type="text"
              class="w-full h-12 px-4 rounded-md bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-colors"
              placeholder="歌单名称"
              @keyup.enter="handleCreatePlaylist"
            />
            <div class="flex justify-end gap-3 mt-6">
              <button
                class="px-6 py-2 rounded-full text-white/70 hover:text-white font-medium transition-colors"
                @click="showCreatePlaylist = false"
              >
                取消
              </button>
              <button
                class="px-6 py-2 rounded-full bg-primary text-black font-bold hover:bg-[#1ed760] transition-colors"
                :disabled="!newPlaylistName.trim()"
                @click="handleCreatePlaylist"
              >
                创建并添加
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { getPlaylists, createPlaylist, addSongToPlaylist } from '@/api/playlist'
import { likeSong, unlikeSong, checkLikedSongs } from '@/api/liked'
import { globalToast } from '@/composables/useToast'
import { getPlayUrl } from '@/api/music'
import type { Song, Playlist } from '@/api/types'

const props = defineProps<{
  song: Song
  buttonClass?: string
}>()

const emit = defineEmits<{
  (e: 'action', action: string): void
}>()

const playerStore = usePlayerStore()

const menuRef = ref<HTMLElement | null>(null)
const playlistMenuItemRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const showPlaylistSubmenu = ref(false)
const showCreatePlaylist = ref(false)
const newPlaylistName = ref('')
const playlists = ref<Playlist[]>([])
const isLiked = ref(false)
const menuPosition = ref({ top: '0px', left: '0px' })
let submenuTimeout: ReturnType<typeof setTimeout> | null = null

// Load playlists
const loadPlaylists = async () => {
  playlists.value = await getPlaylists()
  console.log('Loaded playlists:', playlists.value)
}

// Open playlist submenu with delay
const openPlaylistSubmenu = () => {
  if (submenuTimeout) {
    clearTimeout(submenuTimeout)
    submenuTimeout = null
  }
  showPlaylistSubmenu.value = true
}

// Close playlist submenu with delay
const closePlaylistSubmenu = () => {
  submenuTimeout = setTimeout(() => {
    showPlaylistSubmenu.value = false
  }, 100)
}

const togglePlaylistSubmenu = () => {
  if (submenuTimeout) {
    clearTimeout(submenuTimeout)
    submenuTimeout = null
  }
  showPlaylistSubmenu.value = !showPlaylistSubmenu.value
}

// Check if song is liked
const checkLiked = async () => {
  const result = await checkLikedSongs([{
    id: props.song.id,
    platform: props.song.platform
  }])
  isLiked.value = !!result[`${props.song.platform}-${props.song.id}`]
}

// Toggle menu
const toggleMenu = async () => {
  if (!isOpen.value) {
    await loadPlaylists()
    await checkLiked()

    // Calculate position
    await nextTick()
    if (menuRef.value) {
      const rect = menuRef.value.getBoundingClientRect()
      const menuWidth = 200
      const menuHeight = 280

      let left = rect.right - menuWidth
      let top = rect.bottom + 4

      // Adjust if menu would go off screen
      if (left < 8) left = 8
      if (top + menuHeight > window.innerHeight - 8) {
        top = rect.top - menuHeight - 4
      }

      menuPosition.value = {
        top: `${top}px`,
        left: `${left}px`
      }
    }
  }
  isOpen.value = !isOpen.value
}

// Close menu
const closeMenu = () => {
  isOpen.value = false
  showPlaylistSubmenu.value = false
}

// Add to queue
const addToQueue = () => {
  playerStore.addToPlaylist(props.song)
  closeMenu()
  globalToast.success('已添加到播放列表')
  emit('action', 'queue')
}

// Add to playlist
const addToPlaylist = async (playlistId: number) => {
  const success = await addSongToPlaylist(playlistId, props.song)
  if (success) {
    globalToast.success('已添加到歌单')
    emit('action', 'playlist')
  } else {
    globalToast.error('添加失败')
  }
  closeMenu()
}

// Create new playlist
const createNewPlaylist = () => {
  showPlaylistSubmenu.value = false
  showCreatePlaylist.value = true
  closeMenu()
}

// Handle create playlist
const handleCreatePlaylist = async () => {
  if (!newPlaylistName.value.trim()) return

  const newPlaylist = await createPlaylist(newPlaylistName.value)
  if (newPlaylist) {
    const success = await addSongToPlaylist(newPlaylist.id, props.song)
    if (success) {
      globalToast.success('已创建歌单并添加歌曲')
      emit('action', 'playlist')
    }
  }

  newPlaylistName.value = ''
  showCreatePlaylist.value = false
}

// Toggle like
const toggleLike = async () => {
  if (isLiked.value) {
    const success = await unlikeSong(props.song.platform, props.song.id)
    if (success) {
      isLiked.value = false
      globalToast.success('已取消喜欢')
    }
  } else {
    const success = await likeSong(props.song)
    if (success) {
      isLiked.value = true
      globalToast.success('已添加到喜欢')
    }
  }
  closeMenu()
  emit('action', 'like')
}

// Download song
const downloadSong = () => {
  const url = getPlayUrl(props.song.id, props.song.platform, '320k')
  // Open in new tab to trigger download
  window.open(url, '_blank')
  globalToast.info('正在打开下载链接...')
  closeMenu()
  emit('action', 'download')
}

// Click outside to close
const handleClickOutside = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (submenuTimeout) {
    clearTimeout(submenuTimeout)
  }
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

.submenu-fade-enter-active,
.submenu-fade-leave-active {
  transition: all 0.15s ease;
}

.submenu-fade-enter-from,
.submenu-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
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
