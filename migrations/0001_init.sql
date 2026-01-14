-- LinMusic D1 Database Schema
-- Version: 0001_init

-- 歌单表
CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 歌单歌曲关联表
CREATE TABLE IF NOT EXISTS playlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    song_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('netease', 'kuwo', 'qq')),
    name TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    duration INTEGER,
    cover_url TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- 喜欢的歌曲表
CREATE TABLE IF NOT EXISTS liked_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('netease', 'kuwo', 'qq')),
    name TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    duration INTEGER,
    cover_url TEXT,
    liked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_id, platform)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_song ON playlist_songs(song_id, platform);
CREATE INDEX IF NOT EXISTS idx_liked_songs_platform ON liked_songs(platform);
CREATE INDEX IF NOT EXISTS idx_liked_songs_song ON liked_songs(song_id, platform);
