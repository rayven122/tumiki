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

# 並列デプロイの実行
execute_parallel_deploy() {
    log_step "並列デプロイを開始します..."

    local vercel_result=0
    local gce_result=0
    local pids=()

    # Vercelデプロイをバックグラウンドで開始
    (deploy_vercel) &
    pids+=($!)

    # GCEデプロイをバックグラウンドで開始
    (deploy_gce) &
    pids+=($!)

    log_info "デプロイの完了を待機中..."

    # 各プロセスの完了を待機し、結果を確認
    for i in "${!pids[@]}"; do
        if ! wait "${pids[$i]}"; then
            if [ $i -eq 0 ]; then
                log_error "Vercelデプロイが失敗しました"
                vercel_result=1
            else
                log_error "GCEデプロイが失敗しました"
                gce_result=1
            fi
        fi
    done

    # 結果を確認
    if [ "$vercel_result" -eq 0 ] && [ "$gce_result" -eq 0 ]; then
        log_info "✅ 並列デプロイが正常に完了しました"
        return 0
    else
        log_error "❌ 並列デプロイで問題が発生しました"
        return 1
    fi
}

# 並列デプロイ（外部から呼び出されるインターフェース）
deploy_parallel() {
    # 環境変数取得とビルド
    if ! fetch_vercel_env_variables; then
        log_warn "環境変数の取得に失敗しましたが続行します"
    fi
    build_packages

    # 並列デプロイ実行
    execute_parallel_deploy
    local result=$?

    # クリーンアップ
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