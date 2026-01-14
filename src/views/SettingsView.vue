<template>
  <div class="relative min-h-full">
    <!-- Background -->
    <div class="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-background-base pointer-events-none"></div>

    <!-- Content -->
    <div class="relative z-10 max-w-3xl mx-auto px-6 md:px-8 pt-12 pb-32">
      <div class="mb-10">
        <h1 class="text-4xl font-bold tracking-tight mb-2">设置</h1>
        <p class="text-sm text-white/50">您的偏好设置已保存在此浏览器本地。</p>
      </div>

      <!-- 音频体验 -->
      <section class="mb-8 bg-white/5 rounded-xl p-6 backdrop-blur-sm">
        <h2 class="text-lg font-bold mb-6 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">headphones</span>
          音频体验
        </h2>
        <div class="flex flex-col gap-6">
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-1 pr-8">
              <span class="text-base font-medium">音质选择</span>
              <span class="text-sm text-white/50">根据网络情况调整音质</span>
            </div>
            <div class="relative">
              <select
                v-model="settings.audioQuality"
                class="appearance-none bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-lg py-2.5 pl-4 pr-10 cursor-pointer focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all border-0"
                @change="saveSettings"
              >
                <option value="128k">标准 (128k)</option>
                <option value="320k">高品质 (320k)</option>
                <option value="flac">无损 (FLAC)</option>
                <option value="flac24bit">Hi-Res (24bit)</option>
              </select>
              <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none text-[18px]">expand_more</span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-1 pr-8">
              <span class="text-base font-medium">淡入淡出</span>
              <span class="text-sm text-white/50">让歌曲间的过渡更平滑</span>
            </div>
            <div class="flex items-center gap-4 w-48">
              <input
                v-model.number="settings.crossfade"
                type="range"
                min="0"
                max="12"
                class="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                @change="saveSettings"
              />
              <span class="text-sm font-medium text-white/70 w-8 text-right">{{ settings.crossfade }}s</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 播放设置 -->
      <section class="mb-8 bg-white/5 rounded-xl p-6 backdrop-blur-sm">
        <h2 class="text-lg font-bold mb-6 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">play_circle</span>
          播放设置
        </h2>
        <div class="flex flex-col gap-6">
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-1 pr-8">
              <span class="text-base font-medium">无缝播放</span>
              <span class="text-sm text-white/50">消除歌曲间的静默间隔</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                v-model="settings.gaplessPlayback"
                type="checkbox"
                class="sr-only peer"
                @change="saveSettings"
              />
              <div class="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </section>

      <!-- 存储信息 -->
      <section class="mb-8 bg-white/5 rounded-xl p-6 backdrop-blur-sm">
        <h2 class="text-lg font-bold mb-6 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">storage</span>
          存储信息
        </h2>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between py-2 border-b border-white/10">
            <span class="text-white/70">喜欢的歌曲</span>
            <span class="text-white font-medium">{{ likedCount }} 首</span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-white/10">
            <span class="text-white/70">自建歌单</span>
            <span class="text-white font-medium">{{ playlistCount }} 个</span>
          </div>
        </div>
        <p class="text-xs text-white/40 mt-4">如需删除数据，请前往对应页面进行操作</p>
      </section>

      <!-- 关于 -->
      <section class="bg-white/5 rounded-xl p-6 backdrop-blur-sm">
        <h2 class="text-lg font-bold mb-6 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">info</span>
          关于
        </h2>
        <div class="flex flex-col gap-3 text-sm text-white/60">
          <p><span class="text-white/80 font-medium">LinMusic</span> - 在线音乐播放器</p>
          <p>版本: 1.0.0</p>
          <p>音乐数据来源于网易云音乐、QQ音乐、酷我音乐</p>
          <p class="text-white/40 mt-2">本项目仅供学习交流使用</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { globalToast } from '@/composables/useToast'
import { getPlaylists } from '@/api/playlist'
import { storeToRefs } from 'pinia'

defineOptions({
  name: 'SettingsView'
})

const appStore = useAppStore()
const { settings } = storeToRefs(appStore)

const likedCount = ref(0)
const playlistCount = ref(0)

const loadStorageInfo = async () => {
  try {
    const liked = localStorage.getItem('linmusic-liked')
    likedCount.value = liked ? JSON.parse(liked).length : 0
    const playlists = await getPlaylists()
    playlistCount.value = playlists.length
  } catch {
    // ignore
  }
}

const saveSettings = () => {
  appStore.saveSettings()
  globalToast.success('设置已保存')
}

onMounted(() => {
  loadStorageInfo()
})
</script>

<style scoped>
select option {
  background-color: #282828;
  color: white;
}
</style>
