# MCP Proxy - 設計ドキュメント

## 概要

複数のリモートMCPサーバーを統合し、単一のエンドポイントで公開するプロキシサーバー。
Google Cloud Run対応のステートレス設計で、水平スケール可能な軽量アーキテクチャを採用。

## アーキテクチャ設計

### システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude / LLM Client                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/JSON-RPC 2.0
                            │ + API Key Auth
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Proxy (Hono)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Auth         │  │ ToolRouter   │  │ McpLogger    │     │
│  │ Middleware   │→ │ (Namespace)  │→ │ (Logging)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                            │                                  │
│                    ┌───────┴───────┐                        │
│                    │               │                        │
│                    ▼               ▼                        │
│         ┌──────────────────────────────────┐              │
│         │   RemoteMcpPool                   │              │
│         │   (Connection Pool)               │              │
│         └──────────────────────────────────┘              │
└─────────────────────┬───────────────┬───────────────────────┘
                      │               │
        ┌─────────────┴───┐   ┌──────┴──────────┐
        │                 │   │                 │
        ▼                 ▼   ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Remote MCP   │  │ Remote MCP   │  │ Remote MCP   │
│ Server 1     │  │ Server 2     │  │ Server N     │
│ (GitHub)     │  │ (Slack)      │  │ (Custom)     │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┴─────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │  Cloud Logging   │
                │  → BigQuery      │
                └──────────────────┘
```

### コア設計原則

1. **ステートレス**: インスタンスごとに独立した状態管理、Cloud Run水平スケール対応
2. **最小依存**: Hono + MCP SDK + Zodのみ、軽量で高速な起動
3. **名前空間分離**: `namespace.toolName` 形式で複数サーバーのツールを識別
4. **構造化ログ**: Cloud Loggingネイティブ対応、自動BigQueryエクスポート
5. **セキュアな認証**: APIキーベース認証、データベース検証、LRUキャッシング

## 技術スタック

### フレームワーク・ライブラリ

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Hono | ^4.7.4 | 軽量Webフレームワーク（50KB） |
| @modelcontextprotocol/sdk | ^1.10.1 | MCPプロトコル実装 |
| Zod | catalog | スキーマ検証 |
| @tumiki/db | workspace:* | Prisma DBクライアント |
| TypeScript | catalog | 型安全性 |

### インフラストラクチャ

- **実行環境**: Google Cloud Run (Node.js 22-alpine)
- **ビルドシステム**: Google Cloud Build
- **ログ基盤**: Cloud Logging → BigQuery自動エクスポート
- **データベース**: PostgreSQL (API Key管理)
- **コンテナ**: Docker Multi-stage Build

## コンポーネント設計

### 1. HTTPサーバー (index.ts)

**責務**: Honoアプリケーションのセットアップとライフサイクル管理

```typescript
// アーキテクチャパターン
- Dependency Injection: サービスクラスを生成して注入
- Graceful Shutdown: SIGTERMハンドリングで接続をクリーンアップ
- Middleware Chain: CORS → Logging → Auth → Route Handler
```

**エンドポイント**:
- `GET /health` - ヘルスチェック（基本・詳細）
- `POST /mcp` - MCPプロトコルハンドラー（認証必須）

### 2. RemoteMcpPool (remoteMcpPool.ts)

**責務**: リモートMCPサーバーへの接続プール管理

**主要機能**:
```typescript
class RemoteMcpPool {
  // 接続管理
  async get(namespace: string): Promise<Client>
  private async create(namespace: string): Promise<Client>

  // ヘルスチェック
  async healthCheck(namespace: string): Promise<boolean>

  // クリーンアップ
  private cleanup(): void  // アイドル接続削除
  async closeAll(): Promise<void>

  // ウォームアップ
  private async warmup(): Promise<void>  // 起動時接続作成

