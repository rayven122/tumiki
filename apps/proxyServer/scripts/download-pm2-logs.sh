#!/bin/bash
set -euo pipefail

# 設定変数
INSTANCE_NAME="${INSTANCE_NAME:-tumiki-instance-20250601}"
ZONE="${ZONE:-asia-northeast2-c}"
PROJECT_ID="${PROJECT_ID:-mcp-server-455206}"
DEPLOY_USER="${DEPLOY_USER:-tumiki-deploy}"
REMOTE_PATH="${REMOTE_PATH:-/opt/tumiki}"
LOCAL_LOG_DIR="./logs/remote"

# 色付きログ出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# ローカルログディレクトリを作成
mkdir -p "$LOCAL_LOG_DIR"

# ログファイルをダウンロード
log_info "PM2ログファイルをダウンロード中..."

# タイムスタンプを追加
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ログファイルのダウンロード
gcloud compute scp \
    "$DEPLOY_USER@$INSTANCE_NAME:$REMOTE_PATH/apps/proxyServer/logs/*.log" \
    "$LOCAL_LOG_DIR/" \
    --zone="$ZONE" \
    --project="$PROJECT_ID" \
    2>/dev/null || log_warn "ログファイルが見つかりません"

# ダウンロードされたファイルをリネーム（タイムスタンプ付き）
for file in "$LOCAL_LOG_DIR"/*.log; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .log)
        mv "$file" "$LOCAL_LOG_DIR/${filename}_${TIMESTAMP}.log"
    fi
done

log_info "ログファイルをダウンロードしました: $LOCAL_LOG_DIR"
log_info ""
log_info "ダウンロードされたファイル:"
ls -la "$LOCAL_LOG_DIR"/*_${TIMESTAMP}.log 2>/dev/null || log_warn "ログファイルがありません"