# Tumiki プロジェクト構造

## モノレポ構造（Turbo使用）

```
tumiki/
├── apps/                      # アプリケーション
│   ├── manager/              # Next.js 15 Webアプリ（メイン管理画面）
│   │   ├── src/
│   │   │   ├── app/         # App Router
│   │   │   ├── server/      # tRPC API
│   │   │   ├── components/  # UIコンポーネント
│   │   │   └── schema/      # 型定義（branded types）
│   │   └── public/
│   └── mcp-proxy/            # Hono MCPプロキシサーバー (Cloud Run対応)
│       ├── src/
│       │   └── index.ts     # メインエントリーポイント
│
├── packages/                  # 共有パッケージ
│   ├── db/                  # Prisma データベース
│   │   └── prisma/
│   │       └── schema/      # 分割されたスキーマファイル
│   │           ├── base.prisma
│   │           ├── auth.prisma
│   │           ├── mcpServer.prisma
│   │           ├── userMcpServer.prisma
│   │           ├── organization.prisma
│   │           ├── chat.prisma
│   │           ├── apiKey.prisma
│   │           └── waitingList.prisma
│   ├── auth/                # Auth0認証パッケージ
│   ├── utils/               # 共通ユーティリティ関数
│   ├── mailer/              # メール送信機能
│   └── scripts/             # データベーススクリプト
│
├── tooling/                  # 開発ツール設定
│   ├── eslint/              # ESLint設定
│   ├── prettier/            # Prettier設定
│   ├── tailwind/            # Tailwind CSS設定
│   ├── typescript/          # TypeScript設定
│   ├── github/              # GitHub Actions設定
│   └── vitest/              # Vitestテスト設定
│
├── docker/                   # Docker設定
│   ├── compose.yaml         # 開発環境
│   └── compose.prod.yaml    # 本番環境（Let's Encrypt）
│
├── scripts/                  # プロジェクトレベルスクリプト
│   ├── deploy-all.sh        # 統合デプロイメント
│   ├── vercel-env-push.sh   # Vercel環境変数管理
│   └── verify-stripe-env.ts # Stripe設定検証
│
├── docs/                     # ドキュメント
│   ├── operations/          # 運用ガイド
│   ├── development/         # 開発ガイド
│   └── proxy-server-deployment.md
│
└── 設定ファイル
    ├── .env                 # 環境変数
    ├── .mcp.json           # MCP設定
    ├── turbo.json          # Turboビルド設定
    ├── pnpm-workspace.yaml # pnpmワークスペース
    ├── vitest.workspace.ts # Vitestワークスペース
    ├── package.json        # ルートパッケージ
    ├── tsconfig.json       # TypeScript設定
    ├── CLAUDE.md           # Claude Code用ガイド
    ├── README.md           # プロジェクト説明
    └── SETUP.md            # セットアップガイド
```

## 主要ディレクトリの役割

### apps/manager
- Next.js 15 + React 19のWebアプリケーション
- MCPサーバーの管理UI
- tRPCによるバックエンドAPI
- Auth0認証統合
- 多言語対応（英語/日本語）

### apps/mcp-proxy
- 複数のリモートMCPサーバーを統合するプロキシ
- HTTP/JSON-RPC 2.0対応
- ステートレス設計（Cloud Run最適化）
- 軽量フレームワークHonoを使用

### packages/db
- Prisma ORMによるデータベース管理
- スキーマは機能別に分割
- フィールドレベル暗号化対応
- 型定義の自動生成

### packages/auth
- Auth0統合認証
- JWT管理
- セッション管理
- ロールベースアクセス制御

## ビルドシステム
- Turboによる並列ビルド
- キャッシュによる高速化
- 依存関係の自動解決
- ワークスペース間の型共有

## デプロイメント構成
- Manager App → Vercel
- ProxyServer → Google Compute Engine
- Database → Neon (PostgreSQL)
- Redis → クラウドサービス

## 開発フロー
1. `pnpm dev`で全サービス起動
2. 変更はホットリロード
3. `pnpm check`でコード品質確認
4. `pnpm test`でテスト実行
5. `pnpm build`でビルド確認