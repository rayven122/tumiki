# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For general project information, see [README.md](README.md).
日本語版は [README.ja.md](README.ja.md) を参照してください。

## プロジェクト概要

開発者向けの詳細情報は以下のセクションを参照してください。

### 主要な開発コマンド

```bash
# 基本操作
pnpm install           # 依存関係インストール（Python MCP自動インストール含む）
pnpm dev               # 開発サーバー起動（全アプリ）
pnpm build             # ビルド（全パッケージ）
pnpm start             # 本番サーバー起動

# コード品質チェック
pnpm check             # 全品質チェック（lint + format + typecheck）
pnpm lint:fix          # Lint自動修正
pnpm format:fix        # フォーマット自動修正
pnpm typecheck         # TypeScript型チェック（tsc使用）
pnpm test              # テスト実行
pnpm test:watch        # テストウォッチモード
pnpm test:coverage     # カバレッジ付きテスト
pnpm test:ui           # Vitest UI

# Docker操作
pnpm docker:up         # コンテナ起動（PostgreSQL, Redis, Keycloak）
pnpm docker:stop       # コンテナ停止
pnpm docker:down       # コンテナ削除
pnpm docker:ps         # コンテナ状態確認
pnpm docker:logs       # コンテナログ表示

# Keycloak操作（Terraform管理）
## ローカル開発環境
pnpm setup:dev         # 開発環境一括セットアップ（Docker起動 + Keycloak設定）
pnpm keycloak:init     # Terraform初期化
pnpm keycloak:plan     # 設定変更のプレビュー
pnpm keycloak:apply    # Keycloak設定を適用
pnpm keycloak:wait     # Keycloak起動完了を待機
pnpm keycloak:destroy  # Keycloak設定を削除

## 本番環境（さくらのクラウド）
pnpm keycloak:prod:setup-db   # PostgreSQL接続確認
pnpm keycloak:prod:setup      # DockerインストールKeycloak VM）
pnpm keycloak:prod:deploy     # Keycloakコンテナ起動
pnpm keycloak:prod:plan       # 本番Terraform変更プレビュー
pnpm keycloak:prod:apply      # 本番Keycloak設定を適用
pnpm keycloak:prod:status     # ステータス確認
pnpm keycloak:prod:logs       # ログ表示
pnpm keycloak:prod:restart    # サービス再起動
pnpm keycloak:prod:shell      # Keycloak VMにSSH接続

# データベース操作（packages/db内で実行）
cd packages/db
pnpm db:generate       # Prismaクライアント生成
pnpm db:migrate        # マイグレーション実行
pnpm db:push           # スキーマプッシュ（開発環境）
pnpm db:push:test      # スキーマプッシュ（テスト環境）
pnpm db:studio         # Prisma Studio起動

# デプロイ（本番環境のみ使用）
pnpm deploy            # デプロイ（対話式）
pnpm deploy:vercel     # Vercelのみデプロイ
pnpm deploy:gce        # Cloud Runのみデプロイ
pnpm deploy:all        # 全環境デプロイ
pnpm deploy:production # 本番環境デプロイ
pnpm deploy:dry-run    # デプロイ確認（実行なし）

# Stripe（本番環境のみ）
pnpm verify:stripe     # Stripe環境変数検証
pnpm stripe:listen     # Stripeウェブフックリスナー

# モノレポ操作
pnpm --filter @tumiki/db <command>     # 特定パッケージでコマンド実行
turbo run build --filter=manager       # 特定アプリのみビルド
```

## CCManager（並列 Claude Code セッション管理）

