<template>
  <aside
    class="flex flex-col h-full bg-sidebar-base gap-2 p-2 transition-all duration-300"
    :class="[
      isMobile ? 'flex w-[280px] max-w-[85vw]' : 'hidden md:flex',
      isMobile ? '' : (sidebarCollapsed ? 'w-[72px]' : 'w-[280px]')
    ]"
  >
    <!-- Logo & Main Nav -->
    <div class="bg-background-base rounded-lg p-4 flex flex-col gap-4">
      <!-- Logo -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 px-1 overflow-hidden">
          <span class="material-symbols-outlined text-primary text-[28px] flex-shrink-0">music_note</span>
          <Transition name="fade-slide">
            <h1 v-if="!sidebarCollapsed" class="text-xl font-bold tracking-tight whitespace-nowrap">LinMusic</h1>
          </Transition>
        </div>
        <button
          v-if="!isMobile"
          class="btn-icon text-white/50 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all duration-200 flex-shrink-0"
          :title="sidebarCollapsed ? '灞曞紑渚ц竟鏍? : '鏀惰捣渚ц竟鏍?"
          @click="toggleCollapsed"
        >
          <span class="material-symbols-outlined text-[20px] transition-transform duration-300" :class="{ 'rotate-180': sidebarCollapsed }">
            chevron_left
          </span>
        </button>
        <button
          v-else
          class="btn-icon text-white/50 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all duration-200 flex-shrink-0"
          title="Close"
          @click="handleMobileClose"
        >
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <nav class="flex flex-col gap-2">
        <router-link
          to="/"
          class="sidebar-item flex items-center gap-4 p-2 font-bold transition-all duration-200"
          :class="[
            isActive('/') ? 'text-white bg-white/10' : 'text-white/60 hover:text-white',
            sidebarCollapsed ? 'justify-center' : ''
          ]"
          :title="sidebarCollapsed ? '棣栭〉' : ''"
          @click="handleMobileClose"
        >
          <span class="material-symbols-outlined text-[24px]" :class="{ 'fill-1': isActive('/') }">home</span>
          <Transition name="fade-slide">
            <span v-if="!sidebarCollapsed">棣栭〉</span>
          </Transition>
        </router-link>

        <router-link
          to="/search"
          class="sidebar-item flex items-center gap-4 p-2 font-bold transition-all duration-200"
          :class="[
            isActive('/search') ? 'text-white bg-white/10' : 'text-white/60 hover:text-white',
            sidebarCollapsed ? 'justify-center' : ''
          ]"
          :title="sidebarCollapsed ? '鎼滅储' : ''"
          @click="handleMobileClose"
        >
          <span class="material-symbols-outlined text-[24px]" :class="{ 'fill-1': isActive('/search') }">search</span>
          <Transition name="fade-slide">
            <span v-if="!sidebarCollapsed">鎼滅储</span>
          </Transition>
        </router-link>

        <router-link
          to="/charts"
          class="sidebar-item flex items-center gap-4 p-2 font-bold transition-all duration-200"
          :class="[
            isActive('/charts') ? 'text-white bg-white/10' : 'text-white/60 hover:text-white',
            sidebarCollapsed ? 'justify-center' : ''
          ]"
          :title="sidebarCollapsed ? '鎺掕姒? : ''"
          @click="handleMobileClose"
        >
          <span class="material-symbols-outlined text-[24px]" :class="{ 'fill-1': isActive('/charts') }">bar_chart</span>
          <Transition name="fade-slide">
            <span v-if="!sidebarCollapsed">鎺掕姒?</span>
          </Transition>
        </router-link>

        <router-link
          to="/settings"
          class="sidebar-item flex items-center gap-4 p-2 font-bold transition-all duration-200"
          :class="[
            isActive('/settings') ? 'text-white bg-white/10' : 'text-white/60 hover:text-white',
            sidebarCollapsed ? 'justify-center' : ''
          ]"
          :title="sidebarCollapsed ? '璁剧疆' : ''"
          @click="handleMobileClose"
        >
          <span class="material-symbols-outlined text-[24px]" :class="{ 'fill-1': isActive('/settings') }">settings</span>
          <Transition name="fade-slide">
            <span v-if="!sidebarCollapsed">璁剧疆</span>
          </Transition>
        </router-link>
      </nav>
    </div>

    <!-- Library Section -->
    <div class="bg-background-base rounded-lg flex-1 flex flex-col overflow-hidden">
      <div class="p-4 shadow-sm z-10">
        <div
          class="flex items-center text-white/60 hover:text-white transition-colors cursor-pointer group"
          :class="sidebarCollapsed ? 'justify-center' : 'justify-between'"
        >
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-[24px]">library_music</span>
            <Transition name="fade-slide">
              <span v-if="!sidebarCollapsed" class="font-bold">闊充箰搴?</span>
            </Transition>
          </div>
          <Transition name="fade-slide">
            <button
              v-if="!sidebarCollapsed"
              class="btn-icon text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="鏂板缓姝屽崟"
              @click="showCreatePlaylist = true"
            >
              <span class="material-symbols-outlined text-[20px]">add</span>
            </button>
          </Transition>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-2 pb-2 no-scrollbar">
        <div class="flex flex-col gap-1 mt-2">
          <!-- 鎴戝枩娆㈢殑闊充箰 -->
          <router-link
            to="/liked"
            class="sidebar-item flex items-center gap-3 p-2 cursor-pointer group"
            :class="[
              isActive('/liked') ? 'bg-white/10' : '',
              sidebarCollapsed ? 'justify-center' : ''
            ]"
            :title="sidebarCollapsed ? '鎴戝枩娆㈢殑闊充箰' : ''"
            @click="handleMobileClose"
          >
            <div class="w-10 h-10 rounded-md bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
              <span class="material-symbols-outlined text-white fill-1 text-[18px]">favorite</span>
            </div>
            <Transition name="fade-slide">
              <div v-if="!sidebarCollapsed" class="flex flex-col min-w-0">
                <span class="font-medium text-white text-sm truncate">鎴戝枩娆㈢殑闊充箰</span>
                <span class="text-xs text-white/50">姝屽崟</span>
              </div>
            </Transition>
          </router-link>

          <!-- 鐢ㄦ埛姝屽崟鍒楄〃 -->
          <div
            v-for="playlist in playlists"
            :key="playlist.id"
            class="sidebar-item flex items-center gap-3 p-2 cursor-pointer"
            :class="sidebarCollapsed ? 'justify-center' : ''"
            :title="sidebarCollapsed ? playlist.name : ''"
            @click="goToPlaylist(playlist.id)"
          >
            <div class="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-white/50">music_note</span>
            </div>
            <Transition name="fade-slide">
              <div v-if="!sidebarCollapsed" class="flex flex-col min-w-0">
                <span class="font-medium text-white text-sm truncate">{{ playlist.name }}</span>
                <span class="text-xs text-white/50">{{ playlist.songCount || 0 }} 棣栨瓕鏇?</span>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Playlist Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreatePlaylist" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/70" @click="showCreatePlaylist = false"></div>
          <div class="relative bg-[#282828] rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 class="text-xl font-bold text-white mb-4">鏂板缓姝屽崟</h2>
            <input
              v-model="newPlaylistName"
              type="text"
              class="w-full h-12 px-4 rounded-md bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-colors"
              placeholder="姝屽崟鍚嶇О"
              @keyup.enter="createPlaylist"
            />
            <div class="flex justify-end gap-3 mt-6">
              <button
                class="px-6 py-2 rounded-full text-white/70 hover:text-white font-medium transition-colors"
                @click="showCreatePlaylist = false"
              >
                鍙栨秷
              </button>
              <button
                class="px-6 py-2 rounded-full bg-primary text-black font-bold hover:bg-[#1ed760] transition-colors"
                :disabled="!newPlaylistName.trim()"
                @click="createPlaylist"
              >
                鍒涘缓
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { getPlaylists, createPlaylist as apiCreatePlaylist } from '@/api/playlist'
import { storeToRefs } from 'pinia'
import type { Playlist } from '@/api/types'

