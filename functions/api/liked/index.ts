import { Env, Song, successResponse, errorResponse } from '../_shared'

interface RequestContext {
  request: Request
  env: Env
}

// GET /api/liked - 获取喜欢的歌曲列表
// POST /api/liked - 添加喜欢的歌曲
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
      // 获取喜欢的歌曲列表
      const { results } = await env.DB.prepare(`
        SELECT
          song_id as id,
          platform,
          name,
          artist,
          album,
          duration,
          cover_url as coverUrl,
          liked_at as likedAt
        FROM liked_songs
        ORDER BY liked_at DESC
      `).all()

      return successResponse(results)
    }

    if (request.method === 'POST') {
      // 添加喜欢的歌曲
      const song = await request.json() as Song

      if (!song.id || !song.platform || !song.name || !song.artist) {
        return errorResponse('缺少必要字段')
      }

      // 使用 INSERT OR REPLACE 避免重复
      await env.DB.prepare(`
        INSERT OR REPLACE INTO liked_songs (song_id, platform, name, artist, album, duration, cover_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        song.id,
        song.platform,
        song.name,
        song.artist,
        song.album || null,
        song.duration || null,
        song.coverUrl || null
      ).run()

      return successResponse({ liked: true, song })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Liked API error:', error)
    return errorResponse('Internal server error', 500)
  }
}