  // 統計情報
  getStats(): PoolStats
}
```

**設計パターン**:
- **Object Pool Pattern**: 接続の再利用で性能向上
- **Health Check**: 定期的な接続状態監視
- **Idle Timeout**: 未使用接続の自動削除（デフォルト5分）
- **Warmup Strategy**: 起動時に全サーバーへ事前接続

**環境変数**:
```typescript
MAX_IDLE_TIME=300000        // アイドルタイムアウト（ms）
CONNECTION_TIMEOUT=30000    // 接続タイムアウト（ms）
HEALTH_CHECK_INTERVAL=60000 // ヘルスチェック間隔（ms）
```

### 3. ToolRouter (toolRouter.ts)

**責務**: ツールルーティングとキャッシング

**主要機能**:
```typescript
class ToolRouter {
  // ツール取得
  async getAllTools(): Promise<NamespacedTool[]>
  async getToolsByNamespace(namespace: string): Promise<Tool[]>

  // ツール実行
  async callTool(toolName: string, args: Record<string, unknown>): Promise<ToolCallResult>

  // 検索
  async searchTools(query: string): Promise<NamespacedTool[]>

  // キャッシュ管理
  clearCache(): void
}
```

**名前空間ルーティング**:
```typescript
// 変換例
Original: { name: "create_issue", ... }  // GitHubサーバー
Namespaced: {
  name: "github.create_issue",
  namespace: "github",
  originalName: "create_issue",
  ...
}
```

**キャッシング戦略**:
- **TTLベース**: デフォルト5分（`CACHE_TTL=300`）
- **全ツールリスト**: 集約結果をキャッシュ
- **無効化**: `clearCache()` で手動クリア可能

### 4. McpLogger (mcpLogger.ts)

**責務**: 構造化ログ出力とCloud Logging連携

**主要機能**:
```typescript
class McpLogger {
  // MCPリクエストログ
  async logRequest(
    namespace: string,
    request: JsonRpcRequest,
    response: JsonRpcResponse | null,
    duration: number,
    organizationId?: string,
    mcpServerInstanceId?: string,
    error?: string,
  ): Promise<void>

  // エラーログ
  logError(namespace: string, method: string, error: Error, ...): void

  // 情報ログ
  logInfo(message: string, metadata?: Record<string, unknown>): void
  logWarn(message: string, metadata?: Record<string, unknown>): void
}
```

**ログフォーマット**:
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "namespace": "github",
  "method": "tools/call",
  "duration": 150,
  "organizationId": "org_123",
  "mcpServerInstanceId": "inst_456",
  "request": { "jsonrpc": "2.0", "method": "tools/call", ... },
  "response": { "jsonrpc": "2.0", "result": { ... } }
}
```

**環境別動作**:
- **Production**: JSON形式、Cloud Logging自動認識
- **Development**: 読みやすい形式、絵文字付き（✅/❌）

### 5. Authentication Middleware (auth.ts)

**責務**: APIキー認証とキャッシング

**認証フロー**:
```
1. APIキー抽出 (X-API-Key または Authorization: Bearer)
2. キャッシュチェック (5分TTL)
3. データベース検証 (McpApiKey テーブル)
4. 認証情報をコンテキストに設定
5. 最終使用日時を非同期更新
```

**データモデル**:
```typescript
// Prisma Schema: apiKey.prisma
model McpApiKey {
  id                      String
  apiKey                  String  @unique  @encrypted
  apiKeyHash              String? @unique
  isActive                Boolean
  lastUsedAt              DateTime?
  userMcpServerInstanceId String
  userMcpServerInstance   UserMcpServerInstance @relation(...)
  // ...
}
```

**認証情報構造**:
```typescript
type AuthInfo = {
  organizationId: string;          // 組織ID
  mcpServerInstanceId: string;     // MCPサーバーインスタンスID
  apiKeyId: string;                // APIキーID
  apiKey: string;                  // APIキー本体
}
```

## データフロー

### 1. ツールリスト取得フロー (`tools/list`)

