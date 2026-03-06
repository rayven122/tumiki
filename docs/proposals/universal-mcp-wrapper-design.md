# Universal MCP Wrapper 設計書

**作成日**: 2026-03-05
**ステータス**: Draft
**関連リポジトリ**:
- https://github.com/rayven122/tumiki-mcp-http-adapter
- https://github.com/rayven122/tumiki-mcp-cloudrun

---

## 目次

1. [概要](#1-概要)
2. [アーキテクチャ](#2-アーキテクチャ)
3. [tumiki-mcp-http-adapter 拡張仕様](#3-tumiki-mcp-http-adapter-拡張仕様)
4. [プロセスプール設計](#4-プロセスプール設計)
5. [カタログAPI設計](#5-カタログapi設計)
6. [Cloud Run構成](#6-cloud-run構成)
7. [tumiki-proxy統合](#7-tumiki-proxy統合)
8. [エラーハンドリング](#8-エラーハンドリング)
9. [監視・ログ](#9-監視ログ)
10. [実装計画](#10-実装計画)

---

## 1. 概要

### 1.1 目的

単一のCloud Runインスタンスで100+のMCPサーバーを動的に起動・管理し、コストを最小化しながらMCPサポート数を最大化する。

### 1.2 現状と課題

```
【現状】個別Cloud Runインスタンス方式

┌─────────┐  ┌─────────┐  ┌─────────┐
│ deepl   │  │ brave   │  │ github  │  ... × 100
│ Cloud   │  │ Cloud   │  │ Cloud   │
│ Run     │  │ Run     │  │ Run     │
└─────────┘  └─────────┘  └─────────┘

問題:
- 100サービス = 100倍の管理コスト
- Artifact Registry に100イメージ
- コスト: $500-1000/月
```

```
【改善後】単一Universal Wrapper方式

┌─────────────────────────────────────────┐
│         Universal MCP Wrapper           │
│            (1 Cloud Run)                │
│                                         │
│  ┌───────┐ ┌───────┐ ┌───────┐         │
│  │deepl │ │brave  │ │github │ ...     │
│  │(proc)│ │(proc) │ │(proc) │         │
│  └───────┘ └───────┘ └───────┘         │
└─────────────────────────────────────────┘

改善:
- 1サービスで全MCPサーバー対応
- Artifact Registry に1イメージ
- コスト: $20-50/月
```

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **最小コスト** | Cloud Run 1インスタンスで運用 |
| **最大互換性** | 既存のstdio MCPサーバーをそのまま利用 |
| **動的スケール** | 必要なMCPサーバーのみプロセス起動 |
| **既存資産活用** | tumiki-mcp-http-adapterを拡張 |

---

## 2. アーキテクチャ

### 2.1 全体構成

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              全体構成図                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         tumiki-proxy                                │   │
│  │                                                                     │   │
│  │  POST /mcp/{mcpServerId}                                           │   │
│  │       │                                                             │   │
│  │       ▼                                                             │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    MCP Router                                │   │   │
│  │  │                                                              │   │   │
│  │  │  1. McpServerTemplateInstance から設定取得                   │   │   │
│  │  │  2. transportType で振り分け                                 │   │   │
│  │  │     - STREAMABLE_HTTPS (直接) → リモートMCPサーバー          │   │   │
│  │  │     - STDIO (Universal)     → Universal Wrapper              │   │   │
│  │  │                                                              │   │   │
│  │  └──────────────────────────────┬────────────────────────────────┘   │   │
│  │                                 │                                    │   │
│  └─────────────────────────────────┼────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ HTTP Proxy                             │
│                                    │ POST /mcp/{mcpServerName}              │
│                                    │ + Headers (API Keys)                   │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Universal MCP Wrapper                            │   │
│  │                       (Cloud Run)                                   │   │
│  │                                                                     │   │
│  │  ┌───────────────────────────────────────────────────────────────┐ │   │
│  │  │                   tumiki-mcp-http-adapter                     │ │   │
│  │  │                      (--dynamic mode)                         │ │   │
│  │  │                                                               │ │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │                  HTTP Server                            │ │ │   │
│  │  │  │  POST /mcp/{name} → ProcessPool.getOrCreate(name)      │ │ │   │
│  │  │  └─────────────────────────────────────────────────────────┘ │ │   │
│  │  │                           │                                   │ │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │                  Process Pool                           │ │ │   │
│  │  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │ │ │   │
│  │  │  │  │ deepl  │ │ brave  │ │ github │ │  ...   │           │ │ │   │
│  │  │  │  │ proc   │ │ proc   │ │ proc   │ │        │           │ │ │   │
│  │  │  │  └────────┘ └────────┘ └────────┘ └────────┘           │ │ │   │
│  │  │  └─────────────────────────────────────────────────────────┘ │ │   │
│  │  │                           │                                   │ │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │                  Catalog Client                         │ │ │   │
│  │  │  │  GET /api/catalog/{name} → McpCatalogEntry             │ │ │   │
│  │  │  └─────────────────────────────────────────────────────────┘ │ │   │
│  │  │                                                               │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ HTTP                                   │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       Catalog API                                   │   │
│  │                  (tumiki-proxy 内 or 別サービス)                    │   │
│  │                                                                     │   │
│  │  GET /api/catalog         → 全MCPサーバー一覧                       │   │
│  │  GET /api/catalog/{name}  → 特定MCPサーバー設定                     │   │
│  │                                                                     │   │
│  │  データソース: PostgreSQL (McpCatalogEntry テーブル)                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 リクエストフロー

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │    │ tumiki-  │    │Universal │    │ Catalog  │    │  stdio   │
│ (Claude) │    │  proxy   │    │ Wrapper  │    │   API    │    │   MCP    │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │               │
     │ POST /mcp/xxx │               │               │               │
     │ tools/call    │               │               │               │
     │ deepl:trans.. │               │               │               │
     │──────────────>│               │               │               │
     │               │               │               │               │
     │               │ ルーティング   │               │               │
     │               │ deepl → STDIO │               │               │
     │               │               │               │               │
     │               │ POST /mcp/deepl               │               │
     │               │ X-DeepL-API-Key: xxx          │               │
     │               │──────────────>│               │               │
     │               │               │               │               │
     │               │               │ プロセス検索   │               │
     │               │               │ deepl なし    │               │
     │               │               │               │               │
     │               │               │ GET /api/catalog/deepl        │
     │               │               │──────────────>│               │
     │               │               │<──────────────│               │
     │               │               │ { command: "npx",             │
     │               │               │   args: ["-y", "deepl-mcp"],  │
     │               │               │   headerEnv: [...] }          │
     │               │               │               │               │
     │               │               │ spawn process │               │
     │               │               │──────────────────────────────>│
     │               │               │               │               │
     │               │               │ stdio JSON-RPC               │
     │               │               │──────────────────────────────>│
     │               │               │<──────────────────────────────│
     │               │               │ result        │               │
     │               │               │               │               │
     │               │<──────────────│               │               │
     │<──────────────│               │               │               │
     │ response      │               │               │               │
     │               │               │               │               │
     ═══════════════════════════════════════════════════════════════════
     │               │               │               │               │
     │ 2回目以降     │               │               │               │
     │ POST /mcp/xxx │               │               │               │
     │──────────────>│               │               │               │
     │               │──────────────>│               │               │
     │               │               │               │               │
     │               │               │ プロセス検索   │               │
     │               │               │ deepl あり ✓  │               │
     │               │               │ (カタログ不要) │               │
     │               │               │               │               │
     │               │               │ stdio JSON-RPC (既存プロセス) │
     │               │               │──────────────────────────────>│
     │               │               │<──────────────────────────────│
     │               │<──────────────│               │               │
     │<──────────────│               │               │               │
     │               │               │               │               │
```

---

## 3. tumiki-mcp-http-adapter 拡張仕様

### 3.1 新規コマンドラインオプション

```bash
# 現行（単一サーバーモード）
tumiki-mcp-http \
  --stdio "deepl-mcp-server" \
  --header-env "X-DeepL-API-Key=DEEPL_API_KEY" \
  --port 8080

# 新規（動的モード）
tumiki-mcp-http \
  --dynamic \
  --catalog-url "https://tumiki.app/api/catalog" \
  --catalog-auth "Bearer ${CATALOG_API_TOKEN}" \
  --max-processes 20 \
  --idle-timeout 300 \
  --port 8080
```

### 3.2 オプション一覧

| オプション | 型 | デフォルト | 説明 |
|-----------|------|----------|------|
| `--dynamic` | bool | false | 動的モード有効化 |
| `--catalog-url` | string | - | カタログAPI URL (必須: dynamic時) |
| `--catalog-auth` | string | - | カタログAPI認証ヘッダー |
| `--catalog-cache-ttl` | int | 300 | カタログキャッシュTTL (秒) |
| `--max-processes` | int | 20 | 最大同時プロセス数 |
| `--idle-timeout` | int | 300 | アイドルタイムアウト (秒) |
| `--startup-timeout` | int | 30 | プロセス起動タイムアウト (秒) |
| `--request-timeout` | int | 60 | リクエストタイムアウト (秒) |

### 3.3 エンドポイント仕様

```
# 動的モード時のエンドポイント

POST /mcp/{serverName}
  - serverName: MCPサーバー名（カタログのキー）
  - Body: JSON-RPC 2.0 リクエスト
  - Headers: MCPサーバーに渡す環境変数（headerEnvマッピング）

GET /health
  - ヘルスチェック

GET /metrics
  - Prometheus形式のメトリクス

GET /status
  - プロセスプールの状態
```

### 3.4 リクエスト/レスポンス例

```bash
# リクエスト
curl -X POST http://localhost:8080/mcp/deepl \
  -H "Content-Type: application/json" \
  -H "X-DeepL-API-Key: xxx-xxx-xxx" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "translate",
      "arguments": {
        "text": "Hello",
        "target_lang": "JA"
      }
    }
  }'

# レスポンス
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "こんにちは"
      }
    ]
  }
}
```

---

## 4. プロセスプール設計

### 4.1 データ構造

```go
// プロセスプール
type ProcessPool struct {
    mu          sync.RWMutex
    processes   map[string]*ManagedProcess
    maxSize     int
    idleTimeout time.Duration
    catalog     CatalogClient
    metrics     *PoolMetrics
}

// 管理対象プロセス
type ManagedProcess struct {
    Name        string
    Process     *exec.Cmd
    Stdin       io.WriteCloser
    Stdout      io.ReadCloser
    Stderr      io.ReadCloser

    // 状態管理
    Status      ProcessStatus  // Starting, Ready, Busy, Idle, Stopping, Stopped
    StartedAt   time.Time
    LastUsedAt  time.Time
    RequestCount int64

    // リクエスト管理
    pendingReqs map[string]chan *JsonRpcResponse
    reqMu       sync.Mutex

    // 環境変数ハッシュ（同じ設定のプロセスを再利用）
    EnvHash     string
}

type ProcessStatus int

const (
    StatusStarting ProcessStatus = iota
    StatusReady
    StatusBusy
    StatusIdle
    StatusStopping
    StatusStopped
)
```

### 4.2 プロセスライフサイクル

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      プロセスライフサイクル                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐                                                               │
│  │  (none)  │                                                               │
│  └────┬─────┘                                                               │
│       │ getOrCreate()                                                       │
│       ▼                                                                     │
│  ┌──────────┐     startup timeout      ┌──────────┐                        │
│  │ Starting │ ─────────────────────────>│ Stopped  │                        │
│  └────┬─────┘                           └──────────┘                        │
│       │ initialize 完了                       ▲                             │
│       ▼                                       │                             │
│  ┌──────────┐     リクエスト受信        ┌──────────┐                        │
│  │  Ready   │ ─────────────────────────>│   Busy   │                        │
│  └────┬─────┘ <─────────────────────────└──────────┘                        │
│       │              レスポンス返却                                          │
│       │                                                                     │
│       │ idle timeout                                                        │
│       ▼                                                                     │
│  ┌──────────┐     graceful shutdown     ┌──────────┐                        │
│  │   Idle   │ ─────────────────────────>│ Stopping │                        │
│  └──────────┘                           └────┬─────┘                        │
│       ▲                                      │                              │
│       │ 新規リクエスト                        │ プロセス終了                 │
│       │                                      ▼                              │
│       │                                 ┌──────────┐                        │
│       └─────────────────────────────────│ Stopped  │                        │
│                再利用                    └──────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 LRU Eviction

```go
// プロセス数が上限に達した場合のEviction
func (p *ProcessPool) evictIfNeeded() error {
    p.mu.Lock()
    defer p.mu.Unlock()

    if len(p.processes) < p.maxSize {
        return nil
    }

    // Idle状態のプロセスをLastUsedAt順にソート
    var idleProcesses []*ManagedProcess
    for _, proc := range p.processes {
        if proc.Status == StatusIdle {
            idleProcesses = append(idleProcesses, proc)
        }
    }

    if len(idleProcesses) == 0 {
        return ErrNoEvictableProcess
    }

    // 最も古いIdleプロセスを停止
    sort.Slice(idleProcesses, func(i, j int) bool {
        return idleProcesses[i].LastUsedAt.Before(idleProcesses[j].LastUsedAt)
    })

    victim := idleProcesses[0]
    return p.stopProcess(victim)
}
```

### 4.4 環境変数ハッシュによるプロセス再利用

```go
// 同じMCPサーバー + 同じ環境変数 = 同じプロセスを再利用
func (p *ProcessPool) getProcessKey(name string, env map[string]string) string {
    // 環境変数をソートしてハッシュ化
    var keys []string
    for k := range env {
        keys = append(keys, k)
    }
    sort.Strings(keys)

    h := sha256.New()
    h.Write([]byte(name))
    for _, k := range keys {
        h.Write([]byte(k))
        h.Write([]byte(env[k]))
    }

    return hex.EncodeToString(h.Sum(nil))[:16]
}

// 例:
// deepl + {DEEPL_API_KEY: "key1"} → "deepl:a1b2c3d4"
// deepl + {DEEPL_API_KEY: "key2"} → "deepl:e5f6g7h8" (別プロセス)
```

---

## 5. カタログAPI設計

### 5.1 データモデル

```prisma
// packages/db/prisma/schema/mcpCatalog.prisma

/// MCPサーバーカタログエントリ
/// Universal Wrapperが参照する設定
model McpCatalogEntry {
  id             String   @id @default(cuid())

  /// サーバー名（一意識別子）
  /// 例: "deepl", "brave-search", "github"
  name           String   @unique

  /// 表示名
  displayName    String

  /// 説明
  description    String?

  /// タグ（検索・分類用）
  tags           String[]

  /// アイコンURL
  iconUrl        String?

  // ─────────────────────────────────────────
  // 実行設定
  // ─────────────────────────────────────────

  /// 実行コマンド
  /// 例: "npx", "node", "python"
  command        String

  /// コマンド引数
  /// 例: ["-y", "deepl-mcp-server"]
  args           String[]

  /// 作業ディレクトリ（オプション）
  workDir        String?

  // ─────────────────────────────────────────
  // 環境変数マッピング
  // ─────────────────────────────────────────

  /// HTTPヘッダー → 環境変数マッピング
  /// 例: [{"header": "X-DeepL-API-Key", "env": "DEEPL_API_KEY"}]
  headerEnvMappings Json

  /// HTTPヘッダー → コマンド引数マッピング
  /// 例: [{"header": "X-Path", "arg": "--path"}]
  headerArgMappings Json?

  /// デフォルト環境変数
  defaultEnv     Json?

  // ─────────────────────────────────────────
  // 状態管理
  // ─────────────────────────────────────────

  /// 有効/無効
  enabled        Boolean  @default(true)

  /// 動作確認済み
  verified       Boolean  @default(false)

  /// 最終動作確認日時
  lastVerifiedAt DateTime?

  /// エラー情報（最後に発生したエラー）
  lastError      String?

  // ─────────────────────────────────────────
  // メタデータ
  // ─────────────────────────────────────────

  /// npmパッケージ名（自動更新用）
  npmPackage     String?

  /// GitHubリポジトリURL
  githubUrl      String?

  /// ドキュメントURL
  docsUrl        String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### 5.2 APIエンドポイント

```typescript
// apps/mcp-proxy/src/features/catalog/route.ts

// カタログ一覧取得
// GET /api/catalog
// Response: McpCatalogEntry[]
router.get("/api/catalog", async (c) => {
  const entries = await prisma.mcpCatalogEntry.findMany({
    where: { enabled: true },
    orderBy: { name: "asc" },
  });
  return c.json(entries);
});

// 単一エントリ取得
// GET /api/catalog/:name
// Response: McpCatalogEntry | 404
router.get("/api/catalog/:name", async (c) => {
  const { name } = c.req.param();

  const entry = await prisma.mcpCatalogEntry.findUnique({
    where: { name, enabled: true },
  });

  if (!entry) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(entry);
});
```

### 5.3 カタログエントリ例

```json
[
  {
    "name": "deepl",
    "displayName": "DeepL Translator",
    "description": "DeepL翻訳APIを使用した翻訳MCPサーバー",
    "tags": ["translation", "language"],
    "command": "npx",
    "args": ["-y", "deepl-mcp-server"],
    "headerEnvMappings": [
      { "header": "X-DeepL-API-Key", "env": "DEEPL_API_KEY" }
    ],
    "enabled": true,
    "verified": true
  },
  {
    "name": "brave-search",
    "displayName": "Brave Search",
    "description": "Brave Search APIを使用したWeb検索MCPサーバー",
    "tags": ["search", "web"],
    "command": "npx",
    "args": ["-y", "@anthropics/mcp-server-brave-search"],
    "headerEnvMappings": [
      { "header": "X-Brave-API-Key", "env": "BRAVE_API_KEY" }
    ],
    "enabled": true,
    "verified": true
  },
  {
    "name": "github",
    "displayName": "GitHub",
    "description": "GitHub APIを使用したリポジトリ操作MCPサーバー",
    "tags": ["git", "development"],
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "headerEnvMappings": [
      { "header": "X-GitHub-Token", "env": "GITHUB_PERSONAL_ACCESS_TOKEN" }
    ],
    "enabled": true,
    "verified": true
  }
]
```

---

## 6. Cloud Run構成

### 6.1 Dockerfile

```dockerfile
# Universal MCP Wrapper Dockerfile

# ビルドステージ
FROM golang:1.22-alpine AS builder

WORKDIR /build

# 依存関係インストール
RUN apk add --no-cache git

# tumiki-mcp-http-adapter をクローン＆ビルド
ARG ADAPTER_VERSION=v2.0.0
RUN git clone --branch ${ADAPTER_VERSION} \
    https://github.com/rayven122/tumiki-mcp-http-adapter.git . && \
    go build -o tumiki-mcp-http ./cmd/tumiki-mcp-http

# ランタイムステージ
FROM node:22-alpine

WORKDIR /app

# 必要なツールをインストール
RUN apk add --no-cache \
    ca-certificates \
    python3 \
    py3-pip

# ビルダーからバイナリをコピー
COPY --from=builder /build/tumiki-mcp-http .
RUN chmod +x tumiki-mcp-http

# npm グローバルパッケージのキャッシュディレクトリ
ENV NPM_CONFIG_CACHE=/tmp/.npm

# ポート設定
EXPOSE 8080
ENV PORT=8080

# 環境変数（Cloud Runで上書き）
ENV CATALOG_URL=""
ENV CATALOG_AUTH=""
ENV MAX_PROCESSES=20
ENV IDLE_TIMEOUT=300

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:8080/health || exit 1

# 起動コマンド
CMD ["sh", "-c", "./tumiki-mcp-http \
    --dynamic \
    --catalog-url ${CATALOG_URL} \
    --catalog-auth \"${CATALOG_AUTH}\" \
    --max-processes ${MAX_PROCESSES} \
    --idle-timeout ${IDLE_TIMEOUT} \
    --port ${PORT}"]
```

### 6.2 Cloud Run設定

```yaml
# cloud-run-config.yaml

service:
  name: universal-mcp-wrapper

gcp:
  project_id: "mcp-server-455206"
  region: "asia-northeast1"

cloudrun:
  # リソース設定
  resources:
    cpu: "2"
    memory: "4Gi"      # 複数プロセスを起動するため多め

  # スケーリング
  scaling:
    min_instances: 1   # 常時1インスタンス起動（コールドスタート回避）
    max_instances: 10  # 高負荷時にスケールアウト
    concurrency: 100   # 1インスタンスあたりの同時リクエスト数

  # タイムアウト
  timeout: 300         # 5分（MCPサーバー起動時間を考慮）

  # CPU常時割り当て
  cpu_throttling: false

  # Ingress
  ingress: "internal-and-cloud-load-balancing"

environment:
  CATALOG_URL: "https://tumiki.app/api/catalog"
  MAX_PROCESSES: "20"
  IDLE_TIMEOUT: "300"

secrets:
  - name: CATALOG_AUTH
    secret: "universal-wrapper-catalog-auth"
    version: "latest"

iam:
  allow_unauthenticated: false
  invokers:
    - "serviceAccount:tumiki-proxy@mcp-server-455206.iam.gserviceaccount.com"
```

### 6.3 コスト試算

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          コスト試算                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  【構成】                                                                    │
│  - CPU: 2 vCPU                                                              │
│  - Memory: 4GB                                                              │
│  - min_instances: 1                                                         │
│  - Region: asia-northeast1                                                  │
│                                                                             │
│  【月額コスト試算（低〜中利用）】                                            │
│                                                                             │
│  基本料金（min_instances: 1、常時起動）:                                    │
│  - CPU: 2 vCPU × $0.0864/vCPU-hour × 730h = $126.14                        │
│  - Memory: 4GB × $0.0090/GB-hour × 730h = $26.28                           │
│  - 小計: $152.42/月                                                         │
│                                                                             │
│  リクエスト料金:                                                            │
│  - 100万リクエスト × $0.40/100万 = $0.40                                   │
│                                                                             │
│  ネットワーク（egress）:                                                    │
│  - 10GB × $0.12/GB = $1.20                                                 │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│  合計: 約 $155/月（約23,000円）                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  【比較: 個別Cloud Run 100サービスの場合】                                  │
│  - min_instances: 0 でも、リクエスト時のコールドスタートコスト              │
│  - 100サービス × $5-10/月 = $500-1000/月                                   │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│  削減効果: 70-85% コスト削減                                                │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. tumiki-proxy統合

### 7.1 ルーティング変更

```typescript
// apps/mcp-proxy/src/features/mcp/mcpRequestHandler.ts

const routeMcpRequest = async (
  mcpServerId: string,
  request: JsonRpcRequest,
  headers: Headers
): Promise<JsonRpcResponse> => {
  // MCPサーバー設定を取得
  const config = await getServerConfig(mcpServerId);

  switch (config.transportType) {
    case "STREAMABLE_HTTPS":
      // 直接リモートサーバーに転送
      return forwardToRemoteServer(config.url, request, headers);

    case "STDIO":
      // Universal Wrapper経由
      return forwardToUniversalWrapper(config.catalogName, request, headers);

    case "DESKTOP":
      // Tumiki for Desktop経由（将来）
      return forwardToDesktop(config, request, headers);

    default:
      throw new Error(`Unknown transport type: ${config.transportType}`);
  }
};

const forwardToUniversalWrapper = async (
  catalogName: string,
  request: JsonRpcRequest,
  headers: Headers
): Promise<JsonRpcResponse> => {
  const wrapperUrl = process.env.UNIVERSAL_WRAPPER_URL;

  // ヘッダーをそのまま転送（API Keys等）
  const response = await fetch(`${wrapperUrl}/mcp/${catalogName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...extractApiKeyHeaders(headers),
    },
    body: JSON.stringify(request),
  });

  return response.json();
};
```

### 7.2 DBスキーマ変更

```prisma
// McpServerTemplate に catalogName を追加

model McpServerTemplate {
  // ... 既存フィールド

  /// Universal Wrapper用のカタログ名
  /// transportType = STDIO の場合に使用
  catalogName    String?

  // transportType の選択肢を拡張
  // STDIO: Universal Wrapper経由
  // STREAMABLE_HTTPS: 直接接続
  // DESKTOP: Tumiki for Desktop経由（将来）
}
```

---

## 8. エラーハンドリング

### 8.1 エラー分類

```go
// エラーコード体系

const (
    // カタログエラー (1xxx)
    ErrCatalogNotFound     = 1001  // カタログにエントリなし
    ErrCatalogFetchFailed  = 1002  // カタログAPI通信失敗

    // プロセスエラー (2xxx)
    ErrProcessStartFailed  = 2001  // プロセス起動失敗
    ErrProcessTimeout      = 2002  // プロセス起動タイムアウト
    ErrProcessCrashed      = 2003  // プロセスクラッシュ
    ErrProcessPoolFull     = 2004  // プロセスプール上限

    // 通信エラー (3xxx)
    ErrStdioWriteFailed    = 3001  // stdin書き込み失敗
    ErrStdioReadFailed     = 3002  // stdout読み込み失敗
    ErrRequestTimeout      = 3003  // リクエストタイムアウト
    ErrInvalidResponse     = 3004  // 不正なレスポンス

    // MCPエラー (4xxx) - MCPサーバーからのエラーをそのまま返す
    ErrMcpError            = 4000
)
```

### 8.2 リトライ戦略

```go
type RetryConfig struct {
    MaxRetries     int
    InitialBackoff time.Duration
    MaxBackoff     time.Duration
    BackoffFactor  float64
}

var defaultRetryConfig = RetryConfig{
    MaxRetries:     3,
    InitialBackoff: 100 * time.Millisecond,
    MaxBackoff:     5 * time.Second,
    BackoffFactor:  2.0,
}

// リトライ対象のエラー
func isRetryable(err error) bool {
    switch {
    case errors.Is(err, ErrProcessCrashed):
        return true  // プロセス再起動してリトライ
    case errors.Is(err, ErrStdioReadFailed):
        return true  // 一時的な読み込みエラー
    case errors.Is(err, ErrRequestTimeout):
        return false // タイムアウトはリトライしない
    default:
        return false
    }
}
```

### 8.3 エラーレスポンス例

```json
// カタログエントリが見つからない場合
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": 1001,
    "message": "MCP server 'unknown-server' not found in catalog",
    "data": {
      "serverName": "unknown-server"
    }
  }
}

