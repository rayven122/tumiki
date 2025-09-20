#!/bin/bash
set -euo pipefail

# =============================================================================
# Tumiki 統合デプロイスクリプト
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

# デフォルト設定
TARGET="${DEPLOY_TARGET:-vercel}"  # デフォルトはVercelのみ
STAGE="${DEPLOY_STAGE:-staging}"
IS_CI="${CI:-false}"
DRY_RUN="${DRY_RUN:-false}"

# GCE設定（デフォルト値）
GCE_INSTANCE_NAME="${GCE_INSTANCE_NAME:-tumiki-instance-20250601}"
GCE_ZONE="${GCE_ZONE:-asia-northeast2-c}"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-mcp-server-455206}"
DEPLOY_USER="${DEPLOY_USER:-tumiki-deploy}"
REMOTE_PATH="${REMOTE_PATH:-/opt/tumiki}"
REPO_URL="${REPO_URL:-git@github.com:rayven122/tumiki.git}"
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

log_dry_run() {
    echo -e "${YELLOW}[DRY RUN]${NC} $1"
}

# グローバル変数（プロセス管理用）
VERCEL_PID=""
GCE_PID=""
TEMP_DIR=""

# エラーハンドリング
cleanup() {
    local exit_code=$?

    # 子プロセスのクリーンアップ
    if [ -n "$VERCEL_PID" ] && kill -0 "$VERCEL_PID" 2>/dev/null; then
        log_warn "Vercelデプロイプロセスを停止中..."
        kill -TERM "$VERCEL_PID" 2>/dev/null || true
    fi

    if [ -n "$GCE_PID" ] && kill -0 "$GCE_PID" 2>/dev/null; then
        log_warn "GCEデプロイプロセスを停止中..."
        kill -TERM "$GCE_PID" 2>/dev/null || true
    fi

    # 一時ファイル/ディレクトリのクリーンアップ
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi

    rm -f .env.deploy

    if [ $exit_code -ne 0 ]; then
        log_error "デプロイが失敗しました (exit code: $exit_code)"
        exit $exit_code
    fi
}

trap cleanup EXIT ERR INT TERM

# =============================================================================
# 共通関数
# =============================================================================

# 前提条件チェック
check_prerequisites() {
    log_step "前提条件をチェックしています..."

    # Node.js確認
    if ! command -v node &> /dev/null; then
        log_error "Node.jsが見つかりません"
        exit 1
    fi

    # pnpm確認
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpmが見つかりません"
        exit 1
    fi

    # ターゲット別チェック
    if [ "$TARGET" = "vercel" ] || [ "$TARGET" = "all" ]; then
        check_vercel_prerequisites
    fi

    if [ "$TARGET" = "gce" ] || [ "$TARGET" = "all" ]; then
        check_gce_prerequisites
    fi

    log_info "前提条件チェック完了"
}

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

# GCE前提条件チェック
check_gce_prerequisites() {
    # gcloud CLI確認
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLIが見つかりません"
        exit 1
    fi

    # gcloud認証確認
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
        log_error "Google Cloud認証が設定されていません"
        if [ "$IS_CI" != "true" ]; then
            log_error "gcloud auth login を実行してください"
        fi
        exit 1
    fi

    # インスタンス確認
    if ! gcloud compute instances describe "$GCE_INSTANCE_NAME" \
        --zone="$GCE_ZONE" \
        --project="$GCP_PROJECT_ID" &>/dev/null; then
        log_error "インスタンス $GCE_INSTANCE_NAME が見つかりません"
        log_error "Zone: $GCE_ZONE, Project: $GCP_PROJECT_ID"
        exit 1
    fi
}

