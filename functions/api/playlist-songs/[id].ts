import { Env, successResponse, errorResponse } from '../_shared'

interface RequestContext {
  request: Request
  env: Env
  params: { id: string }
}

// DELETE /api/playlist-songs/:id - 从歌单移除歌曲
export async function onRequest(context: RequestContext): Promise<Response> {
  const { request, env, params } = context
  const id = parseInt(params.id)

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

  if (request.method !== 'DELETE') {
    return errorResponse('Method not allowed', 405)
  }

  if (isNaN(id)) {
    return errorResponse('Invalid ID')
  }

  try {
    // 获取歌曲所属歌单
    const song = await env.DB.prepare(`
      SELECT playlist_id FROM playlist_songs WHERE id = ?
    `).bind(id).first() as { playlist_id: number } | null

    if (!song) {
      return errorResponse('Song not found', 404)
    }

    // 删除歌曲
    await env.DB.prepare(`
      DELETE FROM playlist_songs WHERE id = ?
    `).bind(id).run()

    // 更新歌单的更新时间
    await env.DB.prepare(`
      UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(song.playlist_id).run()

    return successResponse({ deleted: true })
  } catch (error) {
    console.error('Playlist songs API error:', error)
    return errorResponse('Internal server error', 500)
  }
}
