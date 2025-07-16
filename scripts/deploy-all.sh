#!/bin/bash
set -euo pipefail

# =============================================================================
# Tumiki - 統合デプロイメントスクリプト
# =============================================================================
#
# このスクリプトはTumikiプロジェクトの全コンポーネントを一括デプロイします：
# 1. Manager アプリ (Next.js) → Vercel
# 2. ProxyServer (Node.js) → Google Compute Engine
#
# 使用方法:
#   ./scripts/deploy-all.sh              # 並列デプロイ
#   ./scripts/deploy-all.sh --dry-run    # ドライラン（実際には実行しない）
#
# 環境変数:
#   DRY_RUN       - ドライランモード (デフォルト: false)
#   SKIP_VERCEL   - Vercelデプロイをスキップ (デフォルト: false)
#   SKIP_GCE      - GCEデプロイをスキップ (デフォルト: false)
#
# 前提条件:
#   - Vercel CLI がインストール済み・認証済み
#   - gcloud CLI がインストール済み・認証済み
#   - プロジェクトがVercelにリンク済み
#
# =============================================================================

# 設定変数
DRY_RUN="${DRY_RUN:-false}"
SKIP_VERCEL="${SKIP_VERCEL:-false}"
SKIP_GCE="${SKIP_GCE:-false}"

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
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

# エラーハンドリング
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "デプロイが失敗しました (exit code: $exit_code)"
        log_error "詳細なログを確認してください"
    fi
}

trap cleanup EXIT ERR

# 前提条件チェック
check_prerequisites() {
    log_step "前提条件をチェックしています..."
    
    # Vercel CLI の確認
    if [ "$SKIP_VERCEL" != "true" ]; then
        if ! command -v vercel &> /dev/null; then
            log_error "Vercel CLI が見つかりません"
            log_error "npm install -g vercel でインストールしてください"
            exit 1
        fi
        
        # Vercel 認証確認
        if ! vercel whoami &>/dev/null; then
            log_error "Vercel 認証が必要です"
            log_error "vercel login を実行してください"
            exit 1
        fi
        
        # プロジェクトがリンクされているかチェック
        if [ ! -f ".vercel/project.json" ]; then
            log_warn "プロジェクトがVercelにリンクされていない可能性があります"
            log_warn "vercel link を実行してください"
        fi
    fi
    
    # gcloud CLI の確認
    if [ "$SKIP_GCE" != "true" ]; then
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
    fi
    
    log_info "前提条件チェック完了"
}

# Vercelデプロイ
deploy_vercel() {
    if [ "$SKIP_VERCEL" = "true" ]; then
        log_info "Vercelデプロイをスキップしています"
        return 0
    fi
    
    log_step "Vercel (Manager App) をデプロイしています..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "Vercelデプロイ"
        log_dry_run "実行予定コマンド: vercel --prod"
        return 0
    fi
    
    # Vercelデプロイ実行（プロジェクトルートで実行）
    log_info "Vercelデプロイを開始します（しばらく時間がかかる場合があります）..."
    
    # 現在のディレクトリを保存
    local current_dir=$(pwd)
    local project_root=$(pwd)  # 既にプロジェクトルートにいる想定
    
    # Vercelプロジェクトの確認
    if [ ! -f ".vercel/project.json" ]; then
        log_warn "プロジェクトがVercelにリンクされていません"
        log_warn "以下のコマンドを実行してリンクしてください:"
        log_warn "  vercel link"
        return 1
    fi
    
    # macOS対応のタイムアウト処理
    local timeout_cmd=""
    if command -v gtimeout &> /dev/null; then
        timeout_cmd="gtimeout 600"
    elif command -v timeout &> /dev/null; then
        timeout_cmd="timeout 600"
    else
        # タイムアウトコマンドがない場合は通常実行
        timeout_cmd=""
    fi
    
    if [ -n "$timeout_cmd" ]; then
        if $timeout_cmd vercel --prod; then
            log_info "✅ Vercelデプロイが完了しました"
            return 0
        else
            local exit_code=$?
            if [ $exit_code -eq 124 ]; then
                log_warn "⚠️ Vercelデプロイがタイムアウトしました（10分）"
                log_warn "デプロイは継続中の可能性があります。Vercelダッシュボードで確認してください"
                log_warn "https://vercel.com/dashboard"
                return 0  # タイムアウトでも次の処理に進む
            else
                log_error "❌ Vercelデプロイに失敗しました"
                return 1
            fi
        fi
    else
        # タイムアウトなしで実行
        log_warn "タイムアウトコマンドが見つかりません。通常実行します"
        if vercel --prod; then
            log_info "✅ Vercelデプロイが完了しました"
            return 0
        else
            log_error "❌ Vercelデプロイに失敗しました"
            return 1
        fi
    fi
}

# GCEデプロイ
deploy_gce() {
    if [ "$SKIP_GCE" = "true" ]; then
        log_info "GCEデプロイをスキップしています"
        return 0
    fi
    
    log_step "GCE (ProxyServer) をデプロイしています..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "GCEデプロイ"
        log_dry_run "実行予定コマンド: bash apps/proxyServer/deploy-to-gce.sh"
        return 0
    fi
    
    # GCEデプロイスクリプトの実行（プロジェクトルートから）
    local current_dir=$(pwd)
    local gce_script="apps/proxyServer/deploy-to-gce.sh"
    
    if [ ! -f "$gce_script" ]; then
        log_error "GCEデプロイスクリプトが見つかりません: $gce_script"
        return 1
    fi
    
    # プロジェクトルートで実行するように相対パスを調整
    if bash "$gce_script"; then
        log_info "✅ GCEデプロイが完了しました"
        return 0
    else
        log_error "❌ GCEデプロイに失敗しました"
        return 1
    fi
}

