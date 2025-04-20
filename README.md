# Remote MCP Server Manager

複数のMCPサーバーを一元管理し、効率的なAPI管理を実現するためのWebアプリケーションです。

## 主な機能

- 複数のMCPサーバーの一元管理
- サーバーの状態監視と制御
- APIキーの安全な管理
- 統合URLの生成と管理
- ツールの選択的な公開

## 技術スタック

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## セットアップ

1. リポジトリのクローン

```bash
git clone [repository-url]
cd mcp-server-manager
```

2. 依存関係のインストール

```bash
bun install
```

3. 環境変数の設定

```bash
cp .env.test .env
# .envファイルを編集して必要な環境変数を設定
```

4. データベースのセットアップ

```bash
bun db:deploy
```

5. 開発サーバーの起動

```bash
bun dev
```

## スクリプト

### MCPサーバーとツールの一括登録

`src/scripts/upsertAll.ts` スクリプトを使用して、MCPサーバーとツールを一括で登録できます。

```bash
bun run src/scripts/upsertAll.ts
```
