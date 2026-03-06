# Tumiki デプロイメント

## 概要

TumikiはVMホスティングでデプロイされています。

## デプロイ方法

### 本番環境

VMへのデプロイは手動で行います。

```bash
# アプリケーションのビルド
pnpm build

# サーバー起動
pnpm start
```

### データベースマイグレーション

```bash
cd packages/db
pnpm db:migrate   # マイグレーション実行
pnpm db:deploy    # 本番環境へ適用
```

## 環境構成

| 環境 | 用途 |
|------|------|
| Production | 本番環境 |
| Staging | 統合テスト・QA |

## 環境変数

本番環境では以下の環境変数が必要です：

- `DATABASE_URL` - PostgreSQL接続URL
- `REDIS_URL` - Redis接続URL
- `NODE_ENV` - `production`

詳細は `.env.example` を参照してください。

## トラブルシューティング

### チェックリスト

- [ ] 環境変数が正しく設定されているか
- [ ] データベース接続情報が正しいか
- [ ] サーバーが起動しているか
- [ ] ポートが開放されているか

### ログ確認

```bash
# アプリケーションログ
pm2 logs  # PM2使用時
```

## 関連ドキュメント

- [MCP Proxy README](../../apps/mcp-proxy/README.md)
