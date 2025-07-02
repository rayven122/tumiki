#!/bin/bash
set -euo pipefail

# =============================================================================
# Tumiki ProxyServer - Gitベースデプロイメントスクリプト
# =============================================================================
#
# 使用方法:
#   ./deploy-to-gce.sh           # 通常のデプロイ
#   DRY_RUN=true ./deploy-to-gce.sh  # ドライラン（実際には実行しない）
#
# 環境変数:
#   INSTANCE_NAME  - GCEインスタンス名 (デフォルト: tumiki-instance-20250601)
#   ZONE          - GCEゾーン (デフォルト: asia-northeast2-c)
#   PROJECT_ID    - GCEプロジェクトID (デフォルト: mcp-server-455206)
#   REMOTE_PATH   - デプロイ先パス (デフォルト: /opt/proxy-server)
#   DEPLOY_USER   - デプロイ用ユーザー (デフォルト: tumiki-deploy)
#   DRY_RUN       - ドライランモード (デフォルト: false)
#
# =============================================================================

# 設定変数
INSTANCE_NAME="${INSTANCE_NAME:-tumiki-instance-20250601}"
ZONE="${ZONE:-asia-northeast2-c}"
PROJECT_ID="${PROJECT_ID:-mcp-server-455206}"
REMOTE_PATH="${REMOTE_PATH:-/opt/proxy-server}"
DEPLOY_USER="${DEPLOY_USER:-tumiki-deploy}"  # デプロイ用共通ユーザー
DRY_RUN="${DRY_RUN:-false}"

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_dry_run() {
    echo -e "${YELLOW}[DRY RUN]${NC} $1"
}

# Dry run実行関数
execute_command() {
    local description="$1"
    shift
    
    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "$description"
        log_dry_run "実行予定コマンド: $*"
        return 0
    else
        log_info "$description"
        "$@"
    fi
}

# 前提条件チェック
check_prerequisites() {
    log_info "前提条件をチェックしています..."
    
    # gcloud CLI の確認
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI が見つかりません"
        log_error "Google Cloud SDK をインストールしてください"
        exit 1
    fi
    
    # gcloud 認証確認
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
        log_error "Google Cloud 認証が必要です"
        log_error "gcloud auth login を実行してください"
        exit 1
    fi
    
    # Vercel CLI の確認
    if ! command -v vercel &> /dev/null; then
        log_warn "Vercel CLI が見つかりません。環境変数を手動で設定してください"
    fi
    
    if [ -z "$PROJECT_ID" ]; then
        log_error "PROJECT_ID が設定されていません"
        exit 1
    fi
    
    if ! gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID &>/dev/null; then
        log_error "インスタンス $INSTANCE_NAME が見つかりません"
        exit 1
    fi
    
    log_info "デプロイ先: $INSTANCE_NAME ($ZONE)"
    log_info "デプロイユーザー: $DEPLOY_USER"
}

# アプリケーションのビルド
build_application() {
    execute_command "プロジェクトルートに移動" cd ../..
    
    execute_command "依存関係をインストール" pnpm install --frozen-lockfile
    
    execute_command "@tumiki/dbディレクトリに移動" cd packages/db
    execute_command "Prismaクライアント生成" pnpm db:generate
    execute_command "@tumiki/dbパッケージビルド" pnpm build
    execute_command "プロジェクトルートに戻る" cd ../..
    
    execute_command "ProxyServerディレクトリに移動" cd apps/proxyServer
    execute_command "ProxyServerビルド" pnpm build
    execute_command "ProxyServerバンドル作成" pnpm build:bundle
}

# 環境変数の取得
get_environment_variables() {
    log_info "Vercelから環境変数を取得しています..."
    
    # Vercel CLI の確認
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI が見つかりません"
        log_error "npm install -g vercel でインストールしてください"
        exit 1
    fi
    
    execute_command "プロジェクトルートに移動" cd ../..
    
    # Vercelから環境変数を取得
    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "Vercelから環境変数を取得"
        log_dry_run "実行予定コマンド: vercel env pull --environment=production apps/proxyServer/.env.production"
    else
        if ! vercel env pull --environment=production apps/proxyServer/.env.production; then
            log_error "Vercelから環境変数の取得に失敗しました"
            log_error "vercel login でログインしてください"
            exit 1
        fi
    fi
    
    execute_command "ProxyServerディレクトリに戻る" cd apps/proxyServer
    
    log_info "環境変数の取得が完了しました"
}

