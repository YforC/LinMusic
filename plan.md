# LinMusic - 在线Web音乐平台开发计划

## 项目概述

LinMusic 是一个部署在 **Cloudflare Pages** 上的单用户在线音乐播放平台，采用现代化的 Spotify 风格 UI 设计，通过 TuneHub API 聚合多个音乐平台（网易云音乐、酷我音乐、QQ音乐）的资源。使用 **Cloudflare D1** (SQLite) 数据库存储歌单和收藏数据。

---

## 一、技术栈选型

### 前端框架
- **Vue 3** + **TypeScript** - 现代化响应式框架
- **Vite** - 快速构建工具
- **Vue Router** - 路由管理
- **Pinia** - 状态管理（播放器状态、本地缓存）

### UI/样式
- **Tailwind CSS** - 原子化 CSS 框架（与设计稿一致）
- **Material Symbols** - 图标库

### 音频处理
- **Howler.js** 或原生 **Web Audio API** - 音频播放控制

### 后端/数据库
- **Cloudflare Pages** - 静态托管 + Functions
- **Cloudflare D1** (SQLite) - 存储歌单、喜欢的歌曲
- **Cloudflare Pages Functions** - API 路由处理

### 本地存储
- **LocalStorage** - 播放器设置、播放历史（临时数据）

---

## 二、数据库设计 (Cloudflare D1)

### 表结构

```sql
-- 歌单表
CREATE TABLE playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 歌单歌曲关联表
CREATE TABLE playlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    song_id TEXT NOT NULL,           -- 平台歌曲ID
    platform TEXT NOT NULL,          -- netease/kuwo/qq
    name TEXT NOT NULL,              -- 歌曲名
    artist TEXT NOT NULL,            -- 歌手
    album TEXT,                      -- 专辑
    duration INTEGER,                -- 时长(秒)
    cover_url TEXT,                  -- 封面URL
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- 喜欢的歌曲表
CREATE TABLE liked_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id TEXT NOT NULL,           -- 平台歌曲ID
    platform TEXT NOT NULL,          -- netease/kuwo/qq
    name TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    duration INTEGER,
    cover_url TEXT,
    liked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_id, platform)
);

-- 索引
CREATE INDEX idx_playlist_songs_playlist ON playlist_songs(playlist_id);
CREATE INDEX idx_liked_songs_platform ON liked_songs(platform);
```

---

## 三、API 接口

### 外部 API (TuneHub)

**Base URL**: `https://music-dl.sayqz.com`

| 功能 | 接口 | 说明 |
|------|------|------|
| 搜索歌曲 | `GET /api/?source={source}&type=search&keyword={keyword}&limit=20` | 单平台搜索 |
| 聚合搜索 | `GET /api/?type=aggregateSearch&keyword={keyword}` | 多平台聚合搜索 |
| 歌曲信息 | `GET /api/?source={source}&id={id}&type=info` | 获取歌曲元数据 |
| 播放链接 | `GET /api/?source={source}&id={id}&type=url&br=320k` | 获取音频流（302重定向） |
| 专辑封面 | `GET /api/?source={source}&id={id}&type=pic` | 获取封面图片 |
| 歌词 | `GET /api/?source={source}&id={id}&type=lrc` | 获取 LRC 歌词 |
| 歌单详情 | `GET /api/?source={source}&id={id}&type=playlist` | 获取外部歌单 |
| 排行榜列表 | `GET /api/?source={source}&type=toplists` | 获取排行榜分类 |
| 排行榜歌曲 | `GET /api/?source={source}&id={id}&type=toplist` | 获取排行榜歌曲 |

### 内部 API (Cloudflare Pages Functions)

```
/functions/api/
├── playlists/
│   ├── index.ts          GET: 获取所有歌单 / POST: 创建歌单
│   └── [id].ts           GET: 歌单详情 / PUT: 更新 / DELETE: 删除
├── playlist-songs/
│   ├── index.ts          POST: 添加歌曲到歌单
│   └── [id].ts           DELETE: 从歌单移除歌曲
├── liked/
│   ├── index.ts          GET: 获取喜欢列表 / POST: 添加喜欢
│   └── [id].ts           DELETE: 取消喜欢
└── check-liked.ts        POST: 批量检查歌曲是否已喜欢
```