複数のLinear Issueを並列で処理する場合、[CCManager](https://github.com/upamune/ccmanager)を使用してGit Worktreeベースのセッション管理を推奨します。`/batch-issues`コマンドで複数Issueの並列処理が可能です。

## Cloud Run MCP サーバー連携

Tumiki は Google Cloud Run にデプロイされた MCP サーバーをサポートしています：

- **デプロイ**: [tumiki-mcp-cloudrun](https://github.com/rayven122/tumiki-mcp-cloudrun) を使用して MCP サーバーを Cloud Run にデプロイ
- **接続方式**: Streamable HTTPS トランスポート
- **認証**: Cloud Run IAM 認証とフィールドレベル暗号化による API キー管理
- **詳細ガイド**: [Cloud Run MCP サーバー連携ガイド](./docs/cloudrun-mcp-integration.md) を参照

## 開発ガイドライン

### TypeScript コーディング規約

- **`any`型は絶対に使用禁止** - 常に適切な型、`unknown`、またはジェネリック型パラメータを使用すること
- **コード内のコメントは日本語で記述** - コードの可読性と保守性向上のため
- TypeScript strict mode 使用（tsconfig.json で既に有効化済み）
- 可能な限り型推論を優先するが、関数の引数と戻り値は明示的に型付けする
- 型が本当に不明な場合は`any`ではなく`unknown`を使用する
- **TSDocで`@example`は使用禁止** - 使用例はテストコードで表現すること

#### TypeScript 設定ファイル構成

各パッケージ・アプリでは、TypeScript設定を**2つのファイルに分割**すること：

- **`tsconfig.json`**: 型チェック用設定（テストファイルを含む全ファイルが対象）
- **`tsconfig.build.json`**: ビルド用設定（テストファイルを除外）

package.jsonのbuildスクリプトでは`tsconfig.build.json`を明示的に指定：

```json
{
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "typecheck": "tsc --noEmit"
  }
}
```

例:

```typescript
// ❌ 悪い例 - anyは使用禁止
function process(data: any): any {
  return data;
}

// ✅ 良い例 - 適切な型を使用
function process<T>(data: T): T {
  return data;
}

// ✅ 良い例 - 本当に不明な型にはunknownを使用
function process(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }
  return String(data);
}
```

### フロントエンド コーディング規約

- **コンポーネント**: 関数コンポーネント + アロー関数、必須の Props 型定義。呼び出す側と同一階層の `_components/` ディレクトリに配置する。共通で利用するコンポーネントは、呼び出し側の一つ上の `_components/` ディレクトリに配置する。
- **関数定義**: 全ての関数はアロー関数で記述する（`const fn = () => {}` 形式）
- **スタイリング**: **すべてのスタイリングにTailwind CSSクラスを使用すること必須** - インラインスタイルや別途のCSSファイルは使用しない
- **モバイルファースト設計**: スマートフォン向けのビューポートサイズ専用に設計（一般的な最大幅: 428px）
- **タッチ操作最適化**: 適切なタップターゲットサイズを使用（最小44x44px）
- **Tailwind CSS v4**: `@tailwindcss/postcss`プラグインを使用、設定は`globals.css`内の`@theme`ディレクティブで行う
- **データフェッチング**: tRPC 使用（`trpc.useQuery()`, `trpc.useMutation()`）
- **状態管理**: ローカルは `useState`、グローバルは Jotai
- **型定義**: 共有型は `@tumiki/db` から import
- **型定義方法**: `type` のみ使用（`interface` は使用しない）
- **ID管理**: branded type を使用し、`@apps/manager/src/schema/ids.ts` に定義
- **設計原則**: DRY原則とSOLID原則を遵守
- **プログラミングパラダイム**: 関数型プログラミング（クラスは使用しない）
- **モジュール構成**: `utils/` や `libs/` からのインポートを容易にするため、`index.ts` にエントリーポイントを用意

### テストコーディング規約

テスト作成の詳細なガイドラインは `tumiki-testing-patterns` スキルを参照してください。このスキルには以下が含まれます：

- テスト記法と命名規則（`test`必須、日本語テスト名必須）
- Vitestモックパターン（環境変数、タイマー、関数）
- データベーステスト環境の設定
- tRPCルーターテストパターン
- Reactコンポーネントテストパターン

**基本ルール（要約）**:

- **フレームワーク**: Vitest v4 (jsdom環境)
- **テスト記法**: `test()` 使用必須（`it()` ではない）、テスト名は日本語
- **アサーション**: `toStrictEqual` 使用（`toEqual` ではない）
- **実行**: `pnpm test`（`vitest run`）でテスト実行、`pnpm test:watch`（`vitest`）でウォッチモード
- **カバレッジ**: `pnpm test:coverage` でカバレッジ測定、実装ロジックのカバレッジ100%を目標
- **Reactテスト**: コンポーネントテスト用の@testing-library/react使用
- **E2Eテスト**: エンドツーエンドテスト用のPlaywright使用

#### テスト命名規則

```typescript
// ❌ 悪い例 - it()や英語は使用しない
it("should return user data", () => {});

// ✅ 良い例 - 日本語でtest()を使用
test("ユーザーデータを返す", () => {});

// ✅ 良い例 - グループ化にdescribe()を使用(日本語または英語可)
describe("ユーザールーター", () => {
  test("存在するユーザーのデータを返す", () => {});
  test("存在しないユーザーの場合はエラーを返す", () => {});
});
```

#### テストのベストプラクティス

##### 環境変数のモック

- **環境変数のモックには`vi.stubEnv()`を使用すること必須** - `process.env.VARIABLE = 'value'`は使用しない
- クリーンアップで元の値を復元するために`vi.unstubAllEnvs()`を使用

例:

```typescript
beforeAll(() => {
  vi.stubEnv("NODE_ENV", "test");
});

afterAll(() => {
  vi.unstubAllEnvs();
});
```

##### タイマーのモック

- タイマーのモックには`vi.useFakeTimers({ shouldAdvanceTime: false })`を使用
- クリーンアップで実際のタイマーを復元するために`vi.useRealTimers()`を使用
- タイマーを進めるには`vi.advanceTimersByTime(ms)`を使用

例:

```typescript
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});
```

##### テストファイルの構成

- ユニットテスト: `src/**/__tests__/*.test.ts(x)`
- EEユニットテスト: `src/**/__tests__/*.ee.test.ts`
- E2Eテスト: `tests/e2e/*.test.ts`
- テストセットアップ: `tests/setup.ts`
- E2Eテストファイルをユニットテストディレクトリと混在させない

##### Enterprise Edition (EE) テスト

EE機能のテストファイルは `.ee.test.ts` 拡張子を使用：

```typescript
// ファイル名: feature.ee.test.ts
// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { describe, test, expect } from "vitest";

describe("EE機能", () => {
  test("EE固有の動作を検証", () => {
    // テストコード
  });
});
```

EEテストの実行：

```bash
# 全テスト実行（EEテスト含む）
pnpm test
```

#### データベーステスト環境

データベースを使用するテストの実行には、専用のテスト環境が必要：

- **テスト用DB**: PostgreSQLコンテナ `db-test`（ポート5435）を使用
- **DB起動**: `docker compose -f ./docker/compose.yaml up -d db-test`
- **スキーマ適用**: `cd packages/db && pnpm db:push:test` でテスト用DBにスキーマを適用
- **環境設定**: `.env.test` でテスト用DB接続設定（`postgresql://root:password@localhost:5435/tumiki_test`）
- **テスト環境**: vitest-environment-vprisma でトランザクション分離された独立テスト実行

#### 品質チェック

コミットまたはPR作成前に、すべての品質チェックが通過することを確認：

```bash
pnpm typecheck    # TypeScript型チェック(必須)
pnpm test         # カバレッジ付きユニットテスト(必須)
pnpm build        # 本番ビルド(必須)
```

**重要**: コードをコミットする前に、3つのチェックすべてが通過する必要があります。続行する前にエラーや警告を修正してください。

## 重要なアーキテクチャパターン

### データベーススキーマ構成

Prisma スキーマは複数のファイルに分割（`packages/db/prisma/schema/`）：

- `base.prisma` - コア設定とジェネレーター
- `mcpServer.prisma` - MCP サーバー定義とツール
- `userMcpServer.prisma` - ユーザー固有のサーバー設定
- `organization.prisma` - マルチテナント組織サポート
- `chat.prisma` - チャット/メッセージング機能
- `apiKey.prisma` - APIキー管理
- `waitingList.prisma` - ウェイティングリスト機能

### API アーキテクチャ

- **tRPC ルーター**: `apps/manager/src/server/api/routers/` に配置
  - `mcpServer.ts` - 定義済みMCPサーバーテンプレート管理
  - `userMcpServerConfig.ts` - ユーザー固有のMCPサーバー設定
  - `userMcpServerInstance.ts` - 実行中のMCPサーバーインスタンス管理
  - `post.ts` - 汎用投稿機能
- **MCP プロキシサーバー**: `apps/mcp-proxy/src/index.ts`
  - DDD + CQRS + Vertical Slice Architecture（詳細は `tumiki-mcp-proxy-architecture` スキル参照）
  - `/mcp` - HTTP/JSON-RPC 2.0 エンドポイント
  - Cloud Run対応のステートレス設計
  - レイヤー構成: `domain/` → `shared/` → `infrastructure/` → `features/`
- **型安全性**: 自動 API 生成によるフルスタック型安全性、@tumiki/db から型 import

### 認証アーキテクチャ

- **プロバイダー**: Keycloak統合認証（`@tumiki/auth`パッケージ）
- **設定**: `packages/auth/src/config.ts`
- **セッション**: JWT ベース、Keycloakセッション管理
- **OAuth管理**: `@tumiki/oauth-token-manager`でトークン自動更新

### セキュリティ機能

- 機密データ（API キー、トークン）のフィールドレベル暗号化
- Keycloak統合認証・認可
- ロールベースアクセス制御
- JWT セッション管理

### 開発時の重要事項

- **Node.js**: >=22.14.0 必須
- **パッケージマネージャー**: pnpm@10.11.0（`packageManager`フィールドで固定）
- **型チェック**: 全パッケージで TypeScript strict モード
- **コミット前**: 必ず `pnpm check` 実行（CI環境変数エラーは開発時は無視可能）
- **型インポート**: Prisma 型は `@tumiki/db` から import（`@prisma/client` ではない）
- **ページ構造**: 英語版 `/` と日本語版 `/jp` の2つのランディングページが存在
- **環境変数**: プロジェクト直下の `.env` ファイルに定義。環境変数を読み込んで実行する必要があるものは、
  `dotenv` パッケージを使用して読み込む。ただし、npm scripts 実行時は自動的に読み込まれるため、手動での読み込みは不要。
- **ローカル開発URL**: `http://localhost:3000` でアクセス
- **@tumiki/ パッケージのimportエラー**: `@tumiki/` で始まるパッケージのimportに失敗する場合は、該当パッケージのビルドが必要。
  例: `@tumiki/db` のimportエラーが発生した場合 → `cd packages/db && pnpm build` を実行
- **Turboキャッシュ**: `.cache/` ディレクトリにビルドキャッシュが保存される（ESLint、Prettier、TypeScript）
- **Docker構成**: PostgreSQL（ポート5434/5435）、Redis（ポート6379）、Keycloak（ポート8443/8888）が`docker/compose.yaml`で管理
- **Keycloak設定**: Terraform（`terraform/keycloak/`）で管理。初回は`pnpm setup:dev`で一括セットアップ
- **Pythonツール**: `pnpm install` 時に `python-mcp-requirements.txt` のパッケージが自動インストール

## トラブルシューティング

### よくある問題と解決方法

#### `@tumiki/` パッケージのimportエラー

**症状**: `@tumiki/db` や `@tumiki/auth` などのインポートでエラーが発生

```bash
# 該当パッケージをビルド
cd packages/db && pnpm build
# または全パッケージをビルド
pnpm build
```

#### Keycloak接続エラー

**症状**: 認証が失敗、ログインページが表示されない

```bash
# Keycloakコンテナの起動確認
pnpm docker:ps
# Keycloak起動待機
pnpm keycloak:wait
# 設定の再適用（初回または設定変更後）
pnpm keycloak:apply
```

#### テスト環境のデータベースエラー

**症状**: テスト実行時にDB接続エラー

```bash
# テスト用DBの起動
docker compose -f ./docker/compose.yaml up -d db-test
# スキーマの適用
cd packages/db && pnpm db:push:test
```

#### 開発サーバーが起動しない

**症状**: `pnpm dev` でエラーが発生

```bash
# 依存関係の再インストール
pnpm install
# 環境変数の確認
cat .env | head -20
# Dockerコンテナの状態確認
pnpm docker:ps
```

#### Prisma関連のエラー

**症状**: Prismaクライアントのエラー、型が見つからない

```bash
cd packages/db
pnpm db:generate  # クライアント再生成
pnpm build        # パッケージビルド
```

#### 型チェックでCI環境変数エラー

**症状**: `typecheck`で環境変数の型エラー

- 開発時は無視可能（本番CIでは環境変数が設定される）
- 必要に応じて `.env` に該当変数を追加

## 統合MCPサーバー（CUSTOM）機能

### 概要

統合MCPサーバーは、複数のMCPサーバーテンプレートを1つのサーバーとして束ねる機能。OFFICIAL（単一テンプレート）と異なり、2つ以上のテンプレートを統合し、常にOAuth認証を使用する。

### 実装場所

- `packages/db/prisma/schema/userMcpServer.prisma` - スキーマ定義（ServerType enum等）
- `apps/manager/src/server/api/routers/v2/userMcpServer/createIntegratedMcpServer.ts` - 作成ロジック
- `apps/manager/src/server/api/routers/v2/userMcpServer/index.ts` - tRPCルーター定義
- `apps/manager/src/app/[orgSlug]/mcps/create-integrated/` - フロントエンド（4ステップウィザード）
- `apps/manager/src/atoms/integratedFlowAtoms.ts` - Jotai状態管理

### スキルの使用方法

統合MCP機能の実装・拡張・デバッグ時は、`tumiki-custom-mcp-server-feature`スキルを参照してください。このスキルには以下が含まれます：

- アーキテクチャ概要とServerType/AuthTypeの違い
- 主要な概念（McpServerTemplate, McpServerTemplateInstance, McpServer）
- 4ステップウィザードの詳細
- 作成ロジックの実装詳細
- 実装チェックリストとトラブルシューティング

### 機能変更時のスキル更新ルール

**重要**: 統合MCP機能に変更を加えた場合、必ず`.claude/skills/tumiki-custom-mcp-server-feature/SKILL.md`も更新してください。

以下の変更時にスキルの更新が必要：

- スキーマ定義の変更（ServerType, AuthType等）
- 作成ロジックの変更（`createIntegratedMcpServer.ts`）
- 入力スキーマの変更（`CreateIntegratedMcpServerInputV2`）
- フロー状態型の変更（`IntegratedFlowState`）
- ウィザードUIの構造変更

スキル更新の手順：

1. 変更した実装コードを確認
2. スキルの該当セクションを更新
3. コード例が最新の実装と一致していることを確認
4. チェックリストに必要な項目を追加

## Dynamic Search 機能（Enterprise Edition）

### 概要

Dynamic Searchは、MCPサーバーのツール発見を最適化するAI検索システム。`dynamicSearch=true`設定時、全ツールではなく3つのメタツール（`search_tools`, `describe_tools`, `execute_tool`）のみを公開し、必要なツールを動的に検索・実行する。

**注意**: この機能はEnterprise Edition（EE）機能です。CE版では無効化されます。

### 実装場所

- `apps/mcp-proxy/src/features/dynamicSearch/` - コア実装（EE機能）
  - `index.ts` - CE Facade（スタブ）
  - `index.ee.ts` - EEエントリーポイント
  - `*.ee.ts` - Enterprise Edition 実装ファイル
- `apps/mcp-proxy/src/features/mcp/commands/callTool/handleMetaTool.ts` - メタツール処理
- `apps/mcp-proxy/src/features/mcp/commands/callTool/callToolCommand.ts` - ツール実行

### スキルの使用方法

Dynamic Search機能の実装・拡張・デバッグ時は、`tumiki-dynamic-search-feature`スキルを参照してください。このスキルには以下が含まれます：

- アーキテクチャ概要と使用フロー
- 型定義とメタツール定義のパターン
- AI検索実装の詳細
- 新しいメタツール追加手順
- EE/CE分離アーキテクチャ
- 実装チェックリストとトラブルシューティング

### 機能変更時のスキル更新ルール

**重要**: Dynamic Search機能に変更を加えた場合、必ず`.claude/skills/tumiki-dynamic-search-feature/SKILL.md`も更新してください。

以下の変更時にスキルの更新が必要：

- 新しいメタツールの追加
- 型定義の変更（`types.ee.ts`）
- AI検索ロジックの変更（`searchTools.ee.ts`）
- メタツール定義の変更（`metaToolDefinitions.ee.ts`）
- ファイル構成の変更（EE/CE分離パターン含む）

スキル更新の手順：

1. 変更した実装コードを確認
2. スキルの該当セクションを更新
3. コード例が最新の実装と一致していることを確認
4. チェックリストに必要な項目を追加

## Enterprise Edition (EE) アーキテクチャ

### 概要

Tumikiは、オープンソースのCommunity Edition（CE）と商用のEnterprise Edition（EE）に分離されています。EE機能は専用の命名規則とライセンスで管理されます。

### ファイル命名規則

| パターン       | 説明                                    |
| -------------- | --------------------------------------- |
| `*.ee.ts`      | EE機能の実装ファイル                    |
| `*.ee.test.ts` | EE機能のテストファイル                  |
| `index.ts`     | CE Facade（スタブまたは動的インポート） |
| `index.ee.ts`  | EEエントリーポイント                    |

### SPDXライセンスヘッダー

全てのEEファイル（`.ee.ts`, `.ee.test.ts`）には以下のヘッダーを追加：

```typescript
// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.
```

### EE機能一覧（mcp-proxy）

| 機能           | ディレクトリ                                 | 説明                            |
| -------------- | -------------------------------------------- | ------------------------------- |
| Dynamic Search | `features/dynamicSearch/`                    | AIによるツール検索              |
| PII Masking    | `infrastructure/piiMasking/`, `features/mcp/middleware/piiMasking/` | GCP DLPによる個人情報マスキング |

### Facadeパターン

CE版では、EE機能への参照がある箇所でFacadeパターンを使用：

```typescript
// index.ts（CE Facade）
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// CE版ではDynamic Searchは利用不可
export const DYNAMIC_SEARCH_AVAILABLE = false;

// CE版ではメタツールは空配列
export const DYNAMIC_SEARCH_META_TOOLS: Tool[] = [];

// CE版では常に false を返す
export const isMetaTool = (_name: string): boolean => false;

// 型のみエクスポート（型互換性のため）
export type SearchResult = { /* ... */ };
export type DescribeToolsResult = { /* ... */ };
```

### 条件付き動的インポート

ミドルウェアでは、EE版でのみ機能を有効化：

```typescript
// features/mcp/middleware/piiMasking/index.ts
import { createMiddleware } from "hono/factory";

// CE版: 何もしないミドルウェアをエクスポート
export const piiMaskingMiddleware = createMiddleware(async (_c, next) => {
  await next();
});
```

### テスト実行

EEテスト（`.ee.test.ts`）は通常のテストと同様に `pnpm test` で実行される：

```bash
# 全テスト実行（EEテスト含む）
pnpm test
```

### ビルド設定

CE版ビルドでは `tsconfig.ce.json` を使用してEEファイルを除外：

```json
{
  "extends": "./tsconfig.build.json",
  "exclude": ["src/**/*.ee.ts", "src/**/*.ee.test.ts"]
}
```

## 実装後の必須アクション

**重要**: コードを修正・作成したら、必ず以下を実行してください：

1. **`pnpm format:fix`** - コードフォーマットの自動修正（必須）
2. `pnpm lint:fix` - リントエラーの自動修正
3. `pnpm typecheck` - 型チェック
4. `pnpm build` - ビルド確認
5. `pnpm test` - テスト実行
6. **tumiki-code-simplifier の実行**（必須・最重要） - Task ツールで `tumiki-code-simplifier` エージェントを起動し、最近変更されたコードを自動的にリファクタリングします。コードの明確性、一貫性、保守性を向上させつつ、機能を完全に保持します。
7. **ドキュメント更新の確認**（推奨） - `tumiki-docs-update-guide` スキルを参照し、変更したファイルに対応するスキルやCLAUDE.mdの更新が必要か確認します。各スキルの `sourcePatterns` と変更ファイルを照合し、コード例が最新の実装と一致していることを確認してください。

**注意**: tumiki-code-simplifier は**コード修正後に必ず実行**してください。これはコード品質を保つための必須ステップです。スキップしないでください。

これらのコマンドは実装完了後に必ず実行し、全てが成功することを確認してください。

## 完了条件

- `pnpm format:fix`, `pnpm lint:fix`, `pnpm typecheck`, `pnpm build`, `pnpm test` が全て成功すること
- Vitest を使って実装ロジックのカバレッジを100%にすること
- 関連ドキュメントの更新完了させること
- MCPサーバーの統合テストが成功すること