```
Client → POST /mcp {"method": "tools/list"}
         │
         ├─→ authMiddleware: APIキー検証
         │
         ├─→ ToolRouter.getAllTools()
         │   │
         │   ├─→ キャッシュ有効？ → Yes: キャッシュを返す
         │   │                    → No: 続行
         │   │
         │   ├─→ RemoteMcpPool.get("github")
         │   │   └─→ Client.listTools() → [tool1, tool2]
         │   │
         │   ├─→ RemoteMcpPool.get("slack")
         │   │   └─→ Client.listTools() → [tool3, tool4]
         │   │
         │   └─→ 名前空間付与 & 集約
         │       ["github.tool1", "github.tool2", "slack.tool3", "slack.tool4"]
         │
         └─→ McpLogger.logRequest()

Client ← {"jsonrpc": "2.0", "result": {"tools": [...]}}
```

### 2. ツール実行フロー (`tools/call`)

```
Client → POST /mcp {
           "method": "tools/call",
           "params": {
             "name": "github.create_issue",
             "arguments": {"title": "Bug", "body": "..."}
           }
         }
         │
         ├─→ authMiddleware: APIキー検証
         │
         ├─→ ToolRouter.callTool("github.create_issue", args)
         │   │
         │   ├─→ parseToolName() → {namespace: "github", originalName: "create_issue"}
         │   │
         │   ├─→ RemoteMcpPool.get("github")
         │   │
         │   └─→ Client.callTool({name: "create_issue", arguments: args})
         │       └─→ GitHub MCP Server
         │           └─→ GitHub API
         │
         └─→ McpLogger.logRequest()

Client ← {"jsonrpc": "2.0", "result": {"content": [...]}}
```

### 3. ヘルスチェックフロー (`GET /health/detailed`)

```
Client → GET /health/detailed
         │
         ├─→ RemoteMcpPool.getStats()
         │   └─→ 接続プール統計情報
         │
         └─→ RemoteMcpPool.healthCheck() (各namespace)
             └─→ Client.ping() → OK/NG

Client ← {
           "status": "ok",
           "timestamp": "...",
           "pool": {
             "totalConnections": 3,
             "healthyConnections": 3,
             "connections": [...]
           },
           "servers": {
             "github": true,
             "slack": true,
             "custom": false
           }
         }
```

## セキュリティ設計

### 1. 認証・認可

**APIキー認証**:
- ✅ データベースベース検証（Prisma経由）
- ✅ LRUキャッシング（5分TTL）で性能最適化
- ✅ 暗号化保存（Prisma `@encrypted` フィールド）
- ✅ 最終使用日時トラッキング

**認証ヘッダー**:
```http
# 方式1: X-API-Key
X-API-Key: tumiki_live_abc123...

# 方式2: Bearer Token
Authorization: Bearer tumiki_live_abc123...
```

### 2. エラーハンドリング

**JSON-RPC 2.0 エラーコード**:
```typescript
-32700  Parse error          // JSONパースエラー
-32600  Invalid Request      // 不正なリクエスト（認証エラー含む）
-32601  Method not found     // 未対応メソッド
-32602  Invalid params       // パラメータ不正
-32603  Internal error       // 内部エラー
```

**エラーレスポンス例**:
```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32600,
    "message": "Invalid or inactive API key",
    "data": {
      "hint": "Provide API key via X-API-Key header"
    }
  }
}
```

### 3. Rate Limiting

**Phase 1（現在）**: なし（Cloud Runのデフォルト制限に依存）
**Phase 2（将来）**:
- APIキーごとのレート制限
- 組織ごとの使用量追跡
- Redisベースのレート制限実装

## デプロイメント設計

### 1. Docker構成

**Multi-stage Build**:
```dockerfile
# Stage 1: Builder (ビルド環境)
FROM node:22-alpine AS builder
- pnpm インストール
- 依存関係インストール
- TypeScript ビルド

# Stage 2: Runner (実行環境)
FROM node:22-alpine AS runner
- 最小限のランタイムのみ
- ビルド済みファイルのみコピー
- 非rootユーザー実行（hono:1001）
```

**イメージサイズ最適化**:
- Alpine Linux使用（最小限のOS）
- Multi-stage buildで開発依存排除
- .dockerignoreで不要ファイル除外

### 2. Cloud Run設定

