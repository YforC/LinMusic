# TuneHub API 接口文档

TuneHub 是一个统一的音乐信息解析服务。它打破了不同音乐平台之间的壁垒，提供了一套标准化的 API 接口。

Base URL: https://music-dl.sayqz.com

## 支持的平台

| 平台标识 (source) | 平台名称   | 状态     |
| ----------------- | ---------- | -------- |
| `netease`         | 网易云音乐 | ✅ 已启用 |
| `kuwo`            | 酷我音乐   | ✅ 已启用 |
| `qq`              | QQ音乐     | ✅ 已启用 |

## 1. 获取歌曲基本信息GET

GET /api/?source={source}&id={id}&type=info

获取歌曲的名称、歌手、专辑等基本元数据信息。

Response Example

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "name": "歌曲名称",
    "artist": "歌手名称",
    "album": "专辑名称",
    "url": "https://music-dl.sayqz.com/api/?source=netease&id=123456&type=url",
    "pic": "https://music-dl.sayqz.com/api/?source=netease&id=123456&type=pic",
    "lrc": "https://music-dl.sayqz.com/api/?source=netease&id=123456&type=lrc"
  },
  "timestamp": "2025-11-23T12:00:00.000+08:00"
}
```

## 2. 获取音乐文件链接GET

GET /api/?source={source}&id={id}&type=url&br=[320k]

#### 音质参数 (br) 对照表

| 值          | 说明        | 比特率    |
| ----------- | ----------- | --------- |
| `128k`      | 标准音质    | 128kbps   |
| `320k`      | 高品质      | 320kbps   |
| `flac`      | 无损音质    | ~1000kbps |
| `flac24bit` | Hi-Res 音质 | ~1400kbps |

💡 响应说明 (Response)

- 成功时返回 **302 Redirect** 到实际的音乐文件 URL。
- **自动换源**：当请求的原平台失败时，系统会自动尝试其他平台。此时响应头会包含 `X-Source-Switch` 字段（例如：`netease -> kuwo`）。

## 3. 获取专辑封面GET

获取歌曲的专辑封面图片。

GET /api/?source={source}&id={id}&type=pic

Response: 302 Redirect to image URL.

## 4. 获取歌词GET

获取歌曲的 LRC 格式歌词。

GET /api/?source={source}&id={id}&type=lrc

Response Example (Text/Plain)

```text
[00:00.00]歌词第一行
[00:05.50]歌词第二行
[00:10.20]歌词第三行
```

## 5. 搜索歌曲GET

GET /api/?source={source}&type=search&keyword={keyword}&limit=[20]

Response Example

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "keyword": "周杰伦",
    "total": 10,
    "results": [
      {
        "id": "123456",
        "name": "歌曲名称",
        "artist": "周杰伦",
        "album": "专辑名称",
        "url": "https://music-dl.sayqz.com/api/?...",
        "platform": "netease"
      }
    ]
  }
}
```

## 6. 聚合搜索GET

GET /api/?type=aggregateSearch&keyword={keyword}

Response Example

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "keyword": "周杰伦",
    "results": [
      {
        "id": "123456",
        "name": "歌曲名称",
        "artist": "周杰伦",
        "platform": "netease"
      },
      {
        "id": "789012",
        "name": "另一首歌",
        "artist": "周杰伦",
        "platform": "kuwo"
      }
    ]
  }
}
```

## 7-9. 歌单与排行榜

### 7. 获取歌单详情

GET /api/?source={source}&id={id}&type=playlist

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": "123456",
        "name": "歌曲名称",
        "types": ["flac", "320k", "128k"]
      }
    ],
    "info": {
      "name": "歌单名称",
      "author": "创建者"
    }
  }
}
```

### 8. 获取排行榜列表

GET /api/?source={source}&type=toplists

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": "19723756",
        "name": "飙升榜",
        "updateFrequency": "每天更新"
      }
    ]
  }
}
```

### 9. 获取排行榜歌曲

GET /api/?source={source}&id={id}&type=toplist

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": "123456",
        "name": "歌曲名称"
      }
    ],
    "source": "netease"
  }
}
```

## 10-11. 系统监控

GET /status

```json
{
  "code": 200,
  "data": {
    "status": "running",
    "platforms": { "netease": { "enabled": true } }
  }
}
```

GET /health

```json
{
  "code": 200,
  "data": { "status": "healthy" }
}
```

## 统计分析 API 详解

TuneHub 提供完整的 API 调用统计分析功能。所有数据均使用 **UTC+8（北京时间）** 时区。

### 12. 获取统计数据GET

GET /stats?period=[today]&groupBy=[platform]

Response Example

```json
{
  "code": 200,
  "data": {
    "period": "today",
    "overall": {
      "total_calls": 15420,
      "success_calls": 14856,
      "success_rate": 96.34,
      "avg_duration": 245.67
    },
    "breakdown": [
      {
        "group_key": "netease",
        "total_calls": 8234,
        "success_rate": 97.13
      }
    ],
    "qps": {
      "avg_qps": 0.1785,
      "peak_qps": 2.4567
    }
  }
}
```

### 13. 获取统计摘要GET

GET /stats/summary

```json
{
  "code": 200,
  "data": {
    "today": {
      "total_calls": 15420,
      "success_rate": 96.34
    },
    "week": {
      "total_calls": 98765
    },
    "top_platforms_today": [
      { "group_key": "netease", "total_calls": 8234 }
    ]
  }
}
```

### 14. 平台统计概览GET

GET /stats/platforms?period=[today]

```json
{
  "code": 200,
  "data": {
    "platforms": {
      "netease": {
        "total_calls": 8234,
        "success_rate": 97.13
      },
      "kuwo": {
        "total_calls": 4521,
        "success_rate": 97.08
      }
    }
  }
}
```

### 15. QPS 统计GET

GET /stats/qps?period=[today]

```json
{
  "code": 200,
  "data": {
    "qps": {
      "avg_qps": 0.1785,
      "peak_qps": 2.4567,
      "hourly_data": [
        {
          "date": "2025-11-24",
          "hour": 14,
          "calls": 8845,
          "qps": "2.4569"
        }
      ]
    }
  }
}
```

### 16. 趋势数据GET

GET /stats/trends?period=[week]

```json
{
  "code": 200,
  "data": {
    "trends": [
      {
        "date": "2025-11-17",
        "total_calls": 12345,
        "success_rate": 96.20
      },
      {
        "date": "2025-11-18",
        "total_calls": 13567,
        "success_rate": 96.48
      }
    ]
  }
}
```

### 17. 请求类型统计GET

GET /stats/types?period=[today]

```json
{
  "code": 200,
  "data": {
    "requestTypes": {
      "url": {
        "total_calls": 6234,
        "success_rate": 96.21
      },
      "info": {
        "total_calls": 4521,
        "success_rate": 98.56
      }
    }
  }
}
```

## 高级特性

### 🔄 自动换源 (Auto-Switch)

当请求 `type=url` 时，如果原平台获取失败，系统会自动按配置优先级尝试其他平台。

换源优先级:

1. kuwo (酷我音乐)
2. netease (网易云音乐)
3. qq (QQ音乐)

### 🔍 聚合搜索 (Aggregate Search)

使用 `aggregateSearch` 可以一次性并发请求所有启用的平台，并对结果进行智能混合排列。

特性:

- 并发请求，速度快
- 自动去重
- 支持统一分页