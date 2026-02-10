# Tumiki デプロイメント

## 概要

TumikiはVMホスティングでデプロイされています。

## デプロイ方法

### 本番環境

```bash
# デプロイ（対話式）
pnpm deploy

# 本番環境デプロイ
pnpm deploy:production

# デプロイ確認（実行なし）
pnpm deploy:dry-run
```

### データベースマイグレーション

```bash
cd packages/db
pnpm db:migrate
```

## 環境構成

| 環境 | 用途 |
|------|------|
| Production | 本番環境 |
| Staging | 統合テスト・QA |

## トラブルシューティング

### チェックリスト

- [ ] 環境変数が正しく設定されているか
- [ ] データベース接続情報が正しいか
- [ ] サーバーが起動しているか

## 関連ドキュメント

- [MCP Proxy README](../../apps/mcp-proxy/README.md)
