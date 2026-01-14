import { Env, successResponse, errorResponse } from '../_shared'

interface RequestContext {
  request: Request
  env: Env
  params: { id: string }
}

// GET /api/playlists/:id - 获取歌单详情
// PUT /api/playlists/:id - 更新歌单
// DELETE /api/playlists/:id - 删除歌单
export async function onRequest(context: RequestContext): Promise<Response> {
  const { request, env, params } = context
  const playlistId = parseInt(params.id)

  if (isNaN(playlistId)) {
    return errorResponse('Invalid playlist ID')
  }

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
      // 获取歌单信息
      const playlist = await env.DB.prepare(`
        SELECT * FROM playlists WHERE id = ?
      `).bind(playlistId).first()

      if (!playlist) {
        return errorResponse('Playlist not found', 404)
      }

      // 获取歌单歌曲
      const { results: songs } = await env.DB.prepare(`
        SELECT
          id as playlistSongId,
          song_id as id,
          platform,
          name,
          artist,
          album,
          duration,
          cover_url as coverUrl,
          added_at as addedAt
        FROM playlist_songs
        WHERE playlist_id = ?
        ORDER BY sort_order ASC, added_at DESC
      `).bind(playlistId).all()

      return successResponse({
        playlist: {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          coverUrl: playlist.cover_url,
          createdAt: playlist.created_at,
          updatedAt: playlist.updated_at
        },
        songs
      })
    }

    if (request.method === 'PUT') {
      // 更新歌单
      const body = await request.json() as { name?: string; description?: string; coverUrl?: string }

      const updates: string[] = []
      const values: any[] = []

      if (body.name !== undefined) {
        updates.push('name = ?')
        values.push(body.name)
      }
      if (body.description !== undefined) {
        updates.push('description = ?')
        values.push(body.description)
      }
      if (body.coverUrl !== undefined) {
        updates.push('cover_url = ?')
        values.push(body.coverUrl)
      }

      if (updates.length === 0) {
        return errorResponse('No fields to update')
      }

      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(playlistId)

      await env.DB.prepare(`
        UPDATE playlists SET ${updates.join(', ')} WHERE id = ?
      `).bind(...values).run()

      return successResponse({ id: playlistId, ...body })
    }

    if (request.method === 'DELETE') {
      // 删除歌单（关联的歌曲会自动删除，因为设置了 ON DELETE CASCADE）
      await env.DB.prepare(`
        DELETE FROM playlists WHERE id = ?
      `).bind(playlistId).run()

      return successResponse({ deleted: true })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Playlist API error:', error)
    return errorResponse('Internal server error', 500)
  }
}
