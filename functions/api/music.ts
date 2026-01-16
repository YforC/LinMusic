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
  // 检查是否是获取酷我封面图片的请求
  const isPicRequest = url.searchParams.get('type') === 'pic'
  const source = url.searchParams.get('source')

  if (isUrlRequest) {
    // 获取上游的重定向 URL
    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers,
      redirect: 'manual'
    })

    // 如果上游返回 302，获取实际的音频 URL
    if (upstream.status === 302 || upstream.status === 301) {
      const location = upstream.headers.get('location')
      if (location) {
        // QQ 音乐的 HTTPS 会返回 403，需要使用 HTTP 并代理流
        // 其他平台可以尝试 HTTPS 重定向
        const isQQ = source === 'qq' || location.includes('qqmusic.qq.com')

        if (isQQ) {
          // QQ 音乐：代理音频流（使用 HTTP URL）
          const audioHeaders = new Headers()
          audioHeaders.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
          audioHeaders.set('accept', '*/*')
          audioHeaders.set('accept-language', 'zh-CN,zh;q=0.9,en;q=0.8')
          audioHeaders.set('referer', 'https://y.qq.com/')
          if (range) audioHeaders.set('range', range)

          // 确保使用 HTTP（QQ 音乐 HTTPS 会 403）
          const httpUrl = location.replace(/^https:\/\//, 'http://')

          try {
            const audioResponse = await fetch(httpUrl, {
              method: request.method,
              headers: audioHeaders
            })

            // 检查响应是否成功
            if (!audioResponse.ok) {
              return new Response(JSON.stringify({
                error: 'Failed to fetch QQ audio',
                status: audioResponse.status,
                statusText: audioResponse.statusText,
                url: httpUrl
              }), {
                status: audioResponse.status,
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
            responseHeaders.set('Content-Type', audioResponse.headers.get('content-type') || 'audio/mpeg')

            const contentLength = audioResponse.headers.get('content-length')
            if (contentLength) responseHeaders.set('Content-Length', contentLength)

            const contentRange = audioResponse.headers.get('content-range')
            if (contentRange) responseHeaders.set('Content-Range', contentRange)

            const acceptRanges = audioResponse.headers.get('accept-ranges')
            if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges)

            return new Response(audioResponse.body, {
              status: audioResponse.status,
              statusText: audioResponse.statusText,
              headers: responseHeaders
            })
          } catch (fetchError: any) {
            return new Response(JSON.stringify({
              error: 'Fetch error for QQ audio',
              message: fetchError.message || 'Unknown error',
              url: httpUrl
            }), {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            })
          }
        } else {
          // 其他平台：直接跟随重定向并代理音频流
          const audioHeaders = new Headers()
          audioHeaders.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
          if (range) audioHeaders.set('range', range)

          const audioResponse = await fetch(location, {
            method: request.method,
            headers: audioHeaders,
            redirect: 'follow'
          })

          const responseHeaders = new Headers()
          responseHeaders.set('Access-Control-Allow-Origin', '*')
          responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
          responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type')
          responseHeaders.set('Content-Type', audioResponse.headers.get('content-type') || 'audio/mpeg')

          const contentLength = audioResponse.headers.get('content-length')
          if (contentLength) responseHeaders.set('Content-Length', contentLength)

          const contentRange = audioResponse.headers.get('content-range')
          if (contentRange) responseHeaders.set('Content-Range', contentRange)

          const acceptRanges = audioResponse.headers.get('accept-ranges')
          if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges)

          return new Response(audioResponse.body, {
            status: audioResponse.status,
            statusText: audioResponse.statusText,
            headers: responseHeaders
          })
        }
      }
    }

    // 如果不是重定向，正常返回
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

  // 对于酷我封面图片请求，直接代理图片内容（避免 SSL 证书问题）
  if (isPicRequest && source === 'kuwo') {
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
