#!/bin/bash
set -euo pipefail

# 設定変数
INSTANCE_NAME="${INSTANCE_NAME:-tumiki-instance-20250601}"
ZONE="${ZONE:-asia-northeast2-c}"
PROJECT_ID="${PROJECT_ID:-mcp-server-455206}"
DEPLOY_USER="${DEPLOY_USER:-tumiki-deploy}"

# 色付きログ出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# ヘルプ表示
show_help() {
    cat << EOF
Usage: ./stream-pm2-logs.sh [OPTIONS]

PM2ログをリアルタイムでストリーミング表示

OPTIONS:
    -h, --help              このヘルプメッセージを表示
    -l, --lines NUMBER      表示する直近のログ行数（デフォルト: リアルタイム）
    -f, --follow            ログをリアルタイムでフォロー（デフォルト）
    --out                   標準出力ログのみ表示
    --err                   エラーログのみ表示
    --status                PM2のステータスを表示

例:
    # リアルタイムログ表示
    ./stream-pm2-logs.sh

    # 直近100行を表示
    ./stream-pm2-logs.sh -l 100

    # エラーログのみ表示
    ./stream-pm2-logs.sh --err

    # PM2ステータス確認
    ./stream-pm2-logs.sh --status

EOF
}

# デフォルト設定
FOLLOW=true
LINES=""
LOG_TYPE="all"

# コマンドライン引数の処理
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -l|--lines)
            FOLLOW=false
            LINES="--lines $2"
            shift 2
            ;;
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        --out)
            LOG_TYPE="out"
            shift
            ;;
        --err)
            LOG_TYPE="err"
            shift
            ;;
        --status)
            log_info "PM2ステータスを確認中..."
            gcloud compute ssh "$DEPLOY_USER@$INSTANCE_NAME" \
                --zone="$ZONE" \
                --project="$PROJECT_ID" \
                --command="pm2 status"
            exit 0
            ;;
        *)
            echo "不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# ログストリーミング開始
log_info "PM2ログをストリーミング中..."
log_info "終了するには Ctrl+C を押してください"
echo ""

# ログタイプに応じたコマンドを構築
case $LOG_TYPE in
    out)
        LOG_FILE="/opt/tumiki/apps/proxyServer/logs/out.log"
        if [ "$FOLLOW" = true ]; then
            gcloud compute ssh "$DEPLOY_USER@$INSTANCE_NAME" \
                --zone="$ZONE" \
                --project="$PROJECT_ID" \
                --command="tail -f $LOG_FILE"
        else
            gcloud compute ssh "$DEPLOY_USER@$INSTANCE_NAME" \
                --zone="$ZONE" \
                --project="$PROJECT_ID" \
                --command="tail ${LINES:-} $LOG_FILE"
        fi
        ;;
    err)
        LOG_FILE="/opt/tumiki/apps/proxyServer/logs/err.log"
        if [ "$FOLLOW" = true ]; then
            gcloud compute ssh "$DEPLOY_USER@$INSTANCE_NAME" \
                --zone="$ZONE" \
                --project="$PROJECT_ID" \
                --command="tail -f $LOG_FILE"
        else
            gcloud compute ssh "$DEPLOY_USER@$INSTANCE_NAME" \
                --zone="$ZONE" \
                --project="$PROJECT_ID" \
                --command="tail ${LINES:-} $LOG_FILE"
        fi
        ;;
    all)
        if [ "$FOLLOW" = true ]; then
            gcloud compute ssh "$DEPLOY_USER@$INSTANCE_NAME" \
                --zone="$ZONE" \
                --project="$PROJECT_ID" \
                --command="pm2 logs tumiki-proxy-server"
        else
            gcloud compute ssh "$DEPLOY_USER@$INSTANCE_NAME" \
                --zone="$ZONE" \
                --project="$PROJECT_ID" \
                --command="pm2 logs tumiki-proxy-server $LINES"
        fi
        ;;
esac