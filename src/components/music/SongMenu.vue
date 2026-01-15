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
            ref="menuPanelRef"
            class="bg-[#242424]/95 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.5)] py-1 min-w-[220px] border border-white/10 backdrop-blur-md"
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

            <!-- Quick Add -->
            <button
              v-if="quickAddPlaylist"
              class="menu-item w-full px-4 py-3 flex items-center gap-3 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              @click="addToLastPlaylist"
            >
              <span class="material-symbols-outlined text-[20px]">history</span>
              <div class="flex flex-col">
                <span class="text-sm font-medium">添加到上次歌单</span>
                <span class="text-xs text-white/50 truncate">{{ quickAddPlaylist.name }}</span>
              </div>
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
                class="mt-1 bg-[#1f1f1f]/95 rounded-xl shadow-[0_12px_28px_rgba(0,0,0,0.45)] py-1 w-full border border-white/10 z-[250] sm:absolute sm:top-0 sm:mt-0 sm:w-[200px]"
                :class="submenuAlign === 'left' ? 'sm:right-full sm:mr-2' : 'sm:left-full sm:ml-2'"
              >
                <button
                  class="menu-item w-full px-4 py-3 flex items-center gap-3 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors border-b border-white/10"
                  @click.stop="createNewPlaylist"
                >
                  <span class="material-symbols-outlined text-[20px]">add</span>
                  <span class="text-sm font-medium">新建歌单</span>
                </button>
                <div class="max-h-[200px] overflow-y-auto">
                  <button
                    v-for="playlist in playlists"
                    :key="playlist.id"
                    class="menu-item w-full px-4 py-2.5 flex items-center gap-3 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    @click.stop="addToPlaylist(playlist.id, playlist.name)"
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
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
const menuPanelRef = ref<HTMLElement | null>(null)
const playlistMenuItemRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const showPlaylistSubmenu = ref(false)
const showCreatePlaylist = ref(false)
const newPlaylistName = ref('')
const playlists = ref<Playlist[]>([])
const isLiked = ref(false)
const menuPosition = ref({ top: '0px', left: '0px' })
let submenuTimeout: ReturnType<typeof setTimeout> | null = null
const isCoarsePointer = ref(false)
let coarsePointerQuery: MediaQueryList | null = null
const submenuAlign = ref<'left' | 'right'>('right')
const lastPlaylist = ref<Playlist | null>(null)
const handlePointerChange = (event: MediaQueryListEvent) => {
  isCoarsePointer.value = event.matches
}

const quickAddPlaylist = computed(() => {
  if (!lastPlaylist.value) return null
  const match = playlists.value.find((playlist) => playlist.id === lastPlaylist.value?.id)
  return match || null
})

const updateSubmenuAlign = async () => {
  await nextTick()
  const rect = playlistMenuItemRef.value?.getBoundingClientRect()
  if (!rect) return
  const submenuWidth = 200
  const padding = 12
  const rightSpace = window.innerWidth - rect.right
  const leftSpace = rect.left
  if (rightSpace < submenuWidth + padding && leftSpace >= submenuWidth + padding) {
    submenuAlign.value = 'left'
  } else if (rightSpace >= submenuWidth + padding) {
    submenuAlign.value = 'right'
  } else {
    submenuAlign.value = leftSpace > rightSpace ? 'left' : 'right'
  }
}

const loadLastPlaylist = () => {
  try {
    const raw = localStorage.getItem('linmusic:last-playlist')
    if (!raw) return
    const parsed = JSON.parse(raw) as { id: number; name: string }
    if (parsed?.id) {
      lastPlaylist.value = { id: parsed.id, name: parsed.name }
    }
  } catch {
    lastPlaylist.value = null
  }
}

const saveLastPlaylist = (playlist: Playlist) => {
  lastPlaylist.value = { id: playlist.id, name: playlist.name }
  try {
    localStorage.setItem('linmusic:last-playlist', JSON.stringify({
      id: playlist.id,
      name: playlist.name
    }))
  } catch {
    // ignore
  }
}

const syncLastPlaylist = () => {
  if (!lastPlaylist.value) return
  const match = playlists.value.find((playlist) => playlist.id === lastPlaylist.value?.id)
  if (!match) {
    lastPlaylist.value = null
    try {
      localStorage.removeItem('linmusic:last-playlist')
    } catch {
      // ignore
    }
  } else {
    lastPlaylist.value = { id: match.id, name: match.name }
  }
}

// Load playlists
const loadPlaylists = async () => {
  playlists.value = await getPlaylists()
  syncLastPlaylist()
}

// Open playlist submenu with delay
const openPlaylistSubmenu = () => {
  if (isCoarsePointer.value) return
  if (submenuTimeout) {
    clearTimeout(submenuTimeout)
    submenuTimeout = null
  }
  showPlaylistSubmenu.value = true
  void updateSubmenuAlign()
}

// Close playlist submenu with delay
const closePlaylistSubmenu = () => {
  if (isCoarsePointer.value) return
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
  if (showPlaylistSubmenu.value) {
    void updateSubmenuAlign()
  }
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
const addToPlaylist = async (playlistId: number, playlistName?: string) => {
  if (!props.song.id) {
    globalToast.error('歌曲信息不完整，无法添加')
    closeMenu()
    return
  }
  const success = await addSongToPlaylist(playlistId, props.song)
  if (success) {
    const match = playlists.value.find((playlist) => playlist.id === playlistId)
    const displayName = match?.name || playlistName
    if (match) {
      saveLastPlaylist(match)
    } else if (displayName) {
      saveLastPlaylist({ id: playlistId, name: displayName })
    }
    if (displayName) {
      globalToast.success(`已添加到歌单：${displayName}`)
    } else {
      globalToast.success('已添加到歌单')
    }
    emit('action', 'playlist')
    window.dispatchEvent(new CustomEvent('linmusic-playlists-changed'))
  } else {
    globalToast.error('添加失败')
  }
  closeMenu()
}

const addToLastPlaylist = async () => {
  const playlist = quickAddPlaylist.value
  if (!playlist) {
    globalToast.error('暂无可用的上次歌单')
    return
  }
  await addToPlaylist(playlist.id)
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
    playlists.value.unshift(newPlaylist)
    const success = await addSongToPlaylist(newPlaylist.id, props.song)
    if (success) {
      saveLastPlaylist(newPlaylist)
      globalToast.success(`已创建并添加到歌单：${newPlaylist.name}`)
      emit('action', 'playlist')
      window.dispatchEvent(new CustomEvent('linmusic-playlists-changed'))
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
  const target = e.target as Node
  if (menuRef.value && menuRef.value.contains(target)) return
  if (menuPanelRef.value && menuPanelRef.value.contains(target)) return
  closeMenu()
}

onMounted(() => {
  loadLastPlaylist()
  document.addEventListener('click', handleClickOutside)
  coarsePointerQuery = window.matchMedia('(pointer: coarse)')
  isCoarsePointer.value = coarsePointerQuery.matches
  if (coarsePointerQuery.addEventListener) {
    coarsePointerQuery.addEventListener('change', handlePointerChange)
  } else if (coarsePointerQuery.addListener) {
    coarsePointerQuery.addListener(handlePointerChange)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (submenuTimeout) {
    clearTimeout(submenuTimeout)
  }
  if (coarsePointerQuery) {
    if (coarsePointerQuery.removeEventListener) {
      coarsePointerQuery.removeEventListener('change', handlePointerChange)
    } else if (coarsePointerQuery.removeListener) {
      coarsePointerQuery.removeListener(handlePointerChange)
    }
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
