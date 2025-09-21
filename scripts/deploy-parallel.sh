#!/bin/bash
set -euo pipefail

# =============================================================================
# Tumiki デプロイスクリプト - 並列実行
# =============================================================================

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 共通関数を読み込み
source "${SCRIPT_DIR}/deploy-common.sh"

# Vercel/GCEデプロイスクリプトを読み込み
source "${SCRIPT_DIR}/deploy-vercel.sh"
source "${SCRIPT_DIR}/deploy-gce.sh"

# グローバル変数（プロセス管理用）
VERCEL_PID=""
GCE_PID=""
TEMP_DIR=""

# 並列デプロイの結果を確認する
check_deploy_results() {
    local vercel_status=$1
    local gce_status=$2

    if [ "$vercel_status" = "0" ] && [ "$gce_status" = "0" ]; then
        log_info "✅ 並列デプロイが正常に完了しました"
        return 0
    else
        log_error "❌ 並列デプロイで問題が発生しました"
        [ "$vercel_status" != "0" ] && log_error "  - Vercelデプロイが失敗"
        [ "$gce_status" != "0" ] && log_error "  - GCEデプロイが失敗"
        return 1
    fi
}

# デプロイプロセスの待機と結果取得
wait_for_deploy_process() {
    local pid=$1
    local name=$2
    local status_file=$3
    local result=1

    # プロセス完了を待機
    if ! wait "$pid"; then
        log_error "${name}デプロイプロセスが異常終了しました (PID: $pid)"
        result=1
    fi

    # ステータスファイルから結果を読み取り
    if [ -f "$status_file" ]; then
        result=$(cat "$status_file" 2>/dev/null || echo "1")
        [ "$result" != "0" ] && log_error "${name}デプロイが失敗しました (status: $result)"
    else
        log_error "${name}デプロイのステータスファイルが見つかりません"
        result=1
    fi

    echo "$result"
}

# プロセスグループを安全に終了する関数
terminate_process_group() {
    local pid=$1
    local name=$2
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        log_info "${name}プロセスグループを終了中 (PID: $pid)"
        kill -TERM -"$pid" 2>/dev/null || true
        local count=0
        while [ $count -lt 5 ] && kill -0 "$pid" 2>/dev/null; do
            sleep 1
            count=$((count + 1))
        done
        if kill -0 "$pid" 2>/dev/null; then
            log_warn "${name}プロセスを強制終了します"
            kill -KILL -"$pid" 2>/dev/null || true
        fi
    fi
}

# エラーハンドリング
cleanup_parallel() {
    local exit_code=$?

    # 子プロセスのクリーンアップ
    [ -n "$VERCEL_PID" ] && terminate_process_group "$VERCEL_PID" "Vercel"
    [ -n "$GCE_PID" ] && terminate_process_group "$GCE_PID" "GCE"

    # 一時ファイル/ディレクトリのクリーンアップ
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR" 2>/dev/null || true
    fi

    if [ $exit_code -ne 0 ]; then
        log_error "並列デプロイが失敗しました (exit code: $exit_code)"
        exit $exit_code
    fi
}

# 並列デプロイの準備処理
prepare_parallel_deploy() {
    # 環境変数取得
    if ! fetch_vercel_env_variables; then
        log_warn "環境変数の取得に失敗しましたが続行します"
    fi

    # パッケージビルド
    build_packages
}

# 並列デプロイメイン（内部用）
execute_parallel_deploy() {
    log_step "並列デプロイを開始します..."

    local vercel_success=1
    local gce_success=1

    # trapハンドラーを設定
    trap cleanup_parallel EXIT ERR INT TERM

    # 安全な一時ディレクトリを作成（プロセスIDとタイムスタンプを含むユニークな名前）
    TEMP_DIR=$(mktemp -d -t "tumiki-deploy-$$-$(date +%s)-XXXXXX") || {
        log_error "一時ディレクトリの作成に失敗しました"
        return 1
    }
    chmod 700 "$TEMP_DIR"

    # Vercelデプロイをバックグラウンドで開始（新しいプロセスグループとして）
    (
        # 新しいプロセスグループを作成
        set -m
        if deploy_vercel; then
            echo "0" > "$TEMP_DIR/vercel_status"
        else
            echo "1" > "$TEMP_DIR/vercel_status"
        fi
    ) &
    VERCEL_PID=$!

    # GCEデプロイをバックグラウンドで開始（新しいプロセスグループとして）
    (
        # 新しいプロセスグループを作成
        set -m
        if deploy_gce; then
            echo "0" > "$TEMP_DIR/gce_status"
        else
            echo "1" > "$TEMP_DIR/gce_status"
        fi
    ) &
    GCE_PID=$!

    # 両方の完了を待機
    log_info "デプロイの完了を待機中..."

    # 各デプロイプロセスの完了を待機し、結果を取得
    vercel_success=$(wait_for_deploy_process "$VERCEL_PID" "Vercel" "$TEMP_DIR/vercel_status")
    gce_success=$(wait_for_deploy_process "$GCE_PID" "GCE" "$TEMP_DIR/gce_status")

    # クリーンアップ
    rm -rf "$TEMP_DIR"
    TEMP_DIR=""
    VERCEL_PID=""
    GCE_PID=""

    # 結果を確認
    check_deploy_results "$vercel_success" "$gce_success"
}

# 並列デプロイ（外部から呼び出されるインターフェース）
deploy_parallel() {
    # 準備処理
    prepare_parallel_deploy

    # 並列デプロイ実行
    execute_parallel_deploy

    local result=$?

    # 環境変数ファイルのクリーンアップ
    rm -f .env.deploy 2>/dev/null || true

    return $result
}

# メイン処理（直接実行時）
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    export_common_vars
    check_vercel_prerequisites
    check_gce_prerequisites

    # 並列デプロイ実行（準備処理を含む）
    deploy_parallel
fi