import { Env, Song, successResponse, errorResponse } from '../_shared'

interface RequestContext {
  request: Request
  env: Env
}

interface AddSongRequest extends Song {
  playlistId: number
}

// POST /api/playlist-songs - 添加歌曲到歌单
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
    const body = await request.json() as AddSongRequest

    if (!body.playlistId || !body.id || !body.platform || !body.name || !body.artist) {
      return errorResponse('缺少必要字段')
    }

    // 检查歌单是否存在
    const playlist = await env.DB.prepare(`
      SELECT id FROM playlists WHERE id = ?
    `).bind(body.playlistId).first()

    if (!playlist) {
      return errorResponse('歌单不存在', 404)
    }

    // 获取当前最大排序值
    const maxOrder = await env.DB.prepare(`
      SELECT MAX(sort_order) as max_order FROM playlist_songs WHERE playlist_id = ?
    `).bind(body.playlistId).first() as { max_order: number | null }

    const sortOrder = (maxOrder?.max_order || 0) + 1

    // 添加歌曲
    const result = await env.DB.prepare(`
      INSERT INTO playlist_songs (playlist_id, song_id, platform, name, artist, album, duration, cover_url, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.playlistId,
      body.id,
      body.platform,
      body.name,
      body.artist,
      body.album || null,
      body.duration || null,
      body.coverUrl || null,
      sortOrder
    ).run()

    // 更新歌单的更新时间
    await env.DB.prepare(`
      UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(body.playlistId).run()

    return successResponse({
      id: result.meta.last_row_id,
      playlistId: body.playlistId,
      song: body
    })
  } catch (error) {
    console.error('Playlist songs API error:', error)
    return errorResponse('Internal server error', 500)
  }
}
