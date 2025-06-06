# Tumiki

複数のMCPサーバーを一元管理し、効率的なAPI管理を実現するためのWebアプリケーションです。

## 主な機能

- 複数のMCPサーバーの一元管理
- サーバーの状態監視と制御
- APIキーの安全な管理
- 統合URLの生成と管理
- ツールの選択的な公開

## プロジェクト構造

このプロジェクトはTurboを使用したモノレポ構造になっています。

```
tumiki/
├── apps/
│   └── manager/          # メインのWebアプリケーション（Next.js）
├── packages/             # 共有パッケージ
├── tooling/              # 開発ツール設定
│   ├── eslint/          # ESLint設定
│   ├── prettier/        # Prettier設定
│   ├── tailwind/        # Tailwind CSS設定
│   └── typescript/      # TypeScript設定
└── docker/              # Docker設定
```

## 技術スタック

- [Next.js](https://nextjs.org) - Reactフレームワーク
- [NextAuth.js](https://next-auth.js.org) - 認証
- [Prisma](https://prisma.io) - ORM
- [Drizzle](https://orm.drizzle.team) - データベースツールキット
- [Tailwind CSS](https://tailwindcss.com) - CSSフレームワーク
- [tRPC](https://trpc.io) - 型安全API
- [Turbo](https://turbo.build/repo) - モノレポビルドシステム

## セットアップ

1. リポジトリのクローン

```bash
git clone [repository-url]
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
pnpm run dev
```

## 開発コマンド

このプロジェクトではTurboを使用してモノレポ全体のタスクを管理しています。

### 基本コマンド

```bash
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

---

#　TODO: 以下削除予定

## スクリプト

### MCPサーバーとツールの一括登録

`apps/manager/src/scripts/upsertAll.ts` スクリプトを使用して、MCPサーバーとツールを一括で登録できます。

```bash
cd apps/manager
pnpm exec tsx src/scripts/upsertAll.ts
```

### mcp server

- sse endpoint: `/sse`
- streamable Http: `/mcp`

SSE ローカル検証例

```bash
cd docker
docker compose up -d
REDIS_URL=redis://localhost:6379 pnpm run dev

npx @modelcontextprotocol/inspector
# http://localhost:3000/sse
```