---

## 四、页面结构

### 1. 首页 (`/`)
- 精选歌单卡片网格（从排行榜/推荐获取）
- 最近播放列表（LocalStorage）
- 快捷入口

### 2. 搜索页 (`/search`)
- 搜索输入框
- 热门搜索标签
- 浏览分类（流行、摇滚、嘻哈、电子等）
- 搜索结果展示（支持下载按钮）

### 3. 排行榜页 (`/charts`)
- 排行榜选择（日榜/周榜）
- 歌曲排名列表
- 平台切换 (netease/kuwo/qq)

### 4. 歌单详情页 (`/playlist/:id`)
- 歌单封面与信息
- 歌曲列表（序号、标题、专辑、歌手、时长）
- 播放/收藏/下载操作

### 5. 歌词页 (`/lyrics`)
- 全屏歌词展示
- 专辑封面
- 播放控制

### 6. 我喜欢的音乐 (`/liked`)
- 收藏歌曲列表（从 D1 数据库读取）
- 批量操作

### 7. 设置页 (`/settings`)
- 音质选择 (128k/320k/flac)
- 淡入淡出设置
- 无缝播放开关
- 外观设置
- 清除本地缓存

---

## 五、核心功能说明

### 播放功能
- 点击歌曲 → 调用 API 获取播放链接 → 播放器播放
- 支持播放列表、播放模式切换

### 下载功能
- 点击下载按钮 → 获取音频 URL → 触发浏览器下载
- 使用 `<a download>` 或 `fetch + blob` 方式

### 喜欢功能
- 点击喜欢 → 调用内部 API → 存入 D1 数据库
- 页面加载时批量检查当前列表歌曲的喜欢状态

### 歌单功能
- 创建/编辑/删除歌单 → D1 数据库操作
- 添加/移除歌曲 → 更新关联表

---

## 六、项目目录结构

```
linmusic/
├── public/
│   └── favicon.ico
├── src/
│   ├── api/                    # API 接口封装
│   │   ├── music.ts            # TuneHub 音乐接口
│   │   ├── playlist.ts         # 内部歌单接口
│   │   ├── liked.ts            # 内部喜欢接口
│   │   └── types.ts            # 类型定义
│   ├── assets/
│   │   └── styles/
│   │       └── main.css
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppSidebar.vue
│   │   │   ├── AppHeader.vue
│   │   │   ├── PlayerBar.vue
│   │   │   └── MainLayout.vue
│   │   ├── music/
│   │   │   ├── SongList.vue
│   │   │   ├── SongItem.vue
│   │   │   ├── PlaylistCard.vue
│   │   │   ├── AlbumCover.vue
│   │   │   ├── LyricsDisplay.vue
│   │   │   └── SearchBar.vue
│   │   ├── player/
│   │   │   ├── PlayButton.vue
│   │   │   ├── ProgressBar.vue
│   │   │   ├── VolumeControl.vue
│   │   │   └── PlayModeButton.vue
│   │   └── common/
│   │       ├── CategoryCard.vue
│   │       ├── DownloadButton.vue
│   │       └── LoadingSpinner.vue
│   ├── composables/
│   │   ├── useAudio.ts         # 音频控制
│   │   ├── useLyrics.ts        # 歌词解析
│   │   └── useDownload.ts      # 下载功能
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   ├── player.ts           # 播放器状态
│   │   └── app.ts              # 应用状态
│   ├── views/
│   │   ├── HomeView.vue
│   │   ├── SearchView.vue
│   │   ├── ChartsView.vue
│   │   ├── PlaylistView.vue
│   │   ├── LyricsView.vue
│   │   ├── LikedView.vue
│   │   └── SettingsView.vue
│   ├── utils/
│   │   ├── format.ts           # 格式化工具
│   │   └── lrc-parser.ts       # LRC 歌词解析
│   ├── App.vue
│   └── main.ts
├── functions/                   # Cloudflare Pages Functions
│   └── api/
│       ├── playlists/
│       │   ├── index.ts
│       │   └── [id].ts
│       ├── playlist-songs/
│       │   ├── index.ts
│       │   └── [id].ts
│       ├── liked/
│       │   ├── index.ts
│       │   └── [id].ts
│       └── check-liked.ts
├── migrations/                  # D1 数据库迁移
│   └── 0001_init.sql
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── wrangler.toml               # Cloudflare 配置
```

