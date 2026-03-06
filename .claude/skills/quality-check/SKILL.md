---
name: quality-check
description: |
  品質チェック実行ガイド。コード実装完了後、コミット前、PR作成前に使用。
---

# 品質チェック

## コマンド一覧

| 順序 | コマンド          | 目的                       |
| ---- | ----------------- | -------------------------- |
| 1    | `pnpm format:fix` | コードフォーマット自動修正 |
| 2    | `pnpm lint:fix`   | Lintエラー自動修正         |
| 3    | `pnpm typecheck`  | TypeScript型チェック       |
| 4    | `pnpm build`      | 本番ビルド確認             |
| 5    | `pnpm test`       | ユニットテスト実行         |

順序通りに実行し、各ステップの成功/失敗を報告する。

## クイックモード

ビルド・テストをスキップする場合：

```bash
pnpm format:fix && pnpm lint:fix && pnpm typecheck
```

## エラー対応

- **型チェックエラー**: `@tumiki/` パッケージのエラーは `cd packages/db && pnpm build` で解決
- **テストエラー（DB関連）**: `docker compose -f ./docker/compose.yaml up -d db-test && cd packages/db && pnpm db:push:test`
- **CI環境変数エラー**: 開発時は無視可能
