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
  const userAgent = request.headers.get('user-agent')
  if (range) headers.set('range', range)
  if (accept) headers.set('accept', accept)
  if (userAgent) headers.set('user-agent', userAgent)

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
