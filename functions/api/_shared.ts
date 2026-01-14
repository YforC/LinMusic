// Cloudflare Pages Functions 类型定义

export interface Env {
  DB: D1Database
}

export interface Song {
  id: string
  platform: 'netease' | 'kuwo' | 'qq'
  name: string
  artist: string
  album?: string
  duration?: number
  coverUrl?: string
}

export interface Playlist {
  id: number
  name: string
  description?: string
  coverUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// JSON 响应辅助函数
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

// 错误响应
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse<ApiResponse>({ success: false, error: message }, status)
}

// 成功响应
export function successResponse<T>(data: T): Response {
  return jsonResponse<ApiResponse<T>>({ success: true, data })
}