// プロセス起動タイムアウト
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": 2002,
    "message": "Failed to start MCP server 'heavy-server': startup timeout (30s)",
    "data": {
      "serverName": "heavy-server",
      "timeout": 30
    }
  }
}

// MCPサーバーからのエラー（そのまま転送）
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params: missing required field 'target_lang'",
    "data": {
      "field": "target_lang"
    }
  }
}
```

---

## 9. 監視・ログ

### 9.1 メトリクス

```go
// Prometheus メトリクス

var (
    // プロセスプール
    processPoolSize = prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "mcp_process_pool_size",
        Help: "Current number of processes in the pool",
    })

    processPoolMax = prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "mcp_process_pool_max",
        Help: "Maximum number of processes allowed",
    })

    // プロセス状態
    processStatus = prometheus.NewGaugeVec(prometheus.GaugeOpts{
        Name: "mcp_process_status",
        Help: "Process status by server name",
    }, []string{"server", "status"})

    // リクエスト
    requestTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
        Name: "mcp_request_total",
        Help: "Total number of MCP requests",
    }, []string{"server", "method", "status"})

    requestDuration = prometheus.NewHistogramVec(prometheus.HistogramOpts{
        Name:    "mcp_request_duration_seconds",
        Help:    "Request duration in seconds",
        Buckets: []float64{0.1, 0.5, 1, 2, 5, 10, 30, 60},
    }, []string{"server", "method"})

    // プロセス起動
    processStartTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
        Name: "mcp_process_start_total",
        Help: "Total number of process starts",
    }, []string{"server", "status"})

    processStartDuration = prometheus.NewHistogramVec(prometheus.HistogramOpts{
        Name:    "mcp_process_start_duration_seconds",
        Help:    "Process start duration in seconds",
        Buckets: []float64{1, 2, 5, 10, 20, 30},
    }, []string{"server"})
)
```

### 9.2 ログフォーマット

```json
// 構造化ログ（JSON）

