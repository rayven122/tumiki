#!/bin/bash
set -euo pipefail

# =============================================================================
# Tumiki デプロイスクリプト - Vercel
# =============================================================================

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 共通関数を読み込み
source "${SCRIPT_DIR}/deploy-common.sh"

# Vercel前提条件チェック
check_vercel_prerequisites() {
    if [ "$IS_CI" = "true" ]; then
        # CI環境
        if [ -z "${VERCEL_TOKEN:-}" ]; then
            log_error "VERCEL_TOKENが設定されていません"
            exit 1
        fi
        if [ -z "${VERCEL_ORG_ID:-}" ] || [ -z "${VERCEL_PROJECT_ID:-}" ]; then
            log_error "VERCEL_ORG_IDまたはVERCEL_PROJECT_IDが設定されていません"
            exit 1
        fi
        # CI環境でもvercel CLIが必要
        if ! command -v vercel &> /dev/null; then
            log_error "Vercel CLIが見つかりません"
            log_error "GitHub Actionsのsetupアクションでインストールが必要です"
            exit 1
        fi
    else
        # ローカル環境
        if ! command -v vercel &> /dev/null; then
            log_error "Vercel CLIが見つかりません"
            log_error "npm install -g vercel でインストールしてください"
            exit 1
        fi

        if ! vercel whoami &>/dev/null; then
            log_warn "Vercel認証が必要です"
            log_warn "vercel login を実行してください"
        fi
    fi
}

# Vercel環境変数を取得
fetch_vercel_env_variables() {
    log_step "環境変数を取得中..."

    local env_file=".env.deploy"

    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "環境変数の取得をスキップ（ドライラン）"
        return 0
    fi

    if [ -n "${VERCEL_TOKEN:-}" ]; then
        # CI環境: トークンベース
        log_info "Vercelトークンを使用して環境変数を取得"

        # 環境に応じて取得
        local vercel_env="production"
        if [ "$STAGE" = "staging" ]; then
            vercel_env="preview"
        fi

        if vercel env pull "$env_file" \
            --environment="$vercel_env" \
            --token="$VERCEL_TOKEN" \
            --yes; then
            log_info "環境変数ファイルを取得しました"
            return 0
        else
            log_warn "Vercel環境変数の取得に失敗しました"
            return 1
        fi
    elif command -v vercel &>/dev/null; then
        # ローカル環境: Vercel CLI
        log_info "Vercel CLIから環境変数を取得"

        # プロジェクトルートでvercel env pullを実行
        local vercel_env="production"
        if [ "$STAGE" = "staging" ]; then
            vercel_env="preview"
        fi

        if vercel env pull "$env_file" --environment="$vercel_env"; then
            log_info "環境変数ファイルを取得しました"
            return 0
        else
            log_warn "Vercel環境変数の取得に失敗しました"
            return 1
        fi
    else
        log_warn "環境変数ファイルが取得できません"
        return 1
    fi
}

# Vercelデプロイ
deploy_vercel() {
    log_step "Vercelへデプロイ中..."

    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "Vercelデプロイをスキップ（ドライラン）"
        log_dry_run "環境: $STAGE"
        return 0
    fi

    local deployment_url=""

    # managerアプリケーションのディレクトリに移動
    cd apps/manager

    if [ -n "${VERCEL_TOKEN:-}" ]; then
        # CI環境（Vercel CLIが環境変数を自動読込）
        log_info "CI環境でVercelデプロイを実行"

        if [ "$STAGE" = "production" ]; then
            deployment_url=$(vercel deploy --prod --yes 2>&1 | tail -1)
        else
            deployment_url=$(vercel deploy --yes 2>&1 | tail -1)
        fi
    else
        # ローカル環境
        log_info "ローカル環境でVercelデプロイを実行"

        if [ "$STAGE" = "production" ]; then
            deployment_url=$(vercel deploy --prod 2>&1 | tail -1)
        else
            deployment_url=$(vercel deploy 2>&1 | tail -1)
        fi
    fi

    # プロジェクトルートに戻る
    cd ../..

    log_info "Vercelデプロイ完了"
    log_info "URL: $deployment_url"

    # GitHub Actions出力
    if [ -n "${GITHUB_OUTPUT:-}" ]; then
        echo "vercel_url=$deployment_url" >> "$GITHUB_OUTPUT"
    fi

    return 0
}

# メイン処理（直接実行時）
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    export_common_vars
    check_vercel_prerequisites
    deploy_vercel
fi