# ProxyServer の Google Compute Engine (GCE) へのデプロイ

Tumiki ProxyServerをGCE VMにGitベースでデプロイして PM2 で管理する方法です。

## 前提条件

### 必須ツール

- **Google Cloud SDK (gcloud)** がインストール済み
  ```bash
  # インストール後、認証を実行
  gcloud auth login
  gcloud config set project mcp-server-455206
  ```
- **Vercel CLI** がインストール済み

  ```bash
  # インストール
  npm install -g vercel

  # 認証
  vercel login

  # プロジェクトリンク（プロジェクトルートで実行）
  vercel link
  ```

- **Git** がインストール済み
- **既存の GCE VM** が稼働中
  - インスタンス名: `tumiki-instance-20250601`
  - ゾーン: `asia-northeast2-c`
  - プロジェクト: `mcp-server-455206`
- **SSH 接続** が可能

## 初回セットアップ（rootユーザーで実行）

VM上で以下の初回セットアップを**一度だけ**実行してください：

### 1. デプロイディレクトリの作成と権限設定

```bash
# デプロイディレクトリを作成してデプロイユーザーの所有に設定
sudo mkdir -p /opt/tumiki
sudo chown tumiki-deploy:tumiki-deploy /opt/tumiki
```

### 2. デプロイユーザーにSSHキーをコピー

既存のユーザーのSSHキーをデプロイユーザーにコピーします：

```bash
# デプロイユーザーの.sshディレクトリを作成
sudo mkdir -p /home/tumiki-deploy/.ssh

# 既存ユーザーのSSHキーをコピー
sudo cp /home/techneighbor122/.ssh/id_ed25519* /home/tumiki-deploy/.ssh/
sudo cp /home/techneighbor122/.ssh/known_hosts /home/tumiki-deploy/.ssh/

# 所有者と権限を正しく設定
sudo chown -R tumiki-deploy:tumiki-deploy /home/tumiki-deploy/.ssh
sudo chmod 700 /home/tumiki-deploy/.ssh
sudo chmod 600 /home/tumiki-deploy/.ssh/id_ed25519
sudo chmod 644 /home/tumiki-deploy/.ssh/id_ed25519.pub
sudo chmod 644 /home/tumiki-deploy/.ssh/known_hosts
```

### 3. PM2の自動起動設定

```bash
# PM2の自動起動を設定
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u tumiki-deploy --hp /home/tumiki-deploy

# 設定完了後、デプロイユーザーで実行（後でpm2 saveが必要）
```

### 4. 設定確認

```bash
# デプロイユーザーに切り替えて確認
su - tumiki-deploy

# GitHubへのSSH接続テスト
ssh -T git@github.com
# 成功メッセージ: "Hi username! You've successfully authenticated..."

# ディレクトリの権限確認
ls -la /opt/tumiki
```

## デプロイの実行

### クイックスタート

```bash
# 1. ProxyServer ディレクトリに移動
cd apps/proxyServer

# 2. デプロイ実行
./deploy-to-gce.sh

# 3. ドライラン（実際には実行せずに処理内容を確認）
DRY_RUN=true ./deploy-to-gce.sh
# または
./deploy-to-gce.sh --dry-run

# 4. ヘルプ表示
./deploy-to-gce.sh --help
```

### 環境変数でのカスタマイズ

```bash
# 別のユーザーでデプロイ
DEPLOY_USER=production-deploy ./deploy-to-gce.sh

# 別のインスタンスにデプロイ
INSTANCE_NAME=my-instance ZONE=asia-northeast1-a ./deploy-to-gce.sh

# 別のプロジェクトにデプロイ
PROJECT_ID=my-project ./deploy-to-gce.sh

# 別のリポジトリからデプロイ
REPO_URL=git@github.com:myorg/myrepo.git ./deploy-to-gce.sh

# 別のデプロイパスを使用
REMOTE_PATH=/opt/myapp ./deploy-to-gce.sh
```

## デプロイプロセス

スクリプトは以下の処理を自動実行します：