**cloudbuild.yaml**:
```yaml
steps:
  - name: docker build → gcr.io/${PROJECT_ID}/mcp-proxy:${COMMIT_SHA}
  - name: gcloud run deploy
      --region asia-northeast1
      --platform managed
      --memory 512Mi
      --min-instances 1      # コールドスタート削減
      --max-instances 10     # 最大スケール
      --timeout 300          # 5分タイムアウト
```

**スケーリング戦略**:
- **Min instances: 1** - レイテンシ重視、常時1インスタンス維持
- **Max instances: 10** - コスト制御、最大10インスタンス
- **CPU: 1** - 軽量処理に最適
- **Memory: 512Mi** - 接続プール + キャッシュに十分

### 3. 環境変数

**必須**:
```bash
PORT=8080                           # Cloud Runが自動設定
NODE_ENV=production
DATABASE_URL=postgresql://...       # Prisma接続文字列
LOG_LEVEL=info
```

**オプション**:
```bash
# 接続プール設定
MAX_IDLE_TIME=300000               # 5分
CONNECTION_TIMEOUT=30000           # 30秒
HEALTH_CHECK_INTERVAL=60000        # 1分

# キャッシュ設定
CACHE_TTL=300                      # 5分
CACHE_ENABLED=true

# Remote MCPサーバー認証
GITHUB_MCP_TOKEN=ghp_...
SLACK_MCP_TOKEN=xoxb-...
```

### 4. Cloud Logging設定

**自動収集**:
- stdout/stderr → Cloud Logging自動転送
- JSON形式 → 構造化ログとして認識
- `severity` フィールド → ログレベル自動判定

**BigQuery自動エクスポート**:
```sql
-- Cloud Loggingから自動エクスポート
-- データセット: mcp_proxy_logs
-- テーブル: cloudaudit_googleapis_com_activity_YYYYMMDD

SELECT
  timestamp,
  jsonPayload.namespace,
  jsonPayload.method,
  jsonPayload.duration,
  jsonPayload.organizationId
FROM `project.mcp_proxy_logs.cloudaudit_googleapis_com_activity_*`
WHERE DATE(timestamp) = CURRENT_DATE()
  AND jsonPayload.namespace = 'github'
ORDER BY timestamp DESC
```

## パフォーマンス設計

### 1. 応答時間目標

| シナリオ | 目標レイテンシ | 主な要因 |
|---------|---------------|---------|
| tools/list（キャッシュHIT） | < 50ms | メモリアクセスのみ |
| tools/list（キャッシュMISS） | < 500ms | Remote MCP通信 × N |
| tools/call | < 2s | Remote MCP + 外部API |
| 認証（キャッシュHIT） | < 5ms | メモリアクセス |
| 認証（キャッシュMISS） | < 100ms | DB検証 |

### 2. 最適化戦略

**キャッシング**:
```typescript
// ツールリストキャッシュ（5分TTL）
- 集約結果をメモリキャッシュ
- 名前空間ごとの取得も可能
- 手動クリア可能

// 認証キャッシュ（5分TTL）
- APIキー検証結果をLRUキャッシュ
- DB負荷を95%削減
```

**接続プール**:
```typescript
// ウォームアップ戦略
- 起動時に全Remote MCPサーバーへ事前接続
- コールドスタート時のレイテンシ削減

// アイドル管理
- 5分間未使用の接続を自動削除
- メモリ使用量の最適化
```

**並列処理**:
```typescript
// ツールリスト集約
await Promise.all(
  servers.map(server => remoteMcpPool.get(server.namespace))
)
// N個のサーバーに並列リクエスト
```

## 運用設計

### 1. ヘルスチェック

**基本ヘルスチェック** (`GET /health`):
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**詳細ヘルスチェック** (`GET /health/detailed`):
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "pool": {
    "totalConnections": 3,
    "healthyConnections": 2,
    "connections": [
      {
        "namespace": "github",
        "lastUsed": 1705315800000,
        "isHealthy": true,
        "idleTime": 5000
      },
      {
        "namespace": "slack",
        "lastUsed": 1705315750000,
        "isHealthy": true,
        "idleTime": 55000
      },
      {
        "namespace": "custom",
        "lastUsed": 1705315200000,
        "isHealthy": false,
        "idleTime": 605000
      }
    ]
  },
  "servers": {
    "github": true,
    "slack": true,
    "custom": false
  }
}
```

### 2. モニタリング指標

**Cloud Run Metrics**:
- Request count（リクエスト数）
- Request latencies（レイテンシ分布）
- Container instance count（インスタンス数）
- Container CPU/Memory utilization
- Billable container time

**カスタムメトリクス（ログベース）**:
```sql
-- 名前空間別リクエスト数
SELECT
  jsonPayload.namespace,
  COUNT(*) as request_count
