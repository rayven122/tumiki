# MCP Server Manager

Minecraftサーバーの管理を行うためのWebアプリケーションです。

## 技術スタック

- [Next.js](https://nextjs.org) - Reactフレームワーク
- [NextAuth.js](https://next-auth.js.org) - 認証システム
- [Prisma](https://prisma.io) - ORM
- [tRPC](https://trpc.io) - 型安全なAPI
- [Tailwind CSS](https://tailwindcss.com) - スタイリング
- [Bun](https://bun.sh) - ランタイム/パッケージマネージャー

## 開発環境のセットアップ

1. リポジトリをクローン
```bash
git clone [repository-url]
cd mcp-server-manger
```

2. 依存関係のインストール
```bash
bun install
```

3. 環境変数の設定
`.env.example`をコピーして`.env`を作成し、必要な環境変数を設定してください。

4. データベースのセットアップ
```bash
bun run db:generate
bun run db:push
```

5. 開発サーバーの起動
```bash
bun run dev
```

## 利用可能なスクリプト

- `bun run dev` - 開発サーバーを起動
- `bun run build` - プロダクションビルド
- `bun run start` - プロダクションサーバーを起動
- `bun run db:generate` - Prismaマイグレーションの生成
- `bun run db:push` - データベーススキーマの更新
- `bun run db:studio` - Prisma Studioを起動
- `bun run check` - コードの静的解析
- `bun run typecheck` - TypeScriptの型チェック

## プロジェクト構造

```
mcp-server-manger/
├── src/            # ソースコード
├── prisma/         # データベーススキーマ
├── public/         # 静的ファイル
├── doc/            # ドキュメント
└── .vscode/        # VSCode設定
```

## ライセンス

[MIT License](LICENSE)