1. **📋 前提条件チェック**

   - gcloud CLI の確認
   - Google Cloud 認証の確認
   - Git の確認
   - Vercel CLI の確認
   - Vercel 認証の確認
   - プロジェクトのVercelリンク確認
   - GCE インスタンスの存在確認

2. **🌍 Vercelから環境変数取得**

   - Vercelから本番環境の環境変数を取得
   - `.env` ファイルの作成
   - 環境変数ファイルのVMへの転送

3. **🔐 VM上でのSSH接続とキー確認**

   - デプロイユーザーのSSHキー確認
   - GitHubへのSSH接続テスト

4. **⚙️ 環境セットアップ**

   - Node.js 22.x の確認・インストール
   - pnpm の確認・インストール
   - PM2 の確認・インストール
   - Git の確認・インストール

5. **🔄 Git操作**

   - 既存リポジトリの更新 または 新規クローン
   - mainブランチへのリセット
   - 作業ツリーのクリーンアップ

6. **📦 依存関係とビルド**

   - `pnpm install` の実行（frozen-lockfile優先）
   - `@tumiki/db` パッケージのビルド
   - ProxyServer のビルド

7. **🌍 環境変数設定**

   - 転送された `.env` ファイルの配置
   - テンプレートファイルの作成（存在しない場合）

8. **▶️ PM2でアプリケーション起動**
   - 既存アプリケーションの停止
   - `ecosystem.config.cjs` を使用した起動
   - PM2設定の保存

## 環境変数の管理

### Vercelベースの環境変数管理

デプロイスクリプトは**Vercelから自動的に本番環境の環境変数を取得**します：

```bash
# スクリプトが自動実行するコマンド
vercel env pull --environment=production apps/proxyServer/.env
```

### 手動での環境変数設定

Vercelからの環境変数取得に失敗した場合、手動で設定できます：

```bash
# VM に接続
gcloud compute ssh tumiki-deploy@tumiki-instance-20250601 --zone=asia-northeast2-c --project=mcp-server-455206

# 環境変数ファイルを編集
nano /opt/tumiki/apps/proxyServer/.env
```

### 必要な環境変数

```bash
# 本番環境用環境変数
DATABASE_URL="postgresql://user:password@host:port/database"
NODE_ENV="production"
PORT="8080"

# その他の必要な環境変数を追加...
```

### Vercel環境変数の更新

Vercel上で環境変数を更新した場合、再デプロイで最新の値が取得されます：

```bash
# 最新の環境変数で再デプロイ
cd apps/proxyServer
./deploy-to-gce.sh
```

### 設定変更後の再起動

```bash
# アプリケーション再起動
cd /opt/tumiki/apps/proxyServer
pm2 restart ecosystem.config.cjs
```

## 運用管理

### SSH接続

```bash
# デプロイユーザーでSSH接続
gcloud compute ssh tumiki-deploy@tumiki-instance-20250601 --zone=asia-northeast2-c --project=mcp-server-455206
```

### PM2管理コマンド

```bash
# アプリケーション状態確認
pm2 status

# ログ確認（リアルタイム）
pm2 logs tumiki-proxy-server

# アプリケーション操作
pm2 restart tumiki-proxy-server   # 再起動
pm2 stop tumiki-proxy-server      # 停止
pm2 start ecosystem.config.cjs    # 開始

# リソース監視
pm2 monit

# 保存された設定を確認
pm2 save
```

### アプリケーションの確認

```bash
# アプリケーションファイル確認
ls -la /opt/tumiki/apps/proxyServer/

# 環境変数ファイル確認
cat /opt/tumiki/apps/proxyServer/.env

# ビルド結果確認
ls -la /opt/tumiki/apps/proxyServer/dist/

# ログファイル確認
ls -la ~/.pm2/logs/

# プロセス確認
ps aux | grep node

# Git状態確認
cd /opt/tumiki
git log -1 --format='%h %s'  # 現在のコミット
git status                   # Git作業ツリー状態
```

## アップデート

コード変更後の更新は同じデプロイコマンドで実行できます：

```bash
# 最新コードで更新
./deploy-to-gce.sh
```

既存のアプリケーションは自動で：

1. 停止
2. 最新コードに更新
3. 再ビルド
4. 再起動