# Vercel環境変数を取得
fetch_env_variables() {
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

# =============================================================================
# Vercelデプロイ
# =============================================================================

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
        # CI環境
        log_info "CI環境でVercelデプロイを実行"

        if [ "$STAGE" = "production" ]; then
            deployment_url=$(vercel deploy --prod --token="$VERCEL_TOKEN" --yes 2>&1 | tail -1)
        else
            deployment_url=$(vercel deploy --token="$VERCEL_TOKEN" --yes 2>&1 | tail -1)
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

# =============================================================================
# GCEデプロイ
# =============================================================================

deploy_gce() {
    log_step "GCEへデプロイ中..."

    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "GCEデプロイをスキップ（ドライラン）"
        log_dry_run "インスタンス: $GCE_INSTANCE_NAME"
        log_dry_run "ゾーン: $GCE_ZONE"
        log_dry_run "プロジェクト: $GCP_PROJECT_ID"
        return 0
    fi

    # 環境変数ファイル転送
    transfer_env_to_gce

    # デプロイスクリプト実行
    execute_gce_deployment

    # 結果表示
    show_gce_results

    return 0
}

# GCEへ環境変数ファイル転送
transfer_env_to_gce() {
    if [ -f ".env.deploy" ]; then
        log_info "環境変数ファイルをGCEに転送中..."

        if gcloud compute scp ".env.deploy" \
            "$DEPLOY_USER@$GCE_INSTANCE_NAME:/tmp/.env.deploy" \
            --zone="$GCE_ZONE" \
            --project="$GCP_PROJECT_ID"; then
            log_info "環境変数ファイルを転送しました"
        else
            log_warn "環境変数ファイルの転送に失敗しました"
        fi
    else
        log_warn "環境変数ファイルが見つかりません"
    fi
}

# GCEでデプロイ実行
execute_gce_deployment() {
    log_info "GCE上でデプロイを実行中..."

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
echo "ステージ: STAGE_VAR"
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

# 環境設定
export GIT_TERMINAL_PROMPT=0

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
    cd REMOTE_PATH_VAR || {
        echo "エラー: リポジトリディレクトリにアクセスできません"
        exit 1
    }
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
    cd REMOTE_PATH_VAR || {
        echo "エラー: クローンしたリポジトリにアクセスできません"
        exit 1
    }
    echo "リポジトリをクローンしました: $(git log -1 --format='%h %s')"
fi

# Git設定（リポジトリが確実に存在する状態で実行）
if [ -d ".git" ]; then
    git config user.name "CI Deploy Bot"
    git config user.email "ci@tumiki.local"
    echo "Git設定を適用しました"
else
    echo "エラー: Gitリポジトリが見つかりません"
    exit 1
fi

# 作業ディレクトリに移動
cd REMOTE_PATH_VAR || {
    echo "エラー: 作業ディレクトリにアクセスできません"
    exit 1
}

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
echo ""
echo "=============================="
echo "依存関係をインストール中..."
echo "=============================="
export NODE_OPTIONS='--max-old-space-size=2048'
pnpm install --frozen-lockfile || pnpm install

# 必要なパッケージのビルド
echo ""
echo "=============================="
echo "パッケージをビルド中..."
echo "=============================="

cd packages/db
pnpm db:generate
pnpm build

cd ../../tooling/tsup-config
pnpm build

# ProxyServerビルド
cd ../../apps/proxyServer
echo ""
echo "=============================="
echo "ProxyServerをビルド中..."
echo "=============================="
pnpm build

# PM2で起動
echo ""
echo "=============================="
echo "アプリケーションを起動中..."
echo "=============================="
export NODE_ENV=STAGE_VAR
pnpm pm2:start
pm2 save

# ステータス表示
echo ""
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
    deploy_script="${deploy_script//STAGE_VAR/$STAGE}"

    # SSHでデプロイスクリプト実行
    if ! gcloud compute ssh "$DEPLOY_USER@$GCE_INSTANCE_NAME" \
        --zone="$GCE_ZONE" \
        --project="$GCP_PROJECT_ID" \
        --command="$deploy_script"; then
        log_error "デプロイスクリプトの実行に失敗しました"
        exit 1
    fi
}

# GCEデプロイ結果表示
show_gce_results() {
    # 外部IP取得
    local external_ip
    external_ip=$(gcloud compute instances describe "$GCE_INSTANCE_NAME" \
        --zone="$GCE_ZONE" \
        --format='get(networkInterfaces[0].accessConfigs[0].natIP)' \
        --project="$GCP_PROJECT_ID")

    log_info "GCEデプロイ完了"
    log_info "ProxyServer URL: http://$external_ip:8080"
    log_info "ヘルスチェック: http://$external_ip:8080/health"

    # GitHub Actions出力
    if [ -n "${GITHUB_OUTPUT:-}" ]; then
        echo "gce_url=http://$external_ip:8080" >> "$GITHUB_OUTPUT"
        echo "gce_health_url=http://$external_ip:8080/health" >> "$GITHUB_OUTPUT"
    fi
}

# =============================================================================
# 並列デプロイ
# =============================================================================

deploy_parallel() {
    log_step "並列デプロイを開始します..."

    local vercel_success=1
    local gce_success=1

    # 安全な一時ディレクトリを作成
    TEMP_DIR=$(mktemp -d -t tumiki-deploy-XXXXXX) || {
        log_error "一時ディレクトリの作成に失敗しました"
        return 1
    }
    chmod 700 "$TEMP_DIR"

    # Vercelデプロイをバックグラウンドで開始
    {
        if deploy_vercel; then
            echo "0" > "$TEMP_DIR/vercel_status"
        else
            echo "1" > "$TEMP_DIR/vercel_status"
        fi
    } &
    VERCEL_PID=$!

    # GCEデプロイをバックグラウンドで開始
    {
        if deploy_gce; then
            echo "0" > "$TEMP_DIR/gce_status"
        else
            echo "1" > "$TEMP_DIR/gce_status"
        fi
    } &
    GCE_PID=$!

    # 両方の完了を待機
    log_info "デプロイの完了を待機中..."

    # プロセス完了を待機し、適切にエラーを検知
    if ! wait $VERCEL_PID; then
        log_error "Vercelデプロイプロセスが異常終了しました (PID: $VERCEL_PID)"
        vercel_success=1
    fi

    if ! wait $GCE_PID; then
        log_error "GCEデプロイプロセスが異常終了しました (PID: $GCE_PID)"
        gce_success=1
    fi

    # ステータスファイルから結果を読み取り（プロセスが正常に完了した場合）
    if [ -f "$TEMP_DIR/vercel_status" ]; then
        vercel_success=$(cat "$TEMP_DIR/vercel_status" 2>/dev/null || echo "1")
        [ "$vercel_success" != "0" ] && log_error "Vercelデプロイが失敗しました (status: $vercel_success)"
    else
        log_error "Vercelデプロイのステータスファイルが見つかりません"
        vercel_success=1
    fi

    if [ -f "$TEMP_DIR/gce_status" ]; then
        gce_success=$(cat "$TEMP_DIR/gce_status" 2>/dev/null || echo "1")
        [ "$gce_success" != "0" ] && log_error "GCEデプロイが失敗しました (status: $gce_success)"
    else
        log_error "GCEデプロイのステータスファイルが見つかりません"
        gce_success=1
    fi

    # クリーンアップ
    rm -rf "$TEMP_DIR"
    TEMP_DIR=""
    VERCEL_PID=""
    GCE_PID=""

    # 結果を確認
    if [ "$vercel_success" = "0" ] && [ "$gce_success" = "0" ]; then
        log_info "✅ 並列デプロイが正常に完了しました"
        return 0
    else
        log_error "❌ 並列デプロイで問題が発生しました"
        [ "$vercel_success" != "0" ] && log_error "  - Vercelデプロイが失敗"
        [ "$gce_success" != "0" ] && log_error "  - GCEデプロイが失敗"
        return 1
    fi
}

# =============================================================================
# メイン処理
# =============================================================================

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

    # 環境変数取得（共通）
    if [ "$TARGET" != "vercel" ]; then
        # Vercelのみの場合は環境変数取得不要
        if ! fetch_env_variables; then
            log_warn "環境変数の取得に失敗しましたが続行します"
        fi
    fi

    # パッケージビルド（共通）
    if [ "$TARGET" = "gce" ] || [ "$TARGET" = "all" ]; then
        build_packages
    fi

    # ターゲット別デプロイ
    case "$TARGET" in
        vercel)
            deploy_vercel
            ;;
        gce)
            deploy_gce
            ;;
        all)
            # productionの場合は並列実行、それ以外は順次実行
            if [ "$STAGE" = "production" ]; then
                log_info "本番環境へのデプロイのため、並列実行します"
                deploy_parallel
            else
                deploy_vercel
                deploy_gce
            fi
            ;;
        *)
            log_error "不明なターゲット: $TARGET"
            exit 1
            ;;
    esac

    # クリーンアップ
    if [ -f ".env.deploy" ]; then
        rm -f .env.deploy
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
    $0 --stage production

    # ドライラン
    $0 --dry-run

詳細:
    このスクリプトはVercelとGCEの両方または個別にデプロイを実行します。
    CI環境では自動的に非対話モードで動作し、ローカル環境では必要に応じて
    対話的な認証を行います。

    本番環境（--stage production）への両方デプロイ（--target all）の場合、
    VercelとGCEへのデプロイが並列実行され、デプロイ時間が短縮されます。

EOF
}

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