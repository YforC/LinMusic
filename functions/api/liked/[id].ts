import { Env, successResponse, errorResponse } from '../_shared'

interface RequestContext {
  request: Request
  env: Env
  params: { id: string }
}

// DELETE /api/liked/:id - 取消喜欢（id 格式: platform-songId）
export async function onRequest(context: RequestContext): Promise<Response> {
  const { request, env, params } = context

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }

  try {
    if (request.method === 'DELETE') {
      // 解析 id: platform-songId
      const [platform, ...songIdParts] = params.id.split('-')
      const songId = songIdParts.join('-')

      if (!platform || !songId) {
        return errorResponse('Invalid ID format')
      }

      await env.DB.prepare(`
        DELETE FROM liked_songs WHERE platform = ? AND song_id = ?
      `).bind(platform, songId).run()

      return successResponse({ unliked: true })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Liked API error:', error)
    return errorResponse('Internal server error', 500)
  }
}
