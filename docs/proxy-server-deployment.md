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

> **注意**:
>
> - 初回デプロイ時にGCE用のSSHキーが存在しない場合、自動でSSHキーペアが生成されます。パスフレーズの入力を求められた場合は、空のまま Enter を押すか、任意のパスフレーズを設定してください。
> - **デプロイユーザー**: デフォルトでは `tumiki-deploy` ユーザーでデプロイされます。別のユーザーを使用したい場合は `DEPLOY_USER` 環境変数で指定してください（例：`DEPLOY_USER=production-deploy`）。アプリケーションは `/opt/proxy-server` にデプロイされ、PM2プロセスも指定したユーザーで管理されます。

## クイックスタート

```bash
# 1. ProxyServer ディレクトリに移動
cd apps/proxyServer

# 2. デプロイ実行（Vercelから環境変数を自動取得）
./deploy-to-gce.sh

# 3. 別のユーザーでデプロイ（本番環境用ユーザーを使用）
DEPLOY_USER=production-deploy ./deploy-to-gce.sh

# 4. ドライラン（実際には実行せずに処理内容を確認）
DRY_RUN=true ./deploy-to-gce.sh
```

## デプロイプロセス

スクリプトは以下を自動実行します：

1. **📋 前提条件チェック**: gcloud CLI の確認
2. **🔄 Git操作**: VM上でリポジトリのクローンまたは更新
3. **🔧 依存関係インストール**: VM上でpnpm install
4. **🏗️ @tumiki/db ビルド**: VM上でPrisma クライアント生成とパッケージビルド
5. **📦 ProxyServer ビルド**: VM上でTypeScript のコンパイル
6. **🎁 バンドル作成**: VM上でncc による単一ファイル化（依存関係を含む）
7. **⚙️ 環境変数設定**: テンプレート.envファイル作成（手動設定が必要）
8. **▶️ PM2 起動**: プロセス管理と自動起動設定

## デプロイ先構成

```
/opt/proxy-server/          # Git リポジトリ（プロジェクト全体）
├── .git/                  # Git管理情報
├── apps/
│   └── proxyServer/       # ProxyServerアプリケーション
│       ├── dist/          # nccバンドル済みアプリケーション
│       │   └── index.js   # 単一実行ファイル
│       ├── build/         # TypeScriptビルド結果
│       ├── ecosystem.config.cjs # PM2 設定
│       ├── .env           # 本番環境変数（手動設定）
│       └── logs/          # PM2 ログ（自動作成）
├── packages/
│   └── db/                # Prisma クライアント
│       └── dist/          # ビルド済みPrismaクライアント
└── node_modules/          # 依存関係
```

## 環境変数の管理

環境変数は **手動設定** が必要です。デプロイ後に以下の手順で設定してください：

```bash
# VM に接続
gcloud compute ssh tumiki-deploy@tumiki-instance-20250601 --zone=asia-northeast2-c

# 環境変数ファイルを編集
sudo nano /opt/proxy-server/apps/proxyServer/.env

# 必要な環境変数（例）
DATABASE_URL="postgresql://user:password@host:port/database"
NODE_ENV="production"
PORT="8080"
# その他の必要な環境変数...

# アプリケーション再起動
cd /opt/proxy-server/apps/proxyServer
pm2 restart ecosystem.config.cjs
```

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

### SSH接続

```bash
# SSH 接続（デプロイユーザーで接続）
gcloud compute ssh tumiki-deploy@tumiki-instance-20250601 --zone=asia-northeast2-c

# または別のユーザーで接続
gcloud compute ssh production-deploy@tumiki-instance-20250601 --zone=asia-northeast2-c
```

### PM2管理コマンド

```bash
# アプリケーション状態確認
pm2 status

# ログ確認（リアルタイム）
pm2 logs tumiki-proxy-server

# アプリケーション操作
cd /opt/proxy-server
pm2 restart ecosystem.config.cjs   # 再起動
pm2 start ecosystem.config.cjs     # 開始
pm2 stop ecosystem.config.cjs      # 停止

# リソース監視
pm2 monit

# デプロイ済みアプリケーションの確認
ls -la /opt/proxy-server/          # アプリケーションファイル確認
sudo ls -la /opt/proxy-server/     # 権限が必要な場合
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
gcloud compute ssh tumiki-deploy@tumiki-instance-20250601 --zone=asia-northeast2-c
sudo nano /opt/proxy-server/.env
# 設定ファイルを使用して再起動
cd /opt/proxy-server && pm2 restart ecosystem.config.cjs

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

# モジュールエラーが発生する場合（nccバンドル使用により稀）
# 再デプロイで解決することが多い
./deploy-to-gce.sh

# アプリケーションが起動しない場合
pm2 logs tumiki-proxy-server  # エラーログを確認
pm2 status                    # プロセス状態確認

# 接続できない場合
curl http://localhost:8080/  # VM 内からのアクセステスト
```