FROM `project.mcp_proxy_logs.*`
WHERE DATE(timestamp) = CURRENT_DATE()
GROUP BY jsonPayload.namespace

-- 平均応答時間
SELECT
  jsonPayload.namespace,
  AVG(jsonPayload.duration) as avg_duration_ms
FROM `project.mcp_proxy_logs.*`
WHERE DATE(timestamp) = CURRENT_DATE()
GROUP BY jsonPayload.namespace

-- エラー率
SELECT
  jsonPayload.namespace,
  COUNTIF(jsonPayload.error IS NOT NULL) / COUNT(*) * 100 as error_rate
FROM `project.mcp_proxy_logs.*`
WHERE DATE(timestamp) = CURRENT_DATE()
GROUP BY jsonPayload.namespace
```

### 3. アラート設定

**推奨アラート**:
```yaml
- name: High Error Rate
  condition: error_rate > 5%
  duration: 5min

- name: High Latency
  condition: p95_latency > 3s
  duration: 5min

- name: Connection Pool Exhaustion
  condition: healthy_connections / total_connections < 0.5
  duration: 2min

- name: Container CPU High
  condition: cpu_utilization > 80%
  duration: 5min
```

## テスト戦略

### 1. 単体テスト

**対象**: 各サービスクラスの個別ロジック

```typescript
// RemoteMcpPool
- 接続作成・取得
- ヘルスチェック
- クリーンアップロジック
- 統計情報取得

// ToolRouter
- ツール名パース
- 名前空間付与
- キャッシング
- ツール検索

// McpLogger
- ログフォーマット
- 環境別出力
```

**フレームワーク**: Vitest
**カバレッジ目標**: 100%（実装ロジック）

### 2. 統合テスト

**対象**: エンドツーエンドフロー

```typescript
// 認証フロー
- 有効なAPIキーで認証成功
- 無効なAPIキーで認証失敗
- キャッシュの動作確認

// MCPプロトコル
- tools/list リクエスト
- tools/call リクエスト
- initialize リクエスト
- ping リクエスト

// エラーハンドリング
- 不正なJSON-RPCリクエスト
- 存在しないツール呼び出し
- Remote MCPサーバーエラー
```

### 3. 負荷テスト

**シナリオ**:
```yaml
Scenario 1: 通常負荷
  - 100 req/sec
  - tools/list (70%) + tools/call (30%)
  - 期待: p95 < 500ms

Scenario 2: スパイク負荷
  - 0→500→0 req/sec (1分間隔)
  - Cloud Run auto-scaling検証
  - 期待: エラー率 < 1%

Scenario 3: 長時間負荷
  - 50 req/sec × 1時間
  - メモリリーク検証
  - 期待: メモリ使用量安定
