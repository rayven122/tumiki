# CLAUDE.md

Claude Code がこのリポジトリで作業する際のガイダンスファイルです。

## プロジェクト概要

プロジェクトの詳細については [README.md](./README.md) を参照してください。

## 開発コマンド

開発に必要なコマンドについては [README.md](./README.md) の「開発コマンド」セクションを参照してください。

## 開発ガイドライン

### フロントエンド コーディング規約

- **コンポーネント**: 関数コンポーネント + アロー関数、必須の Props 型定義。呼び出す側と同一階層の `_components/` ディレクトリに配置する。共通で利用するコンポーネントは、呼び出し側の一つ上の `_components/` ディレクトリに配置する。
- **関数定義**: 全ての関数はアロー関数で記述する（`const fn = () => {}` 形式）
- **スタイリング**: Tailwind CSS 使用、カスタムスタイルは `styles/globals.css`。className で条件分岐を含む場合は `clsx` を使用する
- **データフェッチング**: tRPC 使用（`trpc.useQuery()`, `trpc.useMutation()`）
- **状態管理**: ローカルは `useState`、グローバルは Jotai
- **型定義**: 共有型は `@tumiki/db` から import
- **型定義方法**: `type` のみ使用（`interface` は使用しない）
- **ID管理**: branded type を使用し、`@apps/manager/src/schema/ids.ts` に定義
- **設計原則**: DRY原則とSOLID原則を遵守
- **プログラミングパラダイム**: 関数型プログラミング（クラスは使用しない）
- **モジュール構成**: `utils/` や `libs/` からのインポートを容易にするため、`index.ts` にエントリーポイントを用意

### テストコーディング規約

- **フレームワーク**: Vitest 使用
- **テスト記法**: `test` 使用（`it` ではない）、日本語でテスト名を記載
- **構造**: 関数ごとに `describe` ブロックを記載、古典派単体テスト
- **アサーション**: `toStrictEqual` 使用（`toEqual` ではない）
- **実行**: `pnpm test`（`vitest run`）、`pnpm test:watch`（`vitest`）でウォッチモード
- **カバレッジ**: `pnpm test:coverage` でカバレッジ測定、実装ロジックのカバレッジ100%を目標

#### データベーステスト環境

データベースを使用するテストの実行には、専用のテスト環境が必要：

- **テスト用DB**: PostgreSQLコンテナ `db-test`（ポート5433）を使用
- **DB起動**: `docker compose -f ./docker/compose.dev.yaml up -d db-test`
- **スキーマ適用**: `cd packages/db && pnpm db:push:test` でテスト用DBにスキーマを適用
- **環境設定**: `.env.test` でテスト用DB接続設定（`postgresql://root:password@localhost:5433/tumiki_test`）
- **テスト環境**: vitest-environment-vprisma でトランザクション分離された独立テスト実行

## 重要なアーキテクチャパターン

### データベーススキーマ構成

Prisma スキーマは複数のファイルに分割（`packages/db/prisma/schema/`）：

- `base.prisma` - コア設定とジェネレーター
- `auth.prisma` - Auth0認証テーブル
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
- **MCP プロキシサーバー**: `apps/proxyServer/src/index.ts`
  - `/mcp` - HTTP/Streamable transport エンドポイント
  - `/sse` - SSE transport エンドポイント（後方互換性）
  - `/messages` - SSE メッセージ送信
- **型安全性**: 自動 API 生成によるフルスタック型安全性、@tumiki/db から型 import

### 認証アーキテクチャ

- **プロバイダー**: Auth0 統合認証
- **設定**: `packages/auth/src/config.ts`
- **セッション**: JWT ベース、Auth0セッション管理
- **ウェブフック**: Post-Login Action による動的ユーザー管理

### セキュリティ機能

- 機密データ（API キー、トークン）のフィールドレベル暗号化
- Auth0 統合認証・認可
- ロールベースアクセス制御
- JWT セッション管理
- ウェブフックシークレット検証

### 開発時の重要事項

- **Node.js**: >=22.14.0 必須
- **パッケージマネージャー**: pnpm@10.11.0 以上
- **型チェック**: 全パッケージで TypeScript strict モード
- **コミット前**: 必ず `pnpm check` 実行（CI環境変数エラーは開発時は無視可能）
- **型インポート**: Prisma 型は `@tumiki/db` から import（`@prisma/client` ではない）
- **ページ構造**: 英語版 `/` と日本語版 `/jp` の2つのランディングページが存在
- **環境変数**: プロジェクト直下の `.env` ファイルに定義。環境変数を読み込んで実行する必要があるものは、
  `dotenv` パッケージを使用して読み込む。ただし、npm scripts 実行時は自動的に読み込まれるため、手動での読み込みは不要。
- **ローカル開発URL**: `https://local.tumiki.cloud:3000` でアクセス。
- **@tumiki/ パッケージのimportエラー**: `@tumiki/` で始まるパッケージのimportに失敗する場合は、該当パッケージのビルドが必要。
  例: `@tumiki/db` のimportエラーが発生した場合 → `cd packages/db && pnpm build` を実行

### CI/CD

- **GitHub Actions**: `.github/workflows/ci.yml`
- **品質チェック**: `pnpm check` で lint + format + typecheck
- **Node メモリ**: `NODE_OPTIONS: --max-old-space-size=4096`

### Turbo タスク管理

並列実行とキャッシュ活用により高速化：

- `pnpm build` - アプリケーションビルド
- `pnpm dev` - 開発サーバー起動
- `pnpm lint` - ESLint実行
- `pnpm format` - Prettier実行
- `pnpm typecheck` - TypeScript型チェック

### 重要な実装パターン

- **フィールド暗号化**: 機密データ（APIキー等）はPrismaの暗号化機能で保護
- **SSE通信**: リアルタイムMCP通信にServer-Sent Eventsを使用
- **セッション管理**: MCPサーバーとの永続的な接続をセッションで管理
- **エラーハンドリング**: tRPCによる型安全なエラー処理とユーザー向けメッセージ
- **データ圧縮**: MCPリクエストデータの圧縮によるパフォーマンス最適化
- **リクエストログ**: ProxyServerでのMCPリクエスト監視・分析
- **PM2管理**: 本番環境でのプロセス管理と自動復旧
- **メトリクス収集**: リアルタイムパフォーマンス監視

## 完了条件

- `pnpm format:fix`, `pnpm lint:fix`, `pnpm typecheck`, `pnpm build`, `pnpm test` が全て成功すること
- Vitest を使って実装ロジックのカバレッジを100%にすること
- 関連ドキュメントの更新完了させること
- PM2での本番環境デプロイが正常に動作すること
- MCPサーバーの統合テストが成功すること