# デプロイメントパッケージの作成
create_package() {
    log_info "デプロイメントパッケージを作成しています..."
    
    # .env.production ファイルの存在確認
    if [ "$DRY_RUN" = "false" ] && [ ! -f ".env.production" ]; then
        log_error ".env.production ファイルが見つかりません"
        log_error "get_environment_variables() が正常に実行されていません"
        exit 1
    fi
    
    execute_command "既存パッケージディレクトリを削除" rm -rf deployment-package
    execute_command "パッケージディレクトリを作成" mkdir -p deployment-package
    
    execute_command "バンドルファイルをコピー" cp -r dist package.json ecosystem.config.cjs deployment-package/
    execute_command "Prismaクライアント用ディレクトリ作成" mkdir -p deployment-package/packages/db
    execute_command "Prismaクライアントをコピー" cp -r ../../packages/db/dist deployment-package/packages/db/
    
    execute_command ".env.productionを.envとしてコピー" cp .env.production deployment-package/.env
    log_info ".env.production を .env としてパッケージに含めました"
    
    execute_command "アーカイブ作成" tar -czf deployment.tar.gz deployment-package/
    execute_command "一時ディレクトリを削除" rm -rf deployment-package
}

# VMへのデプロイ
deploy_to_vm() {
    log_info "VMにデプロイしています..."
    
    # ファイル転送
    execute_command "デプロイパッケージをVMに転送" gcloud compute scp deployment.tar.gz $DEPLOY_USER@$INSTANCE_NAME:~/deployment.tar.gz --zone=$ZONE --project=$PROJECT_ID
    
    # VM上でのセットアップ
    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "VM上でのセットアップ"
        log_dry_run "実行予定コマンド: gcloud compute ssh (パッケージ展開, セットアップ, PM2起動)"
    else
        gcloud compute ssh $DEPLOY_USER@$INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --command="
            set -e
            
            # ディレクトリ準備
            sudo mkdir -p $REMOTE_PATH
            sudo chown \$USER:\$USER $REMOTE_PATH
            
            echo \"現在のデプロイユーザー: \$USER\"
            echo \"デプロイ先ディレクトリ: $REMOTE_PATH\"
            
            # 既存のアプリ停止
            command -v pm2 &>/dev/null && pm2 delete tumiki-proxy-server 2>/dev/null || true
            
            # Node.js環境セットアップ
            if ! command -v node &>/dev/null; then
                curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
                sudo apt-get install -y nodejs
            fi
            
            if ! command -v pnpm &>/dev/null; then
                sudo npm install -g pnpm@latest
            fi
            
            if ! command -v pm2 &>/dev/null; then
                sudo npm install -g pm2
            fi
            
            # Gitがインストールされていない場合はインストール
            if ! command -v git &>/dev/null; then
                sudo apt-get update
                sudo apt-get install -y git
            fi
            
            # パッケージ展開
            cd $REMOTE_PATH
            tar -xzf ~/deployment.tar.gz --strip-components=1
            rm ~/deployment.tar.gz
            
            # 依存関係インストール
            echo '依存関係をインストール中...'
            pnpm install --frozen-lockfile --prod --ignore-scripts
            
            # 環境変数設定
            echo '環境変数ファイルを確認中...'
            cd $REMOTE_PATH
            if [ ! -f '.env' ]; then
                echo '警告: .env ファイルが存在しません'
                echo 'デプロイ後に手動で設定してください'
                # テンプレート.envファイルを作成
                cat > .env << 'EOL'
# 本番環境用環境変数
# 以下の値を実際の本番環境用の値に置き換えてください
DATABASE_URL=\"postgresql://user:password@host:port/database\"
NODE_ENV=\"production\"
PORT=\"8080\"
EOL
                echo 'テンプレート .env ファイルを作成しました'
            else
                echo '既存の .env ファイルを使用します'
            fi
            
            # PM2で起動
            cd $REMOTE_PATH
            pm2 start ecosystem.config.cjs
            pm2 save
            pm2 startup | grep -v 'PM2' | bash || true
            
            # ステータス表示
            pm2 status
        "
    fi
}

# メイン処理
main() {
    log_info "デプロイメントを開始します..."
    
    check_prerequisites
    get_environment_variables
    build_application
    create_package
    deploy_to_vm
    
    # 外部IPアドレス取得と表示
    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "外部IPアドレス取得"
        log_dry_run "実行予定コマンド: gcloud compute instances describe (外部IP取得)"
        EXTERNAL_IP="[DRY_RUN_MODE]"
    else
        EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME \
            --zone=$ZONE \
            --format='get(networkInterfaces[0].accessConfigs[0].natIP)' \
            --project=$PROJECT_ID)
    fi
    
    log_info "✅ デプロイメント完了!"
    log_info "アクセスURL: http://$EXTERNAL_IP:8080"
    log_info ""
    log_info "環境変数を設定する場合:"
    log_info "  gcloud compute ssh $DEPLOY_USER@$INSTANCE_NAME --zone=$ZONE"
    log_info "  sudo nano $REMOTE_PATH/.env"
    log_info "  cd $REMOTE_PATH && pm2 restart ecosystem.config.cjs"
}

# エラーハンドリング
trap 'log_error "エラーが発生しました"; exit 1' ERR

# スクリプト実行
main "$@"
