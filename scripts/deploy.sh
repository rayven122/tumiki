#!/bin/bash
set -euo pipefail

# =============================================================================
# Tumiki 統合デプロイスクリプト - メインエントリーポイント
# =============================================================================
#
# 使用方法:
#   ./scripts/deploy.sh [--target vercel|gce|all] [--stage staging|production]
#
# 環境変数:
#   DEPLOY_TARGET      デプロイ先 (vercel|gce|all)
#   DEPLOY_STAGE       環境 (staging|production)
#   VERCEL_TOKEN       Vercelトークン（CI用）
#   VERCEL_ORG_ID      Vercel組織ID
#   VERCEL_PROJECT_ID  VercelプロジェクトID
#   GCE_INSTANCE_NAME  GCEインスタンス名
#   GCE_ZONE           GCEゾーン
#   GCP_PROJECT_ID     GCPプロジェクトID
#   CI                 CI環境フラグ (true|false)
#
# =============================================================================

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 共通関数と各デプロイモジュールを読み込み
source "${SCRIPT_DIR}/deploy-common.sh"
source "${SCRIPT_DIR}/deploy-vercel.sh"
source "${SCRIPT_DIR}/deploy-gce.sh"
source "${SCRIPT_DIR}/deploy-parallel.sh"

# エラーハンドリング
cleanup() {
    local exit_code=$?

    # 環境変数ファイルのクリーンアップ（機密情報を含むため安全に削除）
    if [ -f ".env.deploy" ]; then
        shred -u .env.deploy 2>/dev/null || rm -f .env.deploy
        log_info "環境変数ファイルを安全に削除しました"
    fi

    if [ $exit_code -ne 0 ]; then
        log_error "デプロイが失敗しました (exit code: $exit_code)"
        exit $exit_code
    fi
}

trap cleanup EXIT ERR INT TERM

# 前提条件チェック
check_prerequisites() {
    log_step "前提条件をチェックしています..."

    # Node.js/pnpmチェック
    check_nodejs || exit 1
    check_pnpm || exit 1

    # ターゲット別チェック
    if [ "$TARGET" = "vercel" ] || [ "$TARGET" = "all" ]; then
        check_vercel_prerequisites
    fi

    if [ "$TARGET" = "gce" ] || [ "$TARGET" = "all" ]; then
        check_gce_prerequisites
    fi

    log_info "前提条件チェック完了"
}

# メイン処理
main() {
    log_info "==============================="
    log_info "Tumiki統合デプロイ開始"
    log_info "==============================="
    log_info "ターゲット: $TARGET"
    log_info "ステージ: $STAGE"
    log_info "環境: ${IS_CI:+CI}${IS_CI:-ローカル}"

    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "ドライランモードで実行します"
    fi

    # 前提条件チェック
    check_prerequisites

    # ターゲット別デプロイ
    case "$TARGET" in
        vercel)
            deploy_vercel
            ;;
        gce)
            # GCEの場合は環境変数とビルドが必要
            if ! fetch_vercel_env_variables; then
                log_warn "環境変数の取得に失敗しましたが続行します"
            fi
            build_packages
            deploy_gce
            ;;
        all)
            # productionの場合は並列実行、それ以外は順次実行
            if [ "$STAGE" = "production" ]; then
                log_info "本番環境へのデプロイのため、並列実行します"
                # deploy_parallelが準備処理も含めて実行
                deploy_parallel
            else
                # 順次実行の場合
                if ! fetch_vercel_env_variables; then
                    log_warn "環境変数の取得に失敗しましたが続行します"
                fi
                build_packages
                deploy_vercel
                deploy_gce
            fi
            ;;
        *)
            log_error "不明なターゲット: $TARGET"
            exit 1
            ;;
    esac

    # クリーンアップ（機密情報を含むため安全に削除）
    if [ -f ".env.deploy" ]; then
        shred -u .env.deploy 2>/dev/null || rm -f .env.deploy
        log_info "環境変数ファイルを安全に削除しました"
    fi

    log_info "==============================="
    log_info "✅ デプロイ完了!"
    log_info "==============================="
}

# ヘルプ表示
show_help() {
    cat << EOF
使用方法: $0 [オプション]

Tumiki統合デプロイスクリプト

オプション:
    --target [vercel|gce|all]    デプロイ先 (デフォルト: vercel)
    --stage [staging|production]  環境 (デフォルト: staging)
    --dry-run                     実際のデプロイを行わずに確認
    --help, -h                    このヘルプを表示

環境変数:
    DEPLOY_TARGET      デプロイ先の指定
    DEPLOY_STAGE       環境の指定
    VERCEL_TOKEN       Vercelトークン（CI用）
    VERCEL_ORG_ID      Vercel組織ID
    VERCEL_PROJECT_ID  VercelプロジェクトID
    GCE_INSTANCE_NAME  GCEインスタンス名
    GCE_ZONE           GCEゾーン
    GCP_PROJECT_ID     GCPプロジェクトID

例:
    # Vercelのみにデプロイ（デフォルト）
    $0

    # 両方にデプロイ
    $0 --target all

    # GCEのみにデプロイ
    $0 --target gce

    # 本番環境にデプロイ（並列実行）
    $0 --stage production --target all

    # ドライラン
    $0 --dry-run

詳細:
    このスクリプトはVercelとGCEの両方または個別にデプロイを実行します。
    CI環境では自動的に非対話モードで動作し、ローカル環境では必要に応じて
    対話的な認証を行います。

    本番環境（--stage production）への両方デプロイ（--target all）の場合、
    VercelとGCEへのデプロイが並列実行され、デプロイ時間が短縮されます。

各デプロイモジュール:
    deploy-vercel.sh   - Vercelデプロイ処理
    deploy-gce.sh      - GCEデプロイ処理
    deploy-parallel.sh - 並列実行処理
    deploy-common.sh   - 共通関数

EOF
}

# 環境変数をエクスポート
export_common_vars

# コマンドライン引数処理
while [[ $# -gt 0 ]]; do
    case $1 in
        --target)
            TARGET="$2"
            shift 2
            ;;
        --stage)
            STAGE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# 実行
main "$@"