---

## 七、开发阶段规划

### 阶段一：项目初始化与基础架构
- [ ] 初始化 Vue 3 + Vite + TypeScript 项目
- [ ] 配置 Tailwind CSS
- [ ] 配置 Vue Router 和 Pinia
- [ ] 创建基础布局组件（Sidebar、Header、PlayerBar）
- [ ] 配置 Cloudflare Pages 和 D1 数据库

### 阶段二：数据库与内部 API
- [ ] 创建 D1 数据库表结构
- [ ] 实现 Pages Functions API（歌单 CRUD、喜欢 CRUD）
- [ ] 封装前端 API 请求模块

### 阶段三：核心播放功能
- [ ] 封装 TuneHub API 请求
- [ ] 实现音频播放核心逻辑
- [ ] 实现歌词解析与同步显示
- [ ] 实现下载功能（触发浏览器下载）

### 阶段四：页面开发
- [ ] 首页（精选内容、最近播放）
- [ ] 搜索页（搜索、分类浏览）
- [ ] 排行榜页
- [ ] 歌单详情页
- [ ] 歌词全屏页
- [ ] 我喜欢的音乐页
- [ ] 设置页

### 阶段五：播放器完善
- [ ] 播放列表管理
- [ ] 播放模式切换（顺序、循环、随机、单曲）
- [ ] 进度条拖拽
- [ ] 音量控制
- [ ] 快捷键支持

### 阶段六：优化与部署
- [ ] 响应式适配
- [ ] 错误处理与用户提示
- [ ] 部署到 Cloudflare Pages
- [ ] 绑定 D1 数据库

---

## 八、Cloudflare 配置

### wrangler.toml
```toml
name = "linmusic"
compatibility_date = "2024-01-01"
pages_build_output_dir = "./dist"

[[d1_databases]]
binding = "DB"
database_name = "linmusic-db"
database_id = "<your-database-id>"
```

### 部署命令
```bash
# 创建 D1 数据库
wrangler d1 create linmusic-db

# 执行数据库迁移
wrangler d1 execute linmusic-db --file=./migrations/0001_init.sql

# 本地开发
npm run dev

# 部署
npm run build
wrangler pages deploy dist
```

---

## 九、设计规范

### 颜色系统
```css
--primary: #1DB954;           /* 主题绿色 */
--background-base: #121212;   /* 主背景 */
--sidebar-base: #000000;      /* 侧边栏 */
--card-base: #181818;         /* 卡片背景 */
--card-hover: #282828;        /* 卡片悬停 */
--text-base: #FFFFFF;         /* 主文字 */
--text-subdued: #A7A7A7;      /* 次要文字 */
```

### 字体
- 主字体: `Spline Sans`
- 中文字体: `Noto Sans SC`

---

## 十、注意事项

1. **CORS**: TuneHub API 可能需要通过 Pages Functions 代理
2. **D1 限制**: 免费版有读写次数限制，注意优化查询
3. **音频播放**: 部分浏览器需要用户交互后才能播放
4. **下载功能**: 跨域资源可能需要后端代理下载
5. **自动换源**: 利用 API 的自动换源特性提高可用性

---

## 十一、后续扩展（可选）

- [ ] PWA 支持
- [ ] 音乐可视化效果
- [ ] 均衡器设置
- [ ] 定时关闭功能
- [ ] 导入/导出歌单

---

*计划创建时间: 2026-01-14*
*部署平台: Cloudflare Pages + D1*
