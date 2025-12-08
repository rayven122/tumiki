# Tumiki

複数のMCPサーバーを一元管理し、効率的なAPI管理を実現するためのWebアプリケーションです。

## 🚀 クイックスタート

初回セットアップの詳細な手順については、[docs/SETUP.md](./docs/SETUP.md) を参照してください。

### Docker開発環境

開発に必要なDockerコンテナ（PostgreSQL、Redis、Keycloak）を管理：

```bash
# すべてのコンテナを起動（初回は2-3分かかります）
pnpm docker:up

# コンテナを停止
pnpm docker:stop

# コンテナを削除
pnpm docker:down
```

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
│   ├── desktop/          # Electronデスクトップアプリケーション
│   ├── manager/          # Next.js 15 + React 19 Webアプリケーション
│   └── mcp-proxy/        # MCPサーバープロキシ（Hono + Cloud Run）
├── packages/             # 共有パッケージ
│   ├── auth/            # Keycloak 認証パッケージ
│   ├── db/              # Prisma データベースパッケージ
│   ├── mailer/          # メール送信機能
│   ├── oauth-token-manager/ # OAuth トークン管理
│   ├── scripts/         # データベーススクリプト
│   └── utils/           # 共通ユーティリティ
├── tooling/              # 開発ツール設定
│   ├── eslint/          # ESLint設定
│   ├── prettier/        # Prettier設定
│   ├── tailwind/        # Tailwind CSS設定
│   ├── typescript/      # TypeScript設定
│   └── vitest/          # Vitest設定
└── docker/              # Docker Compose設定
```

## 技術スタック

### Manager（Webアプリケーション）

- [Next.js 15](https://nextjs.org) - React 19 + App Router
- [tRPC](https://trpc.io) - 型安全API
- [Tailwind CSS](https://tailwindcss.com) - CSSフレームワーク
- [Radix UI](https://www.radix-ui.com/) - UIコンポーネントライブラリ
- [Keycloak](https://www.keycloak.org) - 認証・認可
- [Vercel AI SDK](https://sdk.vercel.ai) - AI統合

### ProxyServer（MCPプロキシ）

- [Hono](https://hono.dev) - Webフレームワーク
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP SDK
- HTTP/Streamable transport - リアルタイム通信

### データベース・認証

- [PostgreSQL](https://postgresql.org) - メインデータベース
- [Prisma](https://prisma.io) - ORM + フィールド暗号化
- [Neon](https://neon.tech) - PostgreSQL ホスティング
- [Redis](https://redis.io) - キャッシュ・セッション管理

### 開発・運用

- [Turbo](https://turbo.build/repo) - モノレポビルドシステム
- [TypeScript](https://www.typescriptlang.org) - 型安全性
- [ESLint](https://eslint.org) - コード品質
- [Prettier](https://prettier.io) - コードフォーマット
- [Docker](https://docker.com) - コンテナ化
- [GitHub Actions](https://github.com/features/actions) - CI/CD

## アプリケーション

### Manager（Webアプリケーション）

MCPサーバーの管理画面を提供するNext.js 15 + React 19アプリケーション。

- **開発URL**: <http://localhost:3000>
- **機能**: MCPサーバー設定・監視、APIキー管理、ChatGPT風チャット、Keycloak認証、多言語対応

### ProxyServer（MCPプロキシ）

複数のMCPサーバーを単一エンドポイントで統合するプロキシサーバー。

- **開発URL**: <http://localhost:8080>
- **エンドポイント**:
  - `POST /mcp/:mcpServerId` - MCP JSON-RPC 2.0
  - `GET /health` - ヘルスチェック

## Dockerサービス構成

すべてのサービスは `docker/compose.yaml` で管理されています。

- **PostgreSQL**: ポート 5434（本番）/ 5435（テスト）
- **Redis**: ポート 6379
- **Keycloak**: ポート 8443

## 開発コマンド

### 基本操作

```bash
pnpm install  # 依存関係インストール
pnpm dev      # 開発サーバー起動
pnpm build    # ビルド
pnpm start    # 本番サーバー起動
```

### コード品質

```bash
pnpm check        # 全品質チェック（lint + format + typecheck）
pnpm lint:fix     # Lint自動修正
pnpm format:fix   # フォーマット自動修正
pnpm typecheck    # 型チェック
pnpm test         # テスト実行
```

### データベース操作

```bash
cd packages/db
pnpm db:migrate   # マイグレーション実行
pnpm db:deploy    # 本番環境にデプロイ
pnpm db:studio    # Prisma Studio起動
```

### Docker操作

```bash
pnpm docker:up    # コンテナ起動
pnpm docker:stop  # コンテナ停止
pnpm docker:down  # コンテナ削除
```

## デプロイメント

GitHub Actionsによる自動デプロイ（`main`ブランチ → Production、PRブランチ → Preview）

### 環境URL

**Manager (Vercel)**:

- Production: <https://www.tumiki.cloud>
- Staging: <https://stg.tumiki.cloud>

**ProxyServer (Cloud Run)**:

- Production: <https://mcp.tumiki.cloud>
- Staging: <https://stg-mcp.tumiki.cloud>
