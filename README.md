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
cd apps/proxyServer && pnpm run dev # ProxyServer（ポート８０８０）
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
```

### Turboタスク

Turboは以下のタスクを並列実行し、キャッシュを活用して高速化します：

- `build` - アプリケーションのビルド
- `dev` - 開発サーバーの起動
- `lint` - ESLintによるコードチェック
- `format` - Prettierによるコードフォーマット
- `typecheck` - TypeScriptの型チェック

## Docker環境

### HTTPS対応（SSL証明書付きリバースプロキシ）

https-portalを使用したSSL対応の完全な環境を起動する場合：

#### 開発環境（ローカルSSL）

ローカル開発で自己署名証明書を使用する場合：

```bash
docker compose -f ./docker/compose.dev.yaml up -d
```

- **ドメイン**: https://local-server.tumiki.cloud
- **証明書**: 自己署名証明書（STAGEが"local"）
- **アクセス**: https://local-server.tumiki.cloud でプロキシサーバー（ポート8080）にアクセス

#### 本番環境（Let's Encrypt SSL）

本番環境でLet's Encryptの証明書を使用する場合：

```bash
docker compose -f ./docker/compose.prod.yaml up -d
```

- **ドメイン**: https://server.tumiki.cloud
- **証明書**: Let's Encrypt自動取得（STAGEが"production"）
- **アクセス**: https://server.tumiki.cloud でプロキシサーバー（ポート8080）にアクセス

#### 停止とクリーンアップ

```bash
# 開発環境の停止
docker compose -f ./docker/compose.dev.yaml down

# 本番環境の停止
docker compose -f ./docker/compose.prod.yaml down
```

## プロダクション デプロイメント

### ProxyServer の Google Compute Engine (GCE) へのデプロイ

ProxyServer を既存の GCE VM にデプロイして PM2 で管理する詳細な手順は、専用のドキュメントを参照してください。

📖 **[ProxyServer デプロイメントガイド](./docs/proxy-server-deployment.md)**

#### クイックスタート

```bash
# ProxyServer ディレクトリに移動
cd apps/proxyServer

# デプロイ実行
./deploy-to-gce.sh

# ドライラン（実行内容の確認）
DRY_RUN=true ./deploy-to-gce.sh
```

デプロイメントガイドには以下の詳細情報が含まれています：
- 前提条件とセットアップ
- デプロイプロセスの詳細説明
- 運用管理コマンド
- トラブルシューティング
- 環境変数管理
- ドライラン機能の使用方法