# 並列デプロイ
deploy_parallel() {
    log_step "並列デプロイを開始します..."
    
    local vercel_success=0
    local gce_success=0
    
    # バックグラウンドでデプロイ実行
    if [ "$SKIP_VERCEL" != "true" ]; then
        deploy_vercel &
        local vercel_pid=$!
    fi
    
    if [ "$SKIP_GCE" != "true" ]; then
        deploy_gce &
        local gce_pid=$!
    fi
    
    # デプロイ完了を待機
    if [ "$SKIP_VERCEL" != "true" ]; then
        if wait $vercel_pid; then
            vercel_success=1
        fi
    else
        vercel_success=1  # スキップ時は成功とみなす
    fi
    
    if [ "$SKIP_GCE" != "true" ]; then
        if wait $gce_pid; then
            gce_success=1
        fi
    else
        gce_success=1  # スキップ時は成功とみなす
    fi
    
    # 結果確認
    if [ $vercel_success -eq 1 ] && [ $gce_success -eq 1 ]; then
        log_info "✅ 並列デプロイが完了しました"
        return 0
    else
        log_error "❌ 並列デプロイに失敗しました"
        [ $vercel_success -eq 0 ] && log_error "  - Vercelデプロイが失敗"
        [ $gce_success -eq 0 ] && log_error "  - GCEデプロイが失敗"
        return 1
    fi
}


# デプロイ実行（並列のみ）
execute_deployment() {
    deploy_parallel
}

# 結果レポート
show_deployment_report() {
    log_step "デプロイ結果"
    echo ""
    echo "==============================="
    echo "   デプロイ完了レポート"
    echo "==============================="
    
    if [ "$SKIP_VERCEL" != "true" ]; then
        echo "🚀 Manager App (Vercel):"
        if [ "$DRY_RUN" = "true" ]; then
            echo "   URL: [DRY_RUN_MODE]"
        else
            echo "   URL: https://tumiki.vercel.app (実際のURLは vercel --prod の出力を確認)"
        fi
    fi
    
    if [ "$SKIP_GCE" != "true" ]; then
        echo "🔧 ProxyServer (GCE):"
        echo "   詳細は GCE デプロイスクリプトの出力を確認してください"
    fi
    
    echo ""
    echo "📝 確認コマンド:"
    if [ "$SKIP_VERCEL" != "true" ]; then
        echo "   Vercel: vercel ls"
    fi
    if [ "$SKIP_GCE" != "true" ]; then
        echo "   GCE: gcloud compute instances list"
    fi
    echo "==============================="
}

# ヘルプ表示
show_help() {
    cat << EOF
Usage: ./scripts/deploy-all.sh [OPTIONS]

Tumiki 統合デプロイメントスクリプト

このスクリプトは以下を自動実行します:
1. Manager アプリを Vercel にデプロイ
2. ProxyServer を Google Compute Engine にデプロイ

OPTIONS:
    -h, --help              このヘルプメッセージを表示
    --dry-run               実際の実行を行わずにコマンドを表示
    --skip-vercel           Vercelデプロイをスキップ
    --skip-gce              GCEデプロイをスキップ

前提条件:
    - Vercel CLI がインストール済み (npm install -g vercel)
    - gcloud CLI がインストール済み
    - vercel login 実行済み
    - gcloud auth login 実行済み
    - プロジェクトがVercelにリンク済み

例:
    # 通常のデプロイ（並列実行）
    ./scripts/deploy-all.sh

    # ドライラン（実際には実行しない）
    ./scripts/deploy-all.sh --dry-run

    # Vercelのみデプロイ
    ./scripts/deploy-all.sh --skip-gce

    # GCEのみデプロイ
    ./scripts/deploy-all.sh --skip-vercel

環境変数:
    DRY_RUN=true            ドライランモード
    SKIP_VERCEL=true        Vercelデプロイをスキップ
    SKIP_GCE=true           GCEデプロイをスキップ

詳細なドキュメント:
    README.md

EOF
}

# メイン処理
main() {
    echo ""
    echo "==============================="
    echo "  Tumiki 統合デプロイメント"
    echo "==============================="
    
    if [ "$DRY_RUN" = "true" ]; then
        log_warn "ドライランモードで実行中（実際のデプロイは行われません）"
    fi
    
    log_info "並列デプロイモードで実行中"
    
    check_prerequisites
    
    if execute_deployment; then
        show_deployment_report
        log_info "🎉 全てのデプロイが完了しました!"
    else
        log_error "❌ デプロイに失敗しました"
        exit 1
    fi
}

# コマンドライン引数の処理
for arg in "$@"; do
    case $arg in
        -h|--help)
            show_help
            exit 0
            ;;
        --dry-run)
            DRY_RUN="true"
            ;;
        --skip-vercel)
            SKIP_VERCEL="true"
            ;;
        --skip-gce)
            SKIP_GCE="true"
            ;;
        *)
            log_error "不明なオプション: $arg"
            show_help
            exit 1
            ;;
    esac
done

# 権限設定の確認
if [ ! -x "$0" ]; then
    log_warn "スクリプトに実行権限がありません。権限を設定中..."
    chmod +x "$0"
fi

# スクリプト実行
main "$@"