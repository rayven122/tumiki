#!/bin/bash
# =============================================================================
# Tumiki デプロイスクリプト - 共通関数
# =============================================================================

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

log_dry_run() {
    echo -e "${YELLOW}[DRY RUN]${NC} $1"
}

# Node.js確認
check_nodejs() {
    if ! command -v node &> /dev/null; then
        log_error "Node.jsが見つかりません"
        return 1
    fi
    return 0
}

# pnpm確認
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpmが見つかりません"
        return 1
    fi
    return 0
}

# パッケージビルド（共通処理）
build_packages() {
    log_step "共通パッケージをビルド中..."

    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "パッケージビルドをスキップ（ドライラン）"
        return 0
    fi

    # 基本パッケージ
    pnpm --filter @tumiki/tsup-config build
    pnpm --filter @tumiki/db build

    # dbパッケージのgenerate
    (cd packages/db && pnpm db:generate)

    # その他のパッケージ
    pnpm --filter @tumiki/utils build

    log_info "パッケージビルドが完了しました"
}

# 設定値を取得するヘルパー関数
get_config() {
    local key=$1
    local default_value=$2
    local env_file=".env"

    # .envファイルから設定値を読み込み
    if [ -f "$env_file" ] && grep -q "^${key}=" "$env_file"; then
        grep "^${key}=" "$env_file" | cut -d'=' -f2- | tr -d '"'
    else
        echo "$default_value"
    fi
}

# 環境変数エクスポート
export_common_vars() {
    export TARGET="${DEPLOY_TARGET:-vercel}"
    export STAGE="${DEPLOY_STAGE:-staging}"
    export IS_CI="${CI:-false}"
    export DRY_RUN="${DRY_RUN:-false}"

    # GCE設定（設定ファイルまたは環境変数から取得）
    export GCE_INSTANCE_NAME="${GCE_INSTANCE_NAME:-$(get_config 'GCE_INSTANCE_NAME' 'tumiki-instance-default')}"
    export GCE_ZONE="${GCE_ZONE:-$(get_config 'GCE_ZONE' 'asia-northeast2-c')}"
    export GCP_PROJECT_ID="${GCP_PROJECT_ID:-$(get_config 'GCP_PROJECT_ID' '')}"
    export DEPLOY_USER="${DEPLOY_USER:-$(get_config 'DEPLOY_USER' 'tumiki-deploy')}"
    export REMOTE_PATH="${REMOTE_PATH:-$(get_config 'REMOTE_PATH' '/opt/tumiki')}"
    export REPO_URL="${REPO_URL:-$(get_config 'REPO_URL' 'git@github.com:rayven122/tumiki.git')}"
    export BRANCH="${BRANCH:-$(get_config 'BRANCH' 'main')}"
}