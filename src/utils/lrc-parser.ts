import type { LyricLine } from '@/api/types'

/**
 * 解析 LRC 格式歌词
 * @param lrcText LRC 格式歌词文本
 * @returns 解析后的歌词数组
 */
export function parseLrc(lrcText: string): LyricLine[] {
  if (!lrcText || typeof lrcText !== 'string') {
    return []
  }

  const lines = lrcText.split('\n')
  const lyrics: LyricLine[] = []

  // 匹配时间标签 [mm:ss.xx] 或 [mm:ss:xx] 或 [mm:ss]
  const timeRegex = /\[(\d{2}):(\d{2})([.:]\d{2,3})?\]/g

  for (const line of lines) {
    // 跳过元数据行（如 [ti:], [ar:], [al:] 等）
    if (/^\[[a-z]+:/.test(line)) {
      continue
    }

    // 提取所有时间标签
    const times: number[] = []
    let match: RegExpExecArray | null

    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      let milliseconds = 0

      if (match[3]) {
        const msStr = match[3].slice(1) // 移除 . 或 :
        milliseconds = parseInt(msStr.padEnd(3, '0').slice(0, 3), 10)
      }

      const time = minutes * 60 + seconds + milliseconds / 1000
      times.push(time)
    }

    // 提取歌词文本（移除所有时间标签）
    const text = line.replace(/\[\d{2}:\d{2}([.:]\d{2,3})?\]/g, '').trim()

    // 如果有时间标签和文本，添加到结果
    if (times.length > 0 && text) {
      for (const time of times) {
        lyrics.push({ time, text })
      }
    }
  }

  // 按时间排序
  lyrics.sort((a, b) => a.time - b.time)

  return lyrics
}

/**
 * 格式化时间为 mm:ss 格式
 * @param seconds 秒数
 * @returns 格式化后的时间字符串
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return '0:00'
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 格式化时间为 mm:ss.xx 格式（用于歌词）
 * @param seconds 秒数
 * @returns 格式化后的时间字符串
 */
export function formatLrcTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00.00'
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

/**
 * 根据当前时间查找对应的歌词索引
 * @param lyrics 歌词数组
 * @param currentTime 当前播放时间（秒）
 * @returns 当前歌词索引，-1 表示未找到
 */
export function findLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  if (!lyrics || lyrics.length === 0) {
    return -1
  }

  // 从后往前查找第一个时间小于等于当前时间的歌词
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (currentTime >= lyrics[i].time) {
      return i
    }
  }

  return -1
}