## トラブルシューティング

### よくある問題と解決方法

**1. Vercel環境変数取得エラー**

```bash
# Vercel認証確認
vercel whoami

# プロジェクトリンク確認
ls -la .vercel/project.json

# 手動で環境変数取得
cd プロジェクトルート
vercel env pull --environment=production apps/proxyServer/.env
```

**2. SSH接続エラー**

```bash
# GitHubへの接続確認
ssh -T git@github.com

# SSHキーの権限確認
ls -la ~/.ssh/

# SSHキーが存在しない場合
ssh-keygen -t ed25519 -C 'deploy@tumiki.local'
cat ~/.ssh/id_ed25519.pub  # GitHub に追加
```

**3. 権限エラー**

```bash
# デプロイディレクトリの所有者確認
ls -la /opt/tumiki

# 必要に応じて権限修正（rootユーザーで）
sudo chown -R tumiki-deploy:tumiki-deploy /opt/tumiki
```

**4. ビルドエラー**

```bash
# Node.jsバージョン確認
node --version  # 22.x が必要

# pnpmバージョン確認
pnpm --version

# メモリ不足の場合
export NODE_OPTIONS='--max-old-space-size=4096'

# 依存関係を再インストール
cd /opt/tumiki
rm -rf node_modules packages/*/node_modules apps/*/node_modules
pnpm install --no-frozen-lockfile

# 段階的ビルド
cd packages/db
pnpm db:generate
pnpm build
cd ../../apps/proxyServer
pnpm build
```

**5. PM2エラー**

```bash
# PM2プロセス確認
pm2 status

# PM2を完全リセット
pm2 delete tumiki-proxy-server
pm2 kill
pm2 start ecosystem.config.cjs
pm2 save

# 自動起動設定確認
sudo systemctl status pm2-tumiki-deploy

# PM2自動起動の再設定（rootユーザーで）
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u tumiki-deploy --hp /home/tumiki-deploy
```

**6. アプリケーションが起動しない**

```bash
# 詳細ログ確認
pm2 logs tumiki-proxy-server --lines 50

# 環境変数確認
cat /opt/tumiki/apps/proxyServer/.env
echo "環境変数の数: $(grep -c '^[^#]' /opt/tumiki/apps/proxyServer/.env)"

# ビルド結果確認
ls -la /opt/tumiki/apps/proxyServer/dist/

# 手動起動テスト
cd /opt/tumiki/apps/proxyServer
node dist/index.js

# データベース接続テスト
cd /opt/tumiki/packages/db
pnpm db:migrate
```

### ログの確認

```bash
# PM2ログ
pm2 logs tumiki-proxy-server

# システムログ
sudo journalctl -u pm2-tumiki-deploy -f

# アプリケーションログ（アプリケーション固有）
tail -f /opt/tumiki/apps/proxyServer/logs/*.log
```

## デプロイ設定

### デフォルト設定値

```bash
INSTANCE_NAME="tumiki-instance-20250601"
ZONE="asia-northeast2-c"
PROJECT_ID="mcp-server-455206"
REMOTE_PATH="/opt/tumiki"
DEPLOY_USER="tumiki-deploy"
REPO_URL="git@github.com:rayven122/tumiki.git"
CURRENT_BRANCH="main"
```

## アクセス情報

デプロイ完了後のアクセス先：

- **アクセスURL**: デプロイ完了時に表示される外部IP:8080
- **ヘルスチェック**: `curl http://外部IP:8080/health`
- **SSH接続**: `gcloud compute ssh tumiki-deploy@tumiki-instance-20250601 --zone=asia-northeast2-c --project=mcp-server-455206`

## セキュリティ注意事項

- SSHキーは適切な権限（600）で保護されています
- デプロイユーザーは最小権限で運用されます
- 環境変数はVercelから自動取得されるため、Vercelアカウントのセキュリティを確保してください
- 環境変数ファイルには機密情報が含まれるため、適切にアクセス制御してください
- PM2は systemd サービスとして自動起動設定されています
- GitHubへのSSH接続にはデプロイ専用のSSHキーを使用してください