// リクエスト開始
{
  "level": "info",
  "time": "2026-03-05T10:00:00Z",
  "msg": "MCP request started",
  "server": "deepl",
  "method": "tools/call",
  "requestId": "req-12345",
  "processStatus": "ready"
}

// プロセス起動
{
  "level": "info",
  "time": "2026-03-05T10:00:01Z",
  "msg": "Starting MCP process",
  "server": "brave-search",
  "command": "npx",
  "args": ["-y", "@anthropics/mcp-server-brave-search"]
}

// リクエスト完了
{
  "level": "info",
  "time": "2026-03-05T10:00:02Z",
  "msg": "MCP request completed",
  "server": "deepl",
  "method": "tools/call",
  "requestId": "req-12345",
  "duration": 1.234,
  "status": "success"
}

// エラー
{
  "level": "error",
  "time": "2026-03-05T10:00:03Z",
  "msg": "MCP request failed",
  "server": "unknown",
  "method": "tools/call",
  "requestId": "req-12346",
  "error": "catalog entry not found",
  "errorCode": 1001
}
```

### 9.3 アラート設定

```yaml
# Cloud Monitoring アラートポリシー

alerts:
  - name: "High Error Rate"
    condition: |
      rate(mcp_request_total{status="error"}[5m])
      / rate(mcp_request_total[5m]) > 0.1
    duration: 5m
    severity: warning

  - name: "Process Pool Full"
    condition: |
      mcp_process_pool_size >= mcp_process_pool_max
    duration: 10m
    severity: warning

  - name: "Slow Requests"
    condition: |
      histogram_quantile(0.95, rate(mcp_request_duration_seconds_bucket[5m])) > 30
    duration: 5m
    severity: warning

  - name: "Process Start Failures"
    condition: |
      rate(mcp_process_start_total{status="failed"}[5m]) > 0.1
    duration: 5m
    severity: critical
