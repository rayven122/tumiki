# 運用・デプロイドキュメント

このディレクトリには、Tumiki MCP Managerの本番環境運用とデプロイに関するドキュメントが含まれています。

## 📂 ドキュメント一覧

### デプロイメント

- [proxy-server-deployment.md](./proxy-server-deployment.md) - ProxyServerのデプロイ手順
  - GCPへのデプロイ
  - PM2設定
  - ヘルスチェック設定
  - ロードバランサー設定

### システム運用

- [mailer.md](./mailer.md) - メール送信システムの設定
  - SMTPサーバー設定
  - テンプレート管理
  - 送信ログ監視
  - エラーハンドリング

- [script.md](./script.md) - 運用スクリプトの使用方法
  - データベースメンテナンス
  - バックアップスクリプト
  - ログローテーション
  - 定期実行タスク

## 🚀 デプロイメントフロー

### 本番環境デプロイ

```bash
# 1. 本番ブランチへマージ
git checkout main
git merge develop

# 2. タグ付け
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 3. デプロイ実行
# Vercel（フロントエンド）
vercel --prod

# GCP（ProxyServer）
./deploy-to-gce.sh
```

### ステージング環境

```bash
# developブランチから自動デプロイ
git push origin develop
```

## 📊 監視・モニタリング

### メトリクス監視

- **アプリケーションメトリクス**
  - レスポンスタイム
  - エラーレート
  - スループット

- **インフラメトリクス**
  - CPU使用率
  - メモリ使用率
  - ディスク使用率

### ログ管理

```bash
# ProxyServerログ確認
pm2 logs proxy-server

# アプリケーションログ
tail -f /var/log/tumiki/app.log

# エラーログ
tail -f /var/log/tumiki/error.log
```

## 🔧 メンテナンス

### 定期メンテナンス

1. **週次タスク**
   - ログファイルのローテーション
   - 一時ファイルのクリーンアップ
   - セキュリティパッチの確認

2. **月次タスク**
   - データベースの最適化
   - バックアップの検証
   - パフォーマンスレビュー

### バックアップ

```bash
# データベースバックアップ
pg_dump -h localhost -U postgres tumiki > backup_$(date +%Y%m%d).sql

# ファイルバックアップ
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz /var/tumiki/uploads
```

## 🚨 障害対応

### インシデント対応フロー

1. **検知**
   - 監視アラート
   - ユーザー報告

2. **初期対応**
   - 影響範囲の確認
   - 一時対処の実施

3. **根本対応**
   - 原因調査
   - 恒久対策の実施

4. **事後対応**
   - ポストモーテム作成
   - 再発防止策の実装

### ロールバック手順

```bash
# Vercelのロールバック
vercel rollback

# ProxyServerのロールバック
pm2 deploy production revert 1
```

## 📈 パフォーマンスチューニング

### データベース最適化

- インデックスの追加・削除
- クエリの最適化
- パーティショニング

### アプリケーション最適化

- キャッシュ戦略
- CDN設定
- 画像最適化

## 🔗 関連ドキュメント

- [アーキテクチャ設計](../architecture/README.md)
- [開発ガイド](../development/README.md)
- [セキュリティガイド](../security/README.md)