const props = defineProps<{
  mobile?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const { sidebarCollapsed } = storeToRefs(appStore)
const isMobile = computed(() => props.mobile === true)

// 鐢ㄦ埛姝屽崟
const playlists = ref<Playlist[]>([])

// 鏂板缓姝屽崟
const showCreatePlaylist = ref(false)
const newPlaylistName = ref('')

// 鍒ゆ柇褰撳墠璺敱鏄惁婵€娲?
const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

// 鍒囨崲鏀惰捣鐘舵€?
const toggleCollapsed = () => {
  appStore.toggleSidebarCollapsed()
}

const handleMobileClose = () => {
  if (isMobile.value) {
    emit('close')
  }
}

// 璺宠浆鍒版瓕鍗曡鎯?
const goToPlaylist = (id: number) => {
  router.push(`/playlist/${id}`)
  handleMobileClose()
}

// 鍔犺浇姝屽崟鍒楄〃
const loadPlaylists = async () => {
  playlists.value = await getPlaylists()
}

// 鍒涘缓姝屽崟
const createPlaylist = async () => {
  if (!newPlaylistName.value.trim()) return

  const newPlaylist = await apiCreatePlaylist(newPlaylistName.value)
  if (newPlaylist) {
    playlists.value.push(newPlaylist)
  }

  newPlaylistName.value = ''
  showCreatePlaylist.value = false
}

onMounted(() => {
  loadPlaylists()
})
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
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