```

---

## 10. 実装計画

### 10.1 フェーズ分け

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          実装フェーズ                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  【Phase 1】tumiki-mcp-http-adapter 拡張（2週間）                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Week 1:                                                            │   │
│  │  □ --dynamic モード基本実装                                         │   │
│  │  □ ProcessPool 基本実装（起動・停止）                               │   │
│  │  □ カタログクライアント実装                                         │   │
│  │                                                                     │   │
│  │  Week 2:                                                            │   │
│  │  □ LRU eviction実装                                                 │   │
│  │  □ アイドルタイムアウト実装                                         │   │
│  │  □ エラーハンドリング                                               │   │
│  │  □ ユニットテスト                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  【Phase 2】カタログAPI + DB（1週間）                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  □ McpCatalogEntry Prismaスキーマ追加                               │   │
│  │  □ カタログAPIエンドポイント実装                                    │   │
│  │  □ 初期カタログデータ投入（20エントリ）                             │   │
│  │  □ tumiki-proxy連携テスト                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  【Phase 3】Cloud Runデプロイ + 統合（1週間）                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  □ Dockerfile作成                                                   │   │
│  │  □ Cloud Run設定                                                    │   │
│  │  □ tumiki-proxyルーティング統合                                     │   │
│  │  □ E2Eテスト                                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  【Phase 4】大量MCPサーバー登録（2週間）                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Week 1:                                                            │   │
│  │  □ MCPサーバー一覧収集（npm, GitHub）                               │   │
│  │  □ 分類・優先順位付け                                               │   │
│  │  □ 50エントリ追加・動作確認                                         │   │
│  │                                                                     │   │
│  │  Week 2:                                                            │   │
│  │  □ 残り50エントリ追加・動作確認                                     │   │
│  │  □ Manager UIでカタログ表示                                         │   │
│  │  □ ドキュメント作成                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────   │
│  合計: 6週間で 100+ MCPサーバー対応                                         │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 マイルストーン

| マイルストーン | 期限 | 成果物 |
|--------------|------|--------|
| M1: 動的モード完成 | Week 2 | tumiki-mcp-http-adapter v2.0.0 |
| M2: カタログAPI完成 | Week 3 | カタログAPI + 20エントリ |
| M3: Cloud Run稼働 | Week 4 | Universal Wrapper本番稼働 |
| M4: 100 MCPサーバー | Week 6 | 100+ カタログエントリ |

### 10.3 リスクと対策

| リスク | 影響 | 対策 |
|-------|------|------|
| npm パッケージの起動時間が長い | レスポンス遅延 | プリウォーム、min_instances: 1 |
| メモリ不足 | プロセスクラッシュ | max_processes制限、メモリ監視 |
| 特定MCPサーバーが動作しない | カタログ品質低下 | verified フラグ、自動テスト |
| カタログAPIダウン | 全MCPサーバー利用不可 | キャッシュ、フォールバック |

---

## 付録A: カタログエントリ追加手順

### A.1 新規MCPサーバー追加

```sql
-- 例: Notion MCPサーバーを追加

