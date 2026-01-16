/**
 * 格式化时长
 * @param seconds 秒数
 * @returns 格式化后的时间字符串 (m:ss)
 */
export function normalizeDuration(value?: number | string | null): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string' && value.includes(':')) {
    const parts = value.split(':').map((part) => Number(part))
    if (parts.every((part) => !isNaN(part))) {
      return parts.reduce((total, part) => total * 60 + part, 0)
    }
  }
  const parsed = typeof value === 'string' ? Number(value) : value
  if (!parsed || isNaN(parsed)) return undefined
  if (parsed > 1000) return Math.round(parsed / 1000)
  return Math.round(parsed)
}

export function formatDuration(seconds?: number): string {
  const normalized = normalizeDuration(seconds)
  if (!normalized || isNaN(normalized)) {
    return '0:00'
  }

  const mins = Math.floor(normalized / 60)
  const secs = Math.floor(normalized % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 格式化日期
 * @param dateStr 日期字符串
 * @returns 格式化后的日期
 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'

  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days} 天前`
    if (days < 30) return `${Math.floor(days / 7)} 周前`
    if (days < 365) return `${Math.floor(days / 30)} 个月前`

    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateStr
  }
}

/**
 * 格式化数字（添加千位分隔符）
 * @param num 数字
 * @returns 格式化后的字符串
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

/**
 * 截断文本
 * @param text 文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * 平台名称映射
 */
export const platformNames: Record<string, string> = {
  netease: '网易云',
  kuwo: '酷我',
  qq: 'QQ音乐'
}

/**
 * 获取平台显示名称
 * @param platform 平台标识
 * @returns 平台显示名称
 */
export function getPlatformName(platform: string): string {
  return platformNames[platform] || platform
}

export function normalizeImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined

  let normalized = trimmed
  if (normalized.startsWith('//')) normalized = `https:${normalized}`
  if (normalized.startsWith('http://')) normalized = `https://${normalized.slice(7)}`

  // 酷我音乐图片服务器 SSL 证书无效，需要通过代理
  if (
    normalized.includes('kwcdn.kuwo.cn')
    || normalized.includes('star.kuwo.cn')
    || (normalized.includes('kwimg') && normalized.includes('kuwo.cn'))
  ) {
    return `/api/image-proxy?url=${encodeURIComponent(normalized)}`
  }

  return normalized
}
