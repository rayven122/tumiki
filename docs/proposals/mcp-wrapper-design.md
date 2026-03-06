# mcp-wrapper 設計書

**作成日**: 2026-03-06
**更新日**: 2026-03-06
**対象**: `apps/mcp-wrapper`
**ステータス**: 実装完了

---

## 1. 概要

### 1.1 目的

単一の HTTP サーバーで複数の stdio MCP サーバーを動的に起動・管理し、100+ の MCP サーバーをサポートする。

### 1.2 スコープ

**対象: 環境変数ベースの MCP サーバーのみ（約 90%）**

| 種類 | 対象 | 理由 |
|------|------|------|
| 環境変数ベース | ✅ 対象 | メモリ分離で安全 |
| OAuth/ファイルベース | ❌ 対象外 | Cloud Run で対応 |

### 1.3 アーキテクチャ

```
Claude Desktop / Client
       │
       ▼
mcp-proxy (認証・ルーティング) ← VM 1
       │
       │  HTTP (VPC内通信 ~1ms)
       ▼
mcp-wrapper (プロセス管理) ← VM 2
       │
       │  stdio
       ▼
MCP サーバープロセス (npx -y <package>)
```

---

## 2. 主要機能

| 機能 | 説明 |
|------|------|
| 動的プロセス起動 | リクエスト時に MCP サーバーをオンデマンド起動 |
| プロセスプール | 最大 N 個のプロセスを管理、LRU eviction |
| ヘッダー→環境変数変換 | HTTP ヘッダーを環境変数に変換してプロセスに注入 |
| アイドルタイムアウト | 未使用プロセスを自動停止 |

---

## 3. データモデル

**既存の `McpServerTemplate` を使用（新規テーブル不要）**

```
McpServerTemplate（既存）
├── normalizedName    → サーバー識別子
├── transportType     → STDIO でフィルタ
├── command           → 実行コマンド（例: "npx"）
├── args              → コマンド引数（例: ["-y", "package"]）
├── envVarKeys        → 環境変数キー（ヘッダー名と同一）
└── organizationId    → 公式 or 組織カスタム
```

**ヘッダー→環境変数の規則:**
- `envVarKeys = ["X-DeepL-API-Key"]`
- HTTP ヘッダー `x-deepl-api-key: xxx`
- → 環境変数 `X-DeepL-API-Key=xxx`

---

## 4. API 仕様

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/health` | GET | ヘルスチェック |
| `/status` | GET | プロセスプール状態 |
| `/mcp/:serverName` | POST | MCP リクエスト転送 |

### リクエスト例

```bash
curl -X POST http://localhost:8080/mcp/everything-stdio \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## 5. 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `PORT` | HTTP サーバーポート | `8080` |
| `MAX_PROCESSES` | 最大プロセス数 | `20` |
| `IDLE_TIMEOUT_MS` | アイドルタイムアウト (ms) | `300000` (5分) |
| `REQUEST_TIMEOUT_MS` | リクエストタイムアウト (ms) | `60000` (1分) |
| `DATABASE_URL` | PostgreSQL 接続文字列 | - |

---

## 6. ディレクトリ構成

DDD + CQRS + Vertical Slice Architecture（mcp-proxy と同じ）

```
apps/mcp-wrapper/src/
├── domain/           # 純粋ドメイン（外部依存なし）
│   ├── types/        # McpServerConfig
│   ├── values/       # ProcessKey
│   ├── errors/       # DomainError
│   └── services/     # envMapper
├── features/         # Vertical Slice
│   ├── health/       # GET /health
│   ├── status/       # GET /status
│   └── mcp/          # POST /mcp/:serverName
├── infrastructure/   # 外部サービスアダプタ
│   ├── db/           # McpServerTemplate リポジトリ
│   └── process/      # ProcessPool, McpProcess
└── shared/           # 設定、ロガー
```

---

## 7. セキュリティ

| 項目 | 対策 |
|------|------|
| メモリ分離 | 各プロセスは独立した Node.js プロセス |
| ファイル分離 | 環境変数ベースのみ対象（ファイル書き込みなし） |
| API キー | ログに出力しない |

---

## 8. 対応サーバー一覧

現在登録されている STDIO サーバー:

| サーバー | パッケージ | 認証 |
|---------|-----------|------|
| Everything STDIO | `@modelcontextprotocol/server-everything` | なし |
| Sequential Thinking STDIO | `@modelcontextprotocol/server-sequential-thinking` | なし |
| Filesystem STDIO | `@modelcontextprotocol/server-filesystem` | なし |
| GitHub STDIO | `@modelcontextprotocol/server-github` | API_KEY |
| GitLab STDIO | `@modelcontextprotocol/server-gitlab` | API_KEY |
| PostgreSQL STDIO | `@modelcontextprotocol/server-postgres` | API_KEY |
| Slack STDIO | `@modelcontextprotocol/server-slack` | API_KEY |

シードスクリプト: `packages/scripts/src/upsertStdioMcpServers.ts`

---

## 9. 将来拡張: 組織カスタム対応

組織ごとのカスタム MCP サーバーは `organizationId` で区別:

```typescript
// 検索順序
// 1. 組織のカスタムテンプレートを優先
// 2. 公式テンプレートにフォールバック
const getStdioServerByName = async (normalizedName: string, orgId?: string) => {
  if (orgId) {
    const orgTemplate = await findByNameAndOrg(normalizedName, orgId);
    if (orgTemplate) return orgTemplate;
  }
  return findByNameAndOrg(normalizedName, OFFICIAL_ORGANIZATION_ID);
};
```

---

## 10. 関連ドキュメント

| ドキュメント | 場所 |
|-------------|------|
| README | `apps/mcp-wrapper/README.md` |
| シードデータ | `packages/scripts/src/constants/stdioMcpServers.ts` |
| McpServerTemplate スキーマ | `packages/db/prisma/schema/mcpServer.prisma` |
| mcp-proxy アーキテクチャ | `tumiki-mcp-proxy-architecture` スキル |