INSERT INTO "McpCatalogEntry" (
  "id",
  "name",
  "displayName",
  "description",
  "tags",
  "command",
  "args",
  "headerEnvMappings",
  "enabled",
  "verified",
  "npmPackage",
  "createdAt",
  "updatedAt"
) VALUES (
  'clxxx',
  'notion',
  'Notion',
  'Notion API integration',
  ARRAY['productivity', 'notes'],
  'npx',
  ARRAY['-y', '@anthropics/mcp-server-notion'],
  '[{"header": "X-Notion-Token", "env": "NOTION_API_KEY"}]',
  true,
  false,
  '@anthropics/mcp-server-notion',
  NOW(),
  NOW()
);
```

### A.2 動作確認

```bash
# ローカルで動作確認
curl -X POST http://localhost:8080/mcp/notion \
  -H "Content-Type: application/json" \
  -H "X-Notion-Token: secret_xxx" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'

# 成功したらverifiedをtrueに
UPDATE "McpCatalogEntry"
SET "verified" = true, "lastVerifiedAt" = NOW()
WHERE "name" = 'notion';
```

---

## 付録B: トラブルシューティング

| 症状 | 原因 | 解決策 |
|------|------|--------|
| 404 Not Found | カタログにエントリなし | カタログDBを確認 |
| Startup timeout | npm install が遅い | startup-timeout延長、プリインストール |
| Process crashed | MCPサーバーのバグ | ログ確認、該当エントリを無効化 |
| Memory exceeded | プロセス数過多 | max_processes削減、メモリ増加 |
| Slow response | コールドスタート | min_instances: 1 |
