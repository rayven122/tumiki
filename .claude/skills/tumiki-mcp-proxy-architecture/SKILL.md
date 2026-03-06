---
name: tumiki-mcp-proxy-architecture
description: |
  mcp-proxy の DDD + CQRS + Vertical Slice Architecture ガイドライン。
  新しいフィーチャー追加、レイヤー間依存ルール、Command/Query パターンを提供。
  「mcp-proxy アーキテクチャ」「新機能追加」「レイヤー設計」などのリクエスト時にトリガー。
sourcePatterns:
  - apps/mcp-proxy/src/domain/**
  - apps/mcp-proxy/src/features/**
  - apps/mcp-proxy/src/infrastructure/**
  - apps/mcp-proxy/src/shared/**
---

# mcp-proxy アーキテクチャガイドライン

## デプロイ環境

mcp-proxy は VM 上にデプロイされる。ステートレス設計により水平スケーリングに対応。

※ `infrastructure/mcp/cloudRunAuth.ts` は、外部 MCP サーバーが Cloud Run にホスティングされている場合の IAM 認証用であり、mcp-proxy 自体のデプロイ先とは無関係。

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
| `domain/` | 値オブジェクト、ドメインエラー、純粋関数、ドメイン固有型（ToolDefinition等） | 外部パッケージ・他レイヤーの import 禁止（ESLint 強制） |
| `shared/` | ロガー、エラーハンドリング、ユーティリティ、定数 | `domain/` のみ import 可 |
| `infrastructure/` | DB、Redis、MCP Client、Keycloak、Pub/Sub、暗号化、AI | `domain/`, `shared/` のみ import 可 |
| `features/` | ルート、ミドルウェア、Command/Query ハンドラー | 全レイヤー import 可。**feature 間は import 禁止**（dynamicSearch→mcp のみ例外） |

ESLint `import/no-restricted-paths` ルールで自動的に強制される。

## ディレクトリ構造

```
apps/mcp-proxy/src/
├── index.ts                          # サーバー起動 + シャットダウン
├── app.ts                            # Hono app 作成・ルートマウント
│
├── domain/
│   ├── types/                        # ToolDefinition 等（ドメイン固有型のみ）
│   ├── values/                       # NamespacedToolName 値オブジェクト
│   ├── errors/                       # DomainError 基底 + 具体エラー
│   └── services/                     # toolNameResolver (純粋関数)
│
├── features/
│   ├── health/                       # ヘルスチェック
│   ├── mcp/                          # MCP プロトコル (メイン)
│   │   ├── route.ts
│   │   ├── mcpRequestHandler.ts
│   │   ├── mcpServerFactory.ts
│   │   ├── commands/callTool/        # ツール実行 (Command)
│   │   ├── queries/
│   │   │   ├── initialize/           # 初期化 (Query)
│   │   │   └── listTools/            # ツール一覧 (Query)
│   │   └── middleware/               # auth, piiMasking, requestLogging, toonConversion
│   ├── oauth/                        # OAuth 認証
│   └── dynamicSearch/                # EE: AI ツール検索
│
├── infrastructure/
│   ├── db/repositories/              # DB アクセス
│   ├── cache/                        # Redis
│   ├── mcp/                          # MCP Client, CloudRun認証
│   ├── keycloak/                     # JWT 検証, Keycloak設定
│   ├── ai/                           # AI プロバイダー
│   ├── crypto/                       # 暗号化
│   ├── pubsub/                       # Pub/Sub ロギング
│   ├── piiMasking/                   # GCP DLP
│   └── toonConversion/               # Toon 変換
│
├── shared/
│   ├── constants/                    # 設定定数
│   ├── errors/                       # エラーハンドリング
│   ├── logger/                       # ロガー
│   ├── types/                        # HonoEnv
│   └── utils/                        # byteLength, tokenCount, configTransformer, jsonRpc
│
└── test-utils/                       # テストユーティリティ
```

## CQRS パターン

軽量 CQRS: Mediator は使わず、Command/Query 型を定義しハンドラー関数で直接処理。

### Command（副作用あり）

```typescript
// features/mcp/commands/callTool/callToolCommand.ts
export type CallToolCommand = {
  readonly mcpServerId: string;
  readonly organizationId: string;
  readonly fullToolName: string;
  readonly args: Record<string, unknown>;
  readonly userId: string;
};

export const callToolCommand = async (
  command: CallToolCommand,
): Promise<unknown> => {
  const { mcpServerId, organizationId, fullToolName, args, userId } = command;
  // infrastructure/db/repositories からデータ取得
  // infrastructure/mcp からクライアント接続
  // ...
};
```

### Query（読み取り専用）

```typescript
// features/mcp/queries/listTools/listToolsQuery.ts
export type ListToolsQuery = {
  readonly mcpServerId: string;
};

export const listToolsQuery = async (
  query: ListToolsQuery,
): Promise<GetAllowedToolsResult> => {
  const { mcpServerId } = query;
  // infrastructure/db/repositories からデータ取得
  // domain/services で変換
  // ...
};
```

### MCP SDK ハンドラーファクトリ

```typescript
// features/mcp/commands/callTool/callToolHandler.ts
export const createCallToolHandler = (
  mcpServerId: string,
  organizationId: string,
  userId: string,
  reAuthErrorContainer: ReAuthErrorContainer,
) => {
  return async (request: { params: { name: string; arguments?: Record<string, unknown> } }) => {
    // Command オブジェクトを作成して実行
    const result = await callToolCommand({
      mcpServerId, organizationId, fullToolName, args, userId,
    });
    return result;
  };
};
```

## 新機能追加手順

### 新しい Query の追加

1. `features/mcp/queries/<queryName>/` ディレクトリ作成
2. `<queryName>Query.ts` に Query 型とハンドラー関数を定義
3. `<queryName>Handler.ts` に MCP SDK ハンドラーファクトリを定義
4. `mcpServerFactory.ts` にハンドラー登録
5. テストを `__tests__/` に配置

### 新しい Command の追加

1. `features/mcp/commands/<commandName>/` ディレクトリ作成
2. `<commandName>Command.ts` に Command 型とハンドラー関数を定義
3. `<commandName>Handler.ts` に MCP SDK ハンドラーファクトリを定義
4. `mcpServerFactory.ts` にハンドラー登録
5. テストを `__tests__/` に配置

### 新しいリポジトリ関数の追加

1. `infrastructure/db/repositories/` の適切なファイルに関数を追加
2. `infrastructure/db/repositories/index.ts` バレルに追加
3. features/ のハンドラーから import して利用

## テストファイル配置ルール

テストは対象ファイルの近くに `__tests__/` ディレクトリを作成して配置:

```
feature/
├── someModule.ts
└── __tests__/
    └── someModule.test.ts
```

## 型の配置ルール

| カテゴリ | 配置場所 | 例 |
|---------|---------|-----|
| **DB enum（共有語彙）** | `@tumiki/db` から直接 import | `AuthType`, `PiiMaskingMode`, `TransportType` |
| **リクエストコンテキスト型** | `shared/types/` | `AuthContext`, `HonoEnv` |
| **ドメイン固有型** | `domain/types/` | `ToolDefinition`, `ToolInputSchema` |
| **値オブジェクト** | `domain/values/` | `NamespacedToolName` |
| **ドメインエラー** | `domain/errors/` | `DomainError` |
| **リポジトリ戻り値型** | `infrastructure/db/repositories/` | `McpServerLookupResult` |

### Prisma enum の扱い

Prisma enum（`AuthType`, `PiiMaskingMode`, `TransportType` 等）は
**プロジェクト全体の共有語彙**として `@tumiki/db` から直接 import する。

- **domain/ では使用禁止**（ESLint `no-restricted-imports` で強制）
- domain で Prisma enum を参照する型が必要な場合は `shared/types/` に配置する
- ドメイン層でラップ・再定義してはならない（型の重複を防ぐため）

## 維持すべきパターン

- **ReAuthErrorContainer**: MCP SDK 内部でのエラー伝達に必須
- **AsyncLocalStorage**: 実行コンテキスト管理 (`requestLogging/context.ts`)
- **EE/CE 分離**: `.ee.ts` + Facade パターン
- **Hono ミドルウェアチェーン**: auth → piiMasking → toonConversion の順序
