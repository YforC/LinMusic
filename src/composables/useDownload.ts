import { ref } from 'vue'
import { getPlayUrl, type AudioQuality } from '@/api/music'
import type { Song } from '@/api/types'

export function useDownload() {
  const isDownloading = ref(false)
  const downloadProgress = ref(0)

  /**
   * 下载歌曲
   * @param song 歌曲信息
   * @param quality 音质
   */
  async function downloadSong(song: Song, quality: AudioQuality = '320k') {
    isDownloading.value = true
    downloadProgress.value = 0

    try {
      const url = getPlayUrl(song.id, song.platform, quality)

      // 方法1: 直接触发浏览器下载（适用于支持 Content-Disposition 的响应）
      const link = document.createElement('a')
      link.href = url
      link.download = `${song.name} - ${song.artist}.mp3`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 注意：由于是 302 重定向，无法获取真实的下载进度
      // 这里只是模拟进度
      downloadProgress.value = 100
    } catch (error) {
      console.error('Download failed:', error)
      throw error
    } finally {
      isDownloading.value = false
    }
  }

  /**
   * 使用 fetch 下载（可以获取进度，但可能有跨域问题）
   * @param song 歌曲信息
   * @param quality 音质
   */
  async function downloadWithProgress(song: Song, quality: AudioQuality = '320k') {
    isDownloading.value = true
    downloadProgress.value = 0

    try {
      const url = getPlayUrl(song.id, song.platform, quality)
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const chunks: BlobPart[] = []
      let received = 0

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        if (!value) continue
        const chunk = new Uint8Array(value)
        chunks.push(chunk)
        received += chunk.length

        if (total > 0) {
          downloadProgress.value = Math.round((received / total) * 100)
        }
      }

      // 合并所有 chunks
      const blob = new Blob(chunks, { type: 'audio/mpeg' })
      const blobUrl = URL.createObjectURL(blob)

      // 触发下载
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${song.name} - ${song.artist}.mp3`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 清理
      URL.revokeObjectURL(blobUrl)
      downloadProgress.value = 100
    } catch (error) {
      console.error('Download with progress failed:', error)
      // 降级到简单下载
      await downloadSong(song, quality)
    } finally {
      isDownloading.value = false
    }
  }

  return {
    isDownloading,
    downloadProgress,
    downloadSong,
    downloadWithProgress
  }
}
