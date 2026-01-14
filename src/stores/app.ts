import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserSettings } from '@/api/types'

export const useAppStore = defineStore('app', () => {
  // 用户设置
  const settings = ref<UserSettings>({
    audioQuality: '320k',
    crossfade: 0,
    gaplessPlayback: true,
    autoPlay: false,
    theme: 'dark',
    language: 'zh-CN'
  })

  // 侧边栏是否收起
  const sidebarCollapsed = ref(false)

  // 侧边栏是否展开（移动端）
  const sidebarOpen = ref(false)

  // 是否显示歌词页
  const showLyrics = ref(false)

  // 加载设置
  function loadSettings() {
    const saved = localStorage.getItem('linmusic-settings')
    if (saved) {
      try {
        settings.value = { ...settings.value, ...JSON.parse(saved) }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
  }

  // 保存设置
  function saveSettings() {
    localStorage.setItem('linmusic-settings', JSON.stringify(settings.value))
  }

  // 更新设置
  function updateSettings(newSettings: Partial<UserSettings>) {
    settings.value = { ...settings.value, ...newSettings }
    saveSettings()
  }

  // 切换侧边栏
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  // 切换侧边栏收起状态
  function toggleSidebarCollapsed() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  // 切换歌词显示
  function toggleLyrics() {
    showLyrics.value = !showLyrics.value
  }

  // 清除本地数据
  function clearLocalData() {
    localStorage.removeItem('linmusic-settings')
    localStorage.removeItem('linmusic-history')
    settings.value = {
      audioQuality: '320k',
      crossfade: 0,
      gaplessPlayback: true,
      autoPlay: false,
      theme: 'dark',
      language: 'zh-CN'
    }
  }

  // 初始化时加载设置
  loadSettings()

  return {
    settings,
    sidebarCollapsed,
    sidebarOpen,
    showLyrics,
    loadSettings,
    saveSettings,
    updateSettings,
    toggleSidebar,
    toggleSidebarCollapsed,
    toggleLyrics,
    clearLocalData
  }
})
