#!/bin/bash
set -euo pipefail

# =============================================================================
# Tumiki デプロイスクリプト - Cloud Run
# =============================================================================

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 共通関数を読み込み
source "${SCRIPT_DIR}/deploy-common.sh"

# Cloud Run前提条件チェック
check_cloudrun_prerequisites() {
    # gcloud CLI確認
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLIが見つかりません"
        exit 1
    fi

    # gcloud認証確認
    local auth_accounts
    if ! auth_accounts=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null) || [ -z "$auth_accounts" ]; then
        log_error "Google Cloud認証が設定されていません"
        if [ "$IS_CI" != "true" ]; then
            log_error "gcloud auth login を実行してください"
        else
            log_error "CI環境でのサービスアカウント認証を確認してください"
        fi
        exit 1
    fi
    log_info "認証済みアカウント: $auth_accounts"

    # Artifact Registry認証設定
    if ! gcloud auth configure-docker asia-northeast1-docker.pkg.dev &>/dev/null; then
        log_warn "Artifact Registry認証の設定に失敗しました"
    fi
}

# Cloud Runデプロイ実行
execute_cloudrun_deployment() {
    log_info "Cloud Runへデプロイ中..."

    # 環境変数設定
    local environment="${DEPLOY_STAGE:-staging}"
    local region="${CLOUDRUN_REGION:-asia-northeast1}"
    local min_instances="${CLOUDRUN_MIN_INSTANCES:-0}"
    local max_instances="${CLOUDRUN_MAX_INSTANCES:-3}"
    local service_name="tumiki-mcp-proxy-$environment"

    log_info "Environment: $environment"
    log_info "Region: $region"
    log_info "Scaling: Min $min_instances / Max $max_instances"

    # Git SHAを取得
    local short_sha
    short_sha=$(git rev-parse --short HEAD)
    log_info "Commit SHA: $short_sha"

    # Dockerイメージタグ
    local image_sha="asia-northeast1-docker.pkg.dev/$GCP_PROJECT_ID/tumiki/mcp-proxy:$environment-$short_sha"
    local image_latest="asia-northeast1-docker.pkg.dev/$GCP_PROJECT_ID/tumiki/mcp-proxy:$environment-latest"

    # Dockerイメージのビルド
    log_info "Dockerイメージをビルド中..."
    if ! docker build \
        -t "$image_sha" \
        -t "$image_latest" \
        -f apps/mcp-proxy/Dockerfile \
        .; then
        log_error "Dockerビルドに失敗しました"
        exit 1
    fi
    log_info "Dockerイメージのビルドが完了しました"

    # Artifact Registryへプッシュ
    log_info "Artifact Registryへプッシュ中..."
    if ! docker push "$image_sha"; then
        log_error "Dockerイメージのプッシュに失敗しました (SHA)"
        exit 1
    fi
    if ! docker push "$image_latest"; then
        log_error "Dockerイメージのプッシュに失敗しました (latest)"
        exit 1
    fi
    log_info "Dockerイメージのプッシュが完了しました"

    # Cloud Runへデプロイ
    log_info "Cloud Runへデプロイ中..."
    if ! gcloud run deploy "$service_name" \
        --image="$image_sha" \
        --region="$region" \
        --platform=managed \
        --allow-unauthenticated \
        --port=8080 \
        --memory=512Mi \
        --cpu=1 \
        --timeout=60s \
        --concurrency=80 \
        --min-instances="$min_instances" \
        --max-instances="$max_instances" \
        --set-env-vars=NODE_ENV=production,PORT=8080,LOG_LEVEL=info \
        --set-secrets=DATABASE_URL=tumiki-database-url-$environment:latest,UPSTASH_REDIS_REST_URL=tumiki-redis-url:latest,UPSTASH_REDIS_REST_TOKEN=tumiki-redis-token:latest,CACHE_ENCRYPTION_KEY=tumiki-cache-encryption-key-$environment:latest \
        --service-account=tumiki-mcp-proxy@$GCP_PROJECT_ID.iam.gserviceaccount.com \
        --vpc-connector=tumiki-vpc-connector \
        --vpc-egress=private-ranges-only; then
        log_error "Cloud Runデプロイに失敗しました"
        exit 1
    fi

    log_info "Cloud Runデプロイが完了しました"
}

# Cloud Runデプロイ結果表示
show_cloudrun_results() {
    local environment="${DEPLOY_STAGE:-staging}"
    local region="${CLOUDRUN_REGION:-asia-northeast1}"
    local service_name="tumiki-mcp-proxy-$environment"

    # サービスURL取得
    local service_url
    service_url=$(gcloud run services describe "$service_name" \
        --region="$region" \
        --project="$GCP_PROJECT_ID" \
        --format='value(status.url)')

    log_info "Cloud Runデプロイ完了"
    log_info "Service URL: $service_url"
    log_info "ヘルスチェック: $service_url/health"

    # ヘルスチェック実行
    log_info "ヘルスチェックを実行中..."
    sleep 10

    for i in {1..5}; do
        if curl -f -s "$service_url/health" > /dev/null; then
            log_info "✅ ヘルスチェック成功"
            break
        fi
        log_warn "⏳ サービス起動待ち (試行 $i/5)..."
        sleep 5
    done

    # GitHub Actions出力
    if [ -n "${GITHUB_OUTPUT:-}" ]; then
        echo "cloudrun_url=$service_url" >> "$GITHUB_OUTPUT"
        echo "cloudrun_health_url=$service_url/health" >> "$GITHUB_OUTPUT"
    fi
}

# Cloud Runデプロイメイン
deploy_cloudrun() {
    log_step "Cloud Runへデプロイ中..."

    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "Cloud Runデプロイをスキップ（ドライラン）"
        log_dry_run "Environment: ${DEPLOY_STAGE:-staging}"
        log_dry_run "Region: ${CLOUDRUN_REGION:-asia-northeast1}"
        log_dry_run "Project: $GCP_PROJECT_ID"
        return 0
    fi

    # デプロイ実行
    execute_cloudrun_deployment

    # 結果表示
    show_cloudrun_results

    return 0
}

# メイン処理（直接実行時）
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    export_common_vars
    check_cloudrun_prerequisites
    deploy_cloudrun
fi
