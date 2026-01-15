import { Env, successResponse, errorResponse } from '../_shared'

interface RequestContext {
  request: Request
  env: Env
}

// GET /api/playlists - 获取所有歌单
// POST /api/playlists - 创建歌单
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

  try {
    if (request.method === 'GET') {
      // 获取所有歌单
      const { results } = await env.DB.prepare(`
        SELECT
          p.id,
          p.name,
          p.description,
          COALESCE(
            p.cover_url,
            (
              SELECT cover_url
              FROM playlist_songs
              WHERE playlist_id = p.id AND cover_url IS NOT NULL
              ORDER BY added_at DESC, sort_order DESC
              LIMIT 1
            )
          ) as cover_url,
          p.created_at,
          p.updated_at,
          COUNT(ps.id) as song_count
        FROM playlists p
        LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
        GROUP BY p.id
        ORDER BY p.updated_at DESC
      `).all()

      return successResponse(results)
    }

    if (request.method === 'POST') {
      // 创建歌单
      const body = await request.json() as { name: string; description?: string; coverUrl?: string }

      if (!body.name) {
        return errorResponse('歌单名称不能为空')
      }

      const result = await env.DB.prepare(`
        INSERT INTO playlists (name, description, cover_url)
        VALUES (?, ?, ?)
      `).bind(body.name, body.description || null, body.coverUrl || null).run()

      return successResponse({
        id: result.meta.last_row_id,
        name: body.name,
        description: body.description,
        coverUrl: body.coverUrl
      })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Playlists API error:', error)
    return errorResponse('Internal server error', 500)
  }
}
