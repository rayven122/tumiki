# Tumiki

複数のMCPサーバーを一元管理し、効率的なAPI管理を実現するためのWebアプリケーションです。

## 主な機能

- 複数のMCPサーバーの一元管理
- サーバーの状態監視と制御
- APIキーの安全な管理
- 統合URLの生成と管理
- ツールの選択的な公開
- プロキシサーバーによる単一エンドポイントでのMCPサーバー統合

## プロジェクト構造

このプロジェクトはTurboを使用したモノレポ構造になっています。

```
tumiki/
├── apps/
│   ├── manager/          # メインのWebアプリケーション（Next.js）
│   └── proxyServer/      # MCPサーバープロキシ（Express/Hono）
├── packages/             # 共有パッケージ
├── tooling/              # 開発ツール設定
│   ├── eslint/          # ESLint設定
│   ├── prettier/        # Prettier設定
│   ├── tailwind/        # Tailwind CSS設定
│   └── typescript/      # TypeScript設定
└── docker/              # Docker設定
```

## 技術スタック

### Manager（Webアプリケーション）

- [Next.js](https://nextjs.org) - Reactフレームワーク
- [NextAuth.js](https://next-auth.js.org) - 認証
- [Prisma](https://prisma.io) - ORM
- [Tailwind CSS](https://tailwindcss.com) - CSSフレームワーク
- [tRPC](https://trpc.io) - 型安全API

### ProxyServer（MCPプロキシ）

- [Express](https://expressjs.com) / [Hono](https://hono.dev) - Webフレームワーク
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP SDK
- [Prisma](https://prisma.io) - ORM

### 共通

- [Turbo](https://turbo.build/repo) - モノレポビルドシステム
- [TypeScript](https://www.typescriptlang.org) - 型安全性
- [ESLint](https://eslint.org) - コード品質
- [Prettier](https://prettier.io) - コードフォーマット

## セットアップ

1. リポジトリのクローン

```bash
git clone https://github.com/rayven122/mcp-server-manager tumiki
cd tumiki
```

2. 依存関係のインストール

```bash
pnpm install
```

3. 環境変数の設定

```bash
cp .env.test .env
# .envファイルを編集して必要な環境変数を設定
```

4. データベースのセットアップ

```bash
# apps/manager ディレクトリに移動
cd apps/manager
pnpm run db:deploy   # データベースの初期化
```

5. 開発サーバーの起動

```bash
# すべてのアプリケーション
pnpm run dev

# または個別起動
cd apps/manager && pnpm run dev     # Manager（ポート3000）
cd apps/proxyServer && pnpm run dev # ProxyServer（ポート3001）
```

## アプリケーション

### Manager（Webアプリケーション）

MCPサーバーの管理画面を提供するNext.jsアプリケーション。サーバーの設定、監視、APIキー管理などを行います。

- URL: http://localhost:3000
- ポート: 3000

### ProxyServer（MCPプロキシ）

複数のMCPサーバーを単一のエンドポイントで統合するプロキシサーバー。各MCPサーバーを子プロセスとして管理し、リクエストを適切なサーバーに振り分けます。

- URL: http://localhost:8080
- SSEエンドポイント: `/sse`
- HTTPエンドポイント: `/mcp`
- ポート: 8080

<!-- #### プロキシサーバーの検証

```bash
# MCP Inspectorを使用した接続テスト
cd apps/proxyServer
pnpm run inspector
``` -->

## 開発コマンド

このプロジェクトではTurboを使用してモノレポ全体のタスクを管理しています。

### 基本コマンド

```bash
# docker 起動
docker compose -f ./docker/compose.yaml up -d
# 開発サーバーの起動（すべてのアプリ）
pnpm dev

# ビルド（すべてのアプリ）
pnpm build

# 型チェック
pnpm typecheck

# リンター
pnpm lint
pnpm lint:fix

# コードフォーマット
pnpm format
pnpm format:fix

# すべてのチェック（lint + format + typecheck）
pnpm check

# ワークスペースの依存関係チェック
pnpm lint:ws

# クリーンアップ
pnpm clean            # node_modules削除
pnpm clean:workspaces # 各ワークスペースのクリーンアップ

# docker のクリーンアップ
docker compose -f ./docker/compose.yaml down --volumes
```

### Turboタスク

Turboは以下のタスクを並列実行し、キャッシュを活用して高速化します：

- `build` - アプリケーションのビルド
- `dev` - 開発サーバーの起動
- `lint` - ESLintによるコードチェック
- `format` - Prettierによるコードフォーマット
- `typecheck` - TypeScriptの型チェック

## スクリプト

### MCPサーバーとツールの一括登録

`apps/manager/src/scripts/upsertAll.ts` スクリプトを使用して、MCPサーバーとツールを一括で登録できます。

```bash
cd apps/manager
pnpm exec tsx src/scripts/upsertAll.ts
```

## Docker環境

### 開発環境（Redisのみ）

データベースをDockerで起動する場合：

```bash
cd docker
docker compose up -d
```

### HTTPS対応環境（SSL証明書付きリバースプロキシ）

https-portalを使用したSSL対応の完全な環境を起動する場合：

```bash
docker compose -f ./docker/compose.yaml up -d
```

この設定では以下のサービスが起動します：

- **アプリケーション**: app/proxyServer（ポート8080）
- **HTTPS Portal**:
  - HTTP: http://localhost:80（HTTPSにリダイレクト）
  - HTTPS: https://localhost:443（SSL証明書付き）
  - HTTPS: https://localhost（SSL証明書付き）