```

## 拡張性設計

### Phase 1（現在実装）: 基本機能

- ✅ 複数Remote MCPサーバー統合
- ✅ 名前空間ベースルーティング
- ✅ APIキー認証
- ✅ Cloud Logging連携
- ✅ 接続プール管理
- ✅ キャッシング

### Phase 2（将来拡張）: 高度な機能

**認証・認可の強化**:
```typescript
- OAuth 2.0 / JWT認証
- ロールベースアクセス制御（RBAC）
- 組織ごとの権限管理
```

**パフォーマンス向上**:
```typescript
- Redisベースの分散キャッシュ
- レート制限（組織/APIキーごと）
- リクエストバッチング
```

**可観測性向上**:
```typescript
- OpenTelemetry統合
- 分散トレーシング
- カスタムメトリクス（Prometheus形式）
```

**高可用性**:
```typescript
- Circuit Breaker（障害時の自動切断）
- Retry with Exponential Backoff
- Fallback戦略（代替サーバー）
```

## 設定ガイド

### Remote MCPサーバー追加

`src/config/mcpServers.ts`:
```typescript
export const REMOTE_MCP_SERVERS: RemoteMcpServerConfig[] = [
  {
    namespace: "github",              // 一意の名前空間
    name: "GitHub MCP Server",        // 表示名
    url: "https://mcp.example.com",   // エンドポイント
    authType: "bearer",               // none | bearer | api_key
    authToken: process.env.GITHUB_TOKEN,
    headers: {                        // 追加ヘッダー
      "X-Custom-Header": "value",
    },
    enabled: true,                    // 有効/無効
  },
  // 新規サーバーを追加
];
```

### 環境変数設定

`.env`:
```bash
# アプリケーション
PORT=8080
NODE_ENV=production
LOG_LEVEL=info

# データベース
DATABASE_URL=postgresql://user:pass@host:5432/tumiki

# Remote MCP認証
GITHUB_TOKEN=ghp_xxxxx
SLACK_TOKEN=xoxb-xxxxx

# パフォーマンス調整
MAX_IDLE_TIME=300000
CONNECTION_TIMEOUT=30000
HEALTH_CHECK_INTERVAL=60000
CACHE_TTL=300
CACHE_ENABLED=true
```

## トラブルシューティング

### よくある問題

**1. Remote MCPサーバーへの接続失敗**
```
症状: "Failed to connect to MCP server"
確認:
  - サーバーURL/ポートが正しいか
  - 認証トークンが有効か
  - ネットワークアクセス可能か
  - GET /health/detailed で状態確認
```

**2. 認証エラー**
```
症状: "Invalid or inactive API key"
確認:
  - APIキーが正しいか
  - データベースにレコードが存在するか
  - isActive = true か
  - キャッシュをクリア（再起動）
```

**3. パフォーマンス問題**
```
症状: レスポンスが遅い
確認:
  - Cloud Runログで duration 確認
  - キャッシュが有効化されているか
  - min-instances を増やす（コールドスタート削減）
  - Remote MCPサーバーの応答時間
```

**4. メモリリーク**
```
症状: メモリ使用量が増加し続ける
確認:
  - アイドル接続のクリーンアップが動作しているか
  - MAX_IDLE_TIME を短くする
  - メモリ使用量をモニタリング
```

## セキュリティチェックリスト

- [x] APIキー認証の実装
- [x] データベース検証（Prisma経由）
- [x] 暗号化保存（@encrypted）
- [x] 環境変数での秘密情報管理
- [x] 非rootユーザーでの実行
- [ ] CORS設定の追加（Phase 2）
- [ ] レート制限の実装（Phase 2）
- [ ] 入力検証の強化（Phase 2）

## パフォーマンスチェックリスト

- [x] ツールリストキャッシング（5分TTL）
- [x] 認証キャッシング（5分TTL）
- [x] 接続プーリング
- [x] ウォームアップ戦略
- [x] アイドル接続クリーンアップ
- [x] 並列リクエスト処理
- [ ] Redisベース分散キャッシュ（Phase 2）
- [ ] リクエストバッチング（Phase 2）

## 結論

本設計は以下の要件を満たすMCP Proxyサーバーを実現します：

1. ✅ **最小限の機能**: Honoベースの軽量実装、必要最小限の依存関係
2. ✅ **複数Remote MCP統合**: 名前空間ベースルーティング、接続プール管理
3. ✅ **ログ集積**: 構造化ログ、Cloud Logging/BigQuery自動連携
4. ✅ **MCPサーバー再公開**: JSON-RPC 2.0完全準拠、標準プロトコル対応
5. ✅ **Cloud Run対応**: ステートレス設計、水平スケール可能

**Next Steps**:
1. Remote MCPサーバー設定の追加（`mcpServers.ts`）
2. Cloud Runへのデプロイ実行
3. BigQueryダッシュボード構築
4. モニタリング・アラート設定
5. Phase 2機能の優先順位付けと実装計画
