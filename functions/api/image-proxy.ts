interface RequestContext {
  request: Request
}

// 允许代理的图片域名白名单
const ALLOWED_DOMAINS = [
  'img1.kwcdn.kuwo.cn',
  'img2.kwcdn.kuwo.cn',
  'img3.kwcdn.kuwo.cn',
  'img4.kwcdn.kuwo.cn',
  'kwcdn.kuwo.cn',
  'star.kuwo.cn'
]

// GET /api/image-proxy?url=xxx - 代理图片请求
export async function onRequest(context: RequestContext): Promise<Response> {
  const { request } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(request.url)
  const imageUrl = url.searchParams.get('url')

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 })
  }

  // 解析图片 URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(imageUrl)
  } catch {
    return new Response('Invalid url parameter', { status: 400 })
  }

  // 检查域名是否在白名单中
  const isAllowed = ALLOWED_DOMAINS.some(domain =>
    parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
  )

  if (!isAllowed) {
    return new Response('Domain not allowed', { status: 403 })
  }

  try {
    // 使用 HTTP 请求图片（避免 SSL 证书问题）
    const httpUrl = imageUrl.replace(/^https:\/\//, 'http://')

    const response = await fetch(httpUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      return new Response('Failed to fetch image', { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const cacheControl = response.headers.get('cache-control') || 'public, max-age=86400'

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return new Response('Failed to fetch image', { status: 500 })
  }
}
