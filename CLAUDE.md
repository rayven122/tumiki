# CLAUDE.md

## 最重要ルール

**新規機能実装時は、既存の実装方針・設計に必ず合わせること。過去のコードの記法を真似て、一貫性を保つ。**

## プロジェクト構造

| ディレクトリ | 役割 |
|------------|------|
| `apps/manager` | Next.js管理画面（RSC + tRPC） |
| `apps/mcp-proxy` | MCPプロキシサーバー |
| `packages/mcp-core-proxy` | MCPプロキシの再利用可能コアパッケージ（CLI/API 共通実装） |
| `packages/db` | Prismaスキーマ・クライアント |
| `packages/ui` | 共通UIコンポーネント |

## コマンド

| コマンド | 用途 |
|---------|------|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm check` | lint + format + typecheck |
| `pnpm test` | テスト実行 |
| `pnpm docker:up` | Docker環境起動 |

## ツール利用ルール

1. **skills・agents・MCPツールを積極的に利用**
2. **GitHubアクセスは`gh`コマンドを使用**
3. **Web検索は最終手段**

## 機能別スキル参照

| 作業 | 参照スキル |
|-----|----------|
| API実装 | `tumiki-api-patterns` |
| DB変更 | `tumiki-prisma-schema-changes` |
| manager開発 | `tumiki-manager` |
| mcp-proxy開発 | `tumiki-mcp-proxy-architecture` |

## Git Hooks (prek)

prek で Git フック自動管理。`pnpm install` 時に自動インストール。

- **pre-commit**: lint + format（turboキャッシュで高速）
- **pre-push**: typecheck + test

スキップ: `git commit --no-verify` / `git push --no-verify`

## 実装後の必須アクション

**⚠️ CRITICAL: コミット・PR作成前に必ず実行すること**

1. **品質チェック**: `quality-check` スキルを必ず実行
   - `pnpm format:fix` - コードフォーマット自動修正
   - `pnpm lint:fix` - Lintエラー自動修正
   - `pnpm typecheck` - TypeScript型チェック
   - CIで失敗する前にローカルで必ず実行する
2. **tumiki-code-simplifier実行**: コード簡素化
