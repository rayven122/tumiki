# デプロイメント・インフラドキュメント

Tumiki のデプロイメント、インフラストラクチャ、CI/CD 関連のドキュメント。

## 📋 ドキュメント一覧

### CI/CD
- [GitHub Actions Setup](./github-actions-setup.md) - GitHub Actions の設定とワークフロー

### コンテナ化
- [Container Use Guide](../deployment/container-use-guide.md) - Docker コンテナの利用ガイド

## 🚀 デプロイメント戦略

### 環境構成
- **開発環境**: ローカル Docker Compose
- **ステージング環境**: Vercel Preview
- **本番環境**: Vercel + PM2

### デプロイフロー
1. **開発**: feature ブランチで開発
2. **レビュー**: プルリクエスト + 自動テスト
3. **ステージング**: Preview デプロイで確認
4. **本番**: main ブランチへマージで自動デプロイ

## 🏗️ インフラストラクチャ

### ホスティング
- **フロントエンド**: Vercel
- **API/バックエンド**: Vercel Functions
- **ProxyServer**: PM2 on VPS
- **データベース**: PostgreSQL (Supabase/Neon)

### モニタリング
- PM2 モニタリング
- Vercel Analytics
- エラートラッキング

## 🔄 CI/CD パイプライン

### GitHub Actions
- **PR チェック**: Lint, Format, Typecheck, Test
- **Claude Code Review**: 自動コードレビュー
- **デプロイ**: main ブランチへの自動デプロイ

### 品質ゲート
- コードカバレッジ 100%
- 型チェック通過
- Lint/Format 準拠
- セキュリティスキャン

## 📦 コンテナ戦略

### Docker 構成
- 開発用 Docker Compose
- マルチステージビルド
- 最小権限原則

### オーケストレーション
- PM2 によるプロセス管理
- 自動再起動・スケーリング
- ヘルスチェック