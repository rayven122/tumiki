---
name: tumiki-mcp-wrapper-architecture
description: |
  mcp-wrapper の DDD + CQRS + Vertical Slice Architecture ガイドライン。
  stdio MCP サーバーの動的起動・プロセス管理、新機能追加手順を提供。
  「mcp-wrapper アーキテクチャ」「STDIO サーバー」「プロセスプール」などのリクエスト時にトリガー。
sourcePatterns:
  - apps/mcp-wrapper/src/domain/**
  - apps/mcp-wrapper/src/features/**
  - apps/mcp-wrapper/src/infrastructure/**
  - apps/mcp-wrapper/src/shared/**
---

# mcp-wrapper アーキテクチャガイドライン

## 概要

mcp-wrapper は stdio MCP サーバーを動的に起動・管理する HTTP ラッパーサービス。
環境変数ベースの MCP サーバーのみを対象とし、プロセスプールで効率的に管理する。

## デプロイ環境

mcp-wrapper は mcp-proxy とは別の VM にデプロイされる。

```
mcp-proxy (VM 1) → HTTP → mcp-wrapper (VM 2) → stdio → MCP サーバープロセス
```

## レイヤー構成

```
domain/          純粋ドメイン（外部依存なし）
  ↑
shared/          横断的関心事（domain/ のみ依存可）
  ↑
infrastructure/  外部サービスアダプタ（domain/, shared/ に依存可）
  ↑
features/        Vertical Slice（全レイヤーに依存可、feature間依存禁止）
```

## レイヤー責務と import ルール

| レイヤー | 責務 | import ルール |
|---------|------|-------------|
| `domain/` | 値オブジェクト、ドメインエラー、純粋関数 | 外部パッケージ・他レイヤーの import 禁止 |
| `shared/` | ロガー、設定定数、共通型 | `domain/` のみ import 可 |
| `infrastructure/` | DB リポジトリ、プロセス管理 | `domain/`, `shared/` のみ import 可 |
| `features/` | ルート、Command/Query ハンドラー | 全レイヤー import 可。**feature 間は import 禁止** |

ESLint `import/no-restricted-paths` ルールで自動的に強制される。

## ディレクトリ構造

```
apps/mcp-wrapper/src/
├── index.ts                          # サーバー起動 + シャットダウン
├── app.ts                            # Hono app 作成・ルートマウント
│
├── domain/
│   ├── types/
│   │   └── mcpServer.ts              # McpServerConfig 型
│   ├── values/
│   │   └── processKey.ts             # ProcessKey 値オブジェクト
│   ├── errors/
│   │   ├── domainError.ts            # DomainError 基底
│   │   ├── serverNotFoundError.ts
│   │   └── processError.ts
│   └── services/
│       └── envMapper.ts              # ヘッダー→環境変数変換（純粋関数）
│
├── features/
│   ├── health/
│   │   └── route.ts                  # GET /health
│   ├── status/
│   │   └── route.ts                  # GET /status
│   └── mcp/
│       ├── route.ts                  # POST /mcp/:serverName
│       ├── mcpRequestHandler.ts
│       ├── commands/
│       │   └── forwardRequest/       # リクエスト転送 (Command)
│       └── queries/
│           └── getServerConfig/      # サーバー設定取得 (Query)
│
├── infrastructure/
│   ├── db/repositories/
│   │   └── mcpServerTemplateRepository.ts
│   └── process/
│       ├── processPool.ts            # プロセスプール管理
│       └── mcpProcess.ts             # MCP プロセス管理
│
└── shared/
    ├── constants/
    │   └── config.ts                 # 設定定数
    ├── logger/
    │   └── index.ts
    └── types/
        ├── honoEnv.ts
        └── jsonRpc.ts
```

## CQRS パターン

mcp-proxy と同様の軽量 CQRS を採用。

### Query（読み取り専用）

```typescript
// features/mcp/queries/getServerConfig/getServerConfigQuery.ts
export type GetServerConfigQuery = {
  readonly serverName: string;
};

export const getServerConfigQuery = async (
  query: GetServerConfigQuery,
): Promise<McpServerConfig> => {
  const config = await getStdioServerByName(query.serverName);
  if (!config) {
    throw new ServerNotFoundError(query.serverName);
  }
  return config;
};
```

### Command（副作用あり）

```typescript
// features/mcp/commands/forwardRequest/forwardRequestCommand.ts
export type ForwardRequestCommand = {
  readonly serverConfig: McpServerConfig;
  readonly headers: Record<string, string | undefined>;
  readonly request: JsonRpcRequest;
};

export const forwardRequestCommand = async (
  command: ForwardRequestCommand,
): Promise<JsonRpcResponse> => {
  const { serverConfig, headers, request } = command;

  // ヘッダーを環境変数に変換
  const env = mapHeadersToEnv(headers, serverConfig.envVarKeys);

  // プロセスを取得または起動
  const mcpProcess = await processPool.getOrCreate(serverConfig, env);

  // リクエストを転送
  return mcpProcess.sendRequest(request);
};
```

## 主要コンポーネント

### ProcessPool

プロセスプール管理クラス。LRU eviction とアイドルタイムアウトを実装。

```typescript
// シングルトンインスタンス
export const processPool = new ProcessPool();

// 使用例
const process = await processPool.getOrCreate(serverConfig, env);
const response = await process.sendRequest(request);
```

### McpProcess

個別の MCP プロセスを管理。stdio 通信と JSON-RPC 変換を担当。

主要メソッド:
- `spawn()`: プロセス起動
- `sendRequest(request)`: JSON-RPC リクエスト送信
- `kill()`: プロセス終了
- `isAlive()`, `isBusy()`: 状態確認

### ProcessKey

サーバー名 + 環境変数ハッシュで一意にプロセスを識別する値オブジェクト。

```typescript
const key = createProcessKey("github-stdio", { "X-GitHub-Token": "xxx" });
// → "github-stdio:abc12345"
```

## 新機能追加手順

### 新しい Query の追加

1. `features/mcp/queries/<queryName>/` ディレクトリ作成
2. `<queryName>Query.ts` に Query 型とハンドラー関数を定義
3. テストを `__tests__/` に配置

### 新しい Command の追加

1. `features/mcp/commands/<commandName>/` ディレクトリ作成
2. `<commandName>Command.ts` に Command 型とハンドラー関数を定義
3. テストを `__tests__/` に配置

### 新しいドメインサービスの追加

1. `domain/services/<serviceName>.ts` に純粋関数を定義
2. 外部依存なし、テスト容易性を確保
3. テストを `domain/services/__tests__/` に配置

## ヘッダー→環境変数変換

`envVarKeys` に指定されたヘッダー名から値を取得し、同名の環境変数としてプロセスに注入:

```typescript
// envVarKeys = ["X-DeepL-API-Key"]
// headers = { "x-deepl-api-key": "xxx" }
// → env = { "X-DeepL-API-Key": "xxx" }
```

## STDIO サーバーテンプレート

`McpServerTemplate` テーブルの `transportType = STDIO` エントリを使用:

- `normalizedName`: URL パスで使用するサーバー識別子
- `command`: 実行コマンド（通常 "npx"）
- `args`: コマンド引数（例: ["-y", "@modelcontextprotocol/server-github"]）
- `envVarKeys`: 必要な環境変数キー（ヘッダー名と同一）

シードスクリプト: `packages/scripts/src/upsertStdioMcpServers.ts`

## 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `PORT` | HTTP サーバーポート | `8080` |
| `MAX_PROCESSES` | 最大プロセス数 | `20` |
| `IDLE_TIMEOUT_MS` | アイドルタイムアウト (ms) | `300000` |
| `REQUEST_TIMEOUT_MS` | リクエストタイムアウト (ms) | `60000` |
| `DATABASE_URL` | PostgreSQL 接続文字列 | - |

## テストファイル配置ルール

テストは対象ファイルの近くに `__tests__/` ディレクトリを作成して配置:

```
domain/services/
├── envMapper.ts
└── __tests__/
    └── envMapper.test.ts
```

## 関連ドキュメント

- 設計書: `docs/proposals/mcp-wrapper-design.md`
- README: `apps/mcp-wrapper/README.md`
- シードデータ: `packages/scripts/src/constants/stdioMcpServers.ts`
