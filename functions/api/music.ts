import { errorResponse } from './_shared'

interface RequestContext {
  request: Request
}

const UPSTREAM_BASE = 'https://music-dl.sayqz.com/api'

// GET /api/music - proxy upstream music API to keep media on same origin
export async function onRequest(context: RequestContext): Promise<Response> {
  const { request } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type'
      }
    })
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return errorResponse('Method not allowed', 405)
  }

  const url = new URL(request.url)
  const upstreamUrl = new URL(UPSTREAM_BASE)
  upstreamUrl.search = url.search

  const headers = new Headers()
  const range = request.headers.get('range')
  const accept = request.headers.get('accept')
  // 使用通用的浏览器 User-Agent
  headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
  if (range) headers.set('range', range)
  if (accept) headers.set('accept', accept)

  // 检查是否是获取播放 URL 的请求
  const isUrlRequest = url.searchParams.get('type') === 'url'

  if (isUrlRequest) {
    // 对于播放 URL 请求，直接跟随重定向并代理音频流
    // Cloudflare Workers 的 fetch 会自动处理 HTTP -> HTTPS 升级
    const upstream = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers,
      redirect: 'follow'
    })

    // 检查响应是否成功
    if (!upstream.ok) {
      // 如果失败，返回错误信息
      return new Response(JSON.stringify({
        error: 'Failed to fetch audio',
        status: upstream.status,
        statusText: upstream.statusText
      }), {
        status: upstream.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const responseHeaders = new Headers()
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type')
    responseHeaders.set('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg')

    const contentLength = upstream.headers.get('content-length')
    if (contentLength) responseHeaders.set('Content-Length', contentLength)

    const contentRange = upstream.headers.get('content-range')
    if (contentRange) responseHeaders.set('Content-Range', contentRange)

    const acceptRanges = upstream.headers.get('accept-ranges')
    if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges)

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    })
  }

  // 对于其他请求（info, search, lrc 等），正常跟随重定向
  const upstream = await fetch(upstreamUrl.toString(), {
    method: request.method,
    headers,
    redirect: 'follow'
  })

  const responseHeaders = new Headers(upstream.headers)
  responseHeaders.set('Access-Control-Allow-Origin', '*')
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type')

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  })
}
