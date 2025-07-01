# ProxyServer の Google Compute Engine (GCE) へのデプロイ

既存の GCE VM に ProxyServer をデプロイして PM2 で管理する方法です。

## 前提条件

- **Google Cloud SDK (gcloud)** がインストール済み
  ```bash
  # インストール後、認証を実行
  gcloud auth login
  gcloud config set project mcp-server-455206
  ```
- **Vercel CLI** がインストール済み（環境変数取得用）
  ```bash
  npm install -g vercel
  vercel login
  ```
- **既存の GCE VM** が稼働中（自動で環境構築されます）
  - インスタンス名: `tumiki-instance-20250601`
  - ゾーン: `asia-northeast2-c`
  - プロジェクト: `mcp-server-455206`
- **SSH 接続** が可能

> **注意**: 初回デプロイ時にGCE用のSSHキーが存在しない場合、自動でSSHキーペアが生成されます。パスフレーズの入力を求められた場合は、空のまま Enter を押すか、任意のパスフレーズを設定してください。

## クイックスタート

```bash
# 1. ProxyServer ディレクトリに移動
cd apps/proxyServer

# 2. デプロイ実行（Vercelから環境変数を自動取得）
./deploy-to-gce.sh

# 3. ドライラン（実際には実行せずに処理内容を確認）
DRY_RUN=true ./deploy-to-gce.sh
```

## デプロイプロセス

スクリプトは以下を自動実行します：

1. **📋 前提条件チェック**: gcloud, Vercel CLI の確認
2. **🔄 環境変数取得**: Vercel から本番環境変数を自動取得
3. **🔧 依存関係インストール**: pnpm による依存関係の解決
4. **🏗️ @tumiki/db ビルド**: Prisma クライアント生成とパッケージビルド
5. **📦 ProxyServer ビルド**: TypeScript のコンパイル
6. **📁 パッケージ作成**: 必要ファイルの圧縮（環境変数を .env として含める）
7. **🚀 VM デプロイ**: SSH 経由でのファイル転送と環境セットアップ
8. **▶️ PM2 起動**: プロセス管理と自動起動設定

## デプロイ先構成

```
~/proxy-server/              # ホームディレクトリ直下
├── build/                  # ビルド済みアプリケーション
├── packages/               # @tumiki/db など依存パッケージ
├── package.json            # パッケージ設定
├── ecosystem.config.cjs    # PM2 設定
├── .env                   # 本番環境変数（.env.production から自動コピー）
└── logs/                  # PM2 ログ（自動作成）
```

## 環境変数の管理

環境変数は **Vercel** で一元管理されており、デプロイ時に自動取得されます。

すべての必要な環境変数（データベース接続、暗号化キー、APIキーなど）がVercelから自動で取得されます。

## ドライラン機能

デプロイ前に実行内容を確認したい場合は、ドライランモードを使用できます：

```bash
# 実際には実行せずに処理内容を確認
DRY_RUN=true ./deploy-to-gce.sh
```

ドライランでは以下が実行されます：

- 前提条件チェック（実際のコマンド確認）
- 実行予定のコマンドとその説明の表示
- ファイル操作やネットワーク通信は行わない

## 運用管理

```bash
# SSH 接続
gcloud compute ssh tumiki-instance-20250601 --zone=asia-northeast2-c

# アプリケーション状態確認
pm2 status

# ログ確認（リアルタイム）
pm2 logs tumiki-proxy-server

# アプリケーション操作
pm2 restart tumiki-proxy-server    # 再起動
pm2 stop tumiki-proxy-server       # 停止
pm2 start tumiki-proxy-server      # 開始

# リソース監視
pm2 monit
```

## アップデート

コード変更後の更新手順：

```bash
# 同じデプロイコマンドで更新
./deploy-to-gce.sh
```

既存のアプリケーションは自動で停止・更新・再起動されます。

## 環境変数の変更

デプロイ後に環境変数を変更する場合：

```bash
# VM 内で直接編集
gcloud compute ssh tumiki-instance-20250601 --zone=asia-northeast2-c
nano ~/proxy-server/.env
pm2 restart tumiki-proxy-server

# または、Vercelで環境変数を更新してから再デプロイ
./deploy-to-gce.sh
```

## アクセス情報

デプロイ完了後のアクセス先：

- **外部IP**: `34.97.140.159`
- **アクセスURL**: <http://34.97.140.159:8080>
- **ヘルスチェック**: `curl http://34.97.140.159:8080/`

## トラブルシューティング

詳細なトラブルシューティング情報は [デプロイメントガイド](../doc/deployment-guide-gce-direct.md) を参照してください。

**よくある問題**:

```bash
# Google Cloud認証がない場合
gcloud auth login
gcloud config set project mcp-server-455206

# Vercel CLIがない場合
npm install -g vercel
vercel login

# SSH接続でキー生成が必要な場合（初回のみ）
# パスフレーズを求められたら空のままEnterを押すか任意のパスフレーズを設定

# 環境変数ファイルが取得できない場合（手動取得）
cd ../../  # プロジェクトルートに移動
vercel env pull --environment=production apps/proxyServer/.env.production

# デプロイが失敗する場合
ls -la .env.production  # ファイルが存在するか確認

# 依存関係のインストールでエラーが発生する場合
# "Cannot find module 'minimist'" などのエラー
# → スクリプトで --ignore-scripts オプションを使用して回避済み

# アプリケーションが起動しない場合
pm2 logs tumiki-proxy-server  # エラーログを確認

# 接続できない場合
curl http://localhost:8080/  # VM 内からのアクセステスト
```