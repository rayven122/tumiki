#!/bin/bash
set -euo pipefail

# =============================================================================
# Tumiki ProxyServer - CI/CD用GCEデプロイメントスクリプト
# =============================================================================
#
# このスクリプトはGitHub ActionsからGCE VMにデプロイするために最適化されています。
# 非対話的実行、サービスアカウント認証、環境変数による設定管理をサポートします。
#
# 使用方法:
#   INSTANCE_NAME=xxx ZONE=xxx PROJECT_ID=xxx bash scripts/deploy-ci.sh
#
# 必須環境変数:
#   INSTANCE_NAME  - GCEインスタンス名
#   ZONE          - GCEゾーン
#   PROJECT_ID    - GCEプロジェクトID
#
# オプション環境変数:
#   REMOTE_PATH   - デプロイ先パス (デフォルト: /opt/tumiki)
#   DEPLOY_USER   - デプロイ用ユーザー (デフォルト: tumiki-deploy)
#   REPO_URL      - リポジトリURL (デフォルト: git@github.com:rayven122/tumiki.git)
#   DEPLOY_STAGE  - デプロイステージ (staging/production)
#   BRANCH        - デプロイするブランチ (デフォルト: main)
#
# =============================================================================

# 設定変数
INSTANCE_NAME="${INSTANCE_NAME:?INSTANCE_NAME is required}"
ZONE="${ZONE:?ZONE is required}"
PROJECT_ID="${PROJECT_ID:?PROJECT_ID is required}"
REMOTE_PATH="${REMOTE_PATH:-/opt/tumiki}"
DEPLOY_USER="${DEPLOY_USER:-tumiki-deploy}"
REPO_URL="${REPO_URL:-git@github.com:rayven122/tumiki.git}"
DEPLOY_STAGE="${DEPLOY_STAGE:-staging}"
BRANCH="${BRANCH:-main}"

# 色付きログ出力（CI環境でも動作）
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# エラーハンドリング
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "デプロイが失敗しました (exit code: $exit_code)"
        exit $exit_code
    fi
}

trap cleanup EXIT ERR

# 前提条件チェック
check_prerequisites() {
    log_step "前提条件をチェックしています..."
    
    # gcloud CLI の確認
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI が見つかりません"
        exit 1
    fi
    
    # gcloud 認証確認（サービスアカウントまたはユーザー認証）
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
        log_error "Google Cloud 認証が設定されていません"
        exit 1
    fi
    
    # インスタンス確認
    if ! gcloud compute instances describe "$INSTANCE_NAME" \
        --zone="$ZONE" \
        --project="$PROJECT_ID" &>/dev/null; then
        log_error "インスタンス $INSTANCE_NAME が見つかりません"
        log_error "Zone: $ZONE, Project: $PROJECT_ID"
        exit 1
    fi
    
    log_info "デプロイ先: $INSTANCE_NAME ($ZONE)"
    log_info "デプロイユーザー: $DEPLOY_USER"
    log_info "デプロイステージ: $DEPLOY_STAGE"
    log_info "ブランチ: $BRANCH"
}

# 環境変数ファイルの転送
transfer_env_file() {
    log_step "環境変数ファイルを転送しています..."
    
    local env_file=".env.deploy"
    
    if [ ! -f "$env_file" ]; then
        log_warn "環境変数ファイル $env_file が見つかりません"
        log_info "VM上で環境変数を手動で設定する必要があります"
        return 0
    fi
    
    # 一時ファイルとして転送
    if gcloud compute scp "$env_file" \
        "$DEPLOY_USER@$INSTANCE_NAME:/tmp/.env.deploy" \
        --zone="$ZONE" \
        --project="$PROJECT_ID"; then
        log_info "環境変数ファイルを転送しました"
    else
        log_warn "環境変数ファイルの転送に失敗しました"
        log_info "VM上で環境変数を手動で設定する必要があります"
    fi
}

# VMへのデプロイ
deploy_to_vm() {
    log_step "VMにGitベースデプロイを実行しています..."
    
    # デプロイコマンドの作成
    local deploy_script=$(cat <<'DEPLOY_SCRIPT'
set -e

# 環境情報表示
echo "=============================="
echo "デプロイ情報:"
echo "=============================="
echo "現在のユーザー: $USER"
echo "デプロイ先: REMOTE_PATH_VAR"
echo "リポジトリ: REPO_URL_VAR"
echo "ブランチ: BRANCH_VAR"
echo "ステージ: DEPLOY_STAGE_VAR"
echo "=============================="

# 既存のアプリ停止
echo "既存のアプリケーションを停止中..."
if command -v pm2 &>/dev/null; then
    pm2 delete tumiki-proxy-server 2>/dev/null || true
    pm2 kill 2>/dev/null || true
fi

# Node.js環境確認
if ! command -v node &>/dev/null; then
    echo "エラー: Node.jsがインストールされていません"
    exit 1
fi

if ! command -v pnpm &>/dev/null; then
    echo "エラー: pnpmがインストールされていません"
    exit 1
fi

if ! command -v pm2 &>/dev/null; then
    echo "エラー: PM2がインストールされていません"
    exit 1
fi

# Git設定
export GIT_TERMINAL_PROMPT=0
git config --global user.name "CI Deploy Bot"
git config --global user.email "ci@tumiki.local"

# SSHキー確認
if [ ! -f ~/.ssh/id_rsa ] && [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "エラー: SSHキーが設定されていません"
    exit 1
fi

# GitHubへのSSH接続テスト
echo "GitHubへの接続を確認中..."
if ! ssh -o StrictHostKeyChecking=no -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    echo "エラー: GitHubへのSSH接続に失敗しました"
    exit 1
fi

# リポジトリのクローンまたは更新
if [ -d "REMOTE_PATH_VAR/.git" ]; then
    echo "リポジトリを更新中..."
    cd REMOTE_PATH_VAR
    git fetch origin
    git reset --hard origin/BRANCH_VAR
    git clean -fd
    echo "リポジトリを更新しました: $(git log -1 --format='%h %s')"
else
    echo "リポジトリをクローン中..."
    if [ -d "REMOTE_PATH_VAR" ]; then
        rm -rf REMOTE_PATH_VAR
    fi
    mkdir -p /opt
    git clone -b BRANCH_VAR REPO_URL_VAR REMOTE_PATH_VAR
    cd REMOTE_PATH_VAR
    echo "リポジトリをクローンしました: $(git log -1 --format='%h %s')"
fi

# 作業ディレクトリに移動
cd REMOTE_PATH_VAR

# 環境変数ファイルの配置
if [ -f /tmp/.env.deploy ]; then
    echo "環境変数ファイルを配置中..."
    cp /tmp/.env.deploy apps/proxyServer/.env
    rm -f /tmp/.env.deploy
else
    echo "警告: 環境変数ファイルが見つかりません"
    if [ ! -f apps/proxyServer/.env ]; then
        echo "エラー: .envファイルが存在しません"
        exit 1
    fi
fi

# 依存関係インストール
echo "=============================="
echo "依存関係をインストール中..."
echo "=============================="
export NODE_OPTIONS='--max-old-space-size=2048'
pnpm install --frozen-lockfile || pnpm install

# 必要なパッケージのビルド
echo "=============================="
echo "パッケージをビルド中..."
echo "=============================="

cd packages/db
pnpm db:generate
pnpm build

cd ../../tooling/tsup-config
pnpm build

# データベースマイグレーション（エラーでも続行）
cd ../../packages/db
echo "=============================="
echo "データベースマイグレーション..."
echo "=============================="
pnpm db:deploy || echo "警告: マイグレーションに失敗しました（続行）"

# ProxyServerビルド
cd ../../apps/proxyServer
echo "=============================="
echo "ProxyServerをビルド中..."
echo "=============================="
pnpm build

# PM2で起動
echo "=============================="
echo "アプリケーションを起動中..."
echo "=============================="
export NODE_ENV=DEPLOY_STAGE_VAR
pnpm pm2:start
pm2 save

# ステータス表示
echo "=============================="
echo "デプロイ完了！"
echo "=============================="
pm2 status
echo ""
echo "ログ確認: pm2 logs tumiki-proxy-server"
echo "再起動: pm2 restart tumiki-proxy-server"
DEPLOY_SCRIPT
)
    
    # 変数置換
    deploy_script="${deploy_script//REMOTE_PATH_VAR/$REMOTE_PATH}"
    deploy_script="${deploy_script//REPO_URL_VAR/$REPO_URL}"
    deploy_script="${deploy_script//BRANCH_VAR/$BRANCH}"
    deploy_script="${deploy_script//DEPLOY_STAGE_VAR/$DEPLOY_STAGE}"
    
    # SSHでデプロイスクリプト実行
    if ! gcloud compute ssh "$DEPLOY_USER@$INSTANCE_NAME" \
        --zone="$ZONE" \
        --project="$PROJECT_ID" \
        --command="$deploy_script"; then
        log_error "デプロイスクリプトの実行に失敗しました"
        exit 1
    fi
}

# 外部IPアドレス取得
get_external_ip() {
    local external_ip
    external_ip=$(gcloud compute instances describe "$INSTANCE_NAME" \
        --zone="$ZONE" \
        --format='get(networkInterfaces[0].accessConfigs[0].natIP)' \
        --project="$PROJECT_ID")
    echo "$external_ip"
}

# メイン処理
main() {
    log_info "CI/CDデプロイメントを開始します..."
    log_info "=============================="
    
    check_prerequisites
    transfer_env_file
    deploy_to_vm
    
    # デプロイ結果表示
    local external_ip
    external_ip=$(get_external_ip)
    
    log_info "✅ デプロイメント完了!"
    log_info ""
    log_info "=============================="
    log_info "アクセス情報:"
    log_info "=============================="
    log_info "環境: $DEPLOY_STAGE"
    log_info "URL: http://$external_ip:8080"
    log_info "ヘルスチェック: http://$external_ip:8080/health"
    log_info "=============================="
    
    # GitHub Actions出力（実行環境がGitHub Actionsの場合）
    if [ -n "${GITHUB_OUTPUT:-}" ]; then
        echo "deployment_url=http://$external_ip:8080" >> "$GITHUB_OUTPUT"
        echo "health_check_url=http://$external_ip:8080/health" >> "$GITHUB_OUTPUT"
    fi
}

# スクリプト実行
main "$@"