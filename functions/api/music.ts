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

  // 检查请求类型
  const requestType = url.searchParams.get('type')
  const source = url.searchParams.get('source')

  // 对于播放 URL 请求，返回上游 API 的 302 重定向给客户端
  // 让浏览器直接请求音频 URL（audio 元素不受跨域限制）
  if (requestType === 'url') {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers,
      redirect: 'manual'
    })

    // 如果上游返回 302/301 重定向，直接返回给客户端
    if (upstream.status === 302 || upstream.status === 301) {
      const location = upstream.headers.get('location')
      if (location) {
        return new Response(null, {
          status: 302,
          headers: {
            'Location': location,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Content-Type'
          }
        })
      }
    }

    // 如果不是重定向，正常返回上游响应
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

  // 对于酷我封面图片请求，直接代理上游 API 的响应（避免 SSL 证书问题）
  if (requestType === 'pic' && source === 'kuwo') {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers,
      redirect: 'follow'
    })

    if (!upstream.ok) {
      return new Response('Failed to fetch image', { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=86400'

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  // 对于其他请求（info, search, lrc, pic 等），正常代理
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
