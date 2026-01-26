# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

プロジェクトの詳細については [README.md](./README.md) を参照してください。

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

## Python MCP サーバーのサポート

Tumiki は Python ベースの MCP サーバーをサポートしています：

- **自動インストール**: `pnpm install` 時に `python-mcp-requirements.txt` のパッケージが自動インストール
- **設定方法**: `mcpServers.ts` で `command: "uvx"` と `args: ["package-name"]` を指定
- **環境変数**: Node.js サーバーと同様に `envVars` で指定
- **追加方法**: `python-mcp-requirements.txt` に追記して `pnpm install` を実行

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

- **フレームワーク**: Vitest v4 (jsdom環境) 使用
- **テスト記法**: **`test` 使用必須（`it` ではない）**、**テスト名は日本語で記載必須**
- **構造**: 関数ごとに `describe` ブロックを記載、古典派単体テスト
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
- E2Eテスト: `tests/e2e/*.test.ts`
- テストセットアップ: `tests/setup.ts`
- E2Eテストファイルをユニットテストディレクトリと混在させない

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
  - `/mcp` - HTTP/JSON-RPC 2.0 エンドポイント
  - Cloud Run対応のステートレス設計
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

## 実装後の必須アクション

**重要**: 実装が完了したら、必ず以下のコマンドを実行してください：

1. **`pnpm format:fix`** - コードフォーマットの自動修正（必須）
2. `pnpm lint:fix` - リントエラーの自動修正
3. `pnpm typecheck` - 型チェック
4. `pnpm build` - ビルド確認
5. `pnpm test` - テスト実行

これらのコマンドは実装完了後に必ず実行し、全てが成功することを確認してください。

## 完了条件

- `pnpm format:fix`, `pnpm lint:fix`, `pnpm typecheck`, `pnpm build`, `pnpm test` が全て成功すること
- Vitest を使って実装ロジックのカバレッジを100%にすること
- 関連ドキュメントの更新完了させること
- MCPサーバーの統合テストが成功すること
