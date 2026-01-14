import { Env, successResponse, errorResponse } from './_shared'

interface RequestContext {
  request: Request
  env: Env
}

interface CheckLikedRequest {
  songs: Array<{ id: string; platform: string }>
}

// POST /api/check-liked - 批量检查歌曲是否已喜欢
export async function onRequest(context: RequestContext): Promise<Response> {
  const { request, env } = context

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

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const body = await request.json() as CheckLikedRequest

    if (!body.songs || !Array.isArray(body.songs)) {
      return errorResponse('Invalid request body')
    }

    // 构建查询
    const placeholders = body.songs.map(() => '(?, ?)').join(', ')
    const values = body.songs.flatMap(s => [s.id, s.platform])

    const { results } = await env.DB.prepare(`
      SELECT song_id, platform FROM liked_songs
      WHERE (song_id, platform) IN (VALUES ${placeholders})
    `).bind(...values).all()

    // 构建结果映射
    const likedMap: Record<string, boolean> = {}
    for (const row of results as any[]) {
      likedMap[`${row.platform}-${row.song_id}`] = true
    }

    return successResponse(likedMap)
  } catch (error) {
    console.error('Check liked API error:', error)
    return errorResponse('Internal server error', 500)
  }
}
