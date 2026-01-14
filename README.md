# LinMusic

一个部署在 Cloudflare Pages 上的在线 Web 音乐播放平台。

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite + Tailwind CSS
- **后端**: Cloudflare Pages Functions
- **数据库**: Cloudflare D1 (SQLite)
- **音乐 API**: TuneHub (聚合网易云、酷我、QQ音乐)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 D1 数据库

```bash
# 登录 Cloudflare
npx wrangler login

# 创建数据库
npx wrangler d1 create linmusic-db

# 复制返回的 database_id 到 wrangler.toml
```

### 3. 初始化数据库

```bash
npx wrangler d1 execute linmusic-db --file=./migrations/0001_init.sql
```

### 4. 本地开发

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 部署

```bash
npm run build
npx wrangler pages deploy dist
```

## 项目结构

```
linmusic/
├── src/                    # 前端源码
│   ├── api/               # API 类型定义
│   ├── components/        # Vue 组件
│   ├── stores/            # Pinia 状态管理
│   ├── views/             # 页面视图
│   └── router/            # 路由配置
├── functions/             # Cloudflare Pages Functions
│   └── api/              # API 路由
├── migrations/            # D1 数据库迁移
└── public/               # 静态资源
```

## 功能特性

- 🎵 多平台音乐搜索（网易云、酷我、QQ音乐）
- 📋 自定义歌单管理
- ❤️ 喜欢的歌曲收藏
- 📊 排行榜浏览
- 🎤 歌词同步显示
- ⬇️ 歌曲下载
- ⚙️ 个性化设置

## License

MIT
