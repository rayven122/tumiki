#!/bin/bash
set -euo pipefail

# =============================================================================
# Tumiki デプロイスクリプト - GCE
# =============================================================================

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 共通関数を読み込み
source "${SCRIPT_DIR}/deploy-common.sh"

# GCE前提条件チェック
check_gce_prerequisites() {
    # gcloud CLI確認
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLIが見つかりません"
        exit 1
    fi

    # gcloud認証確認（改善：詳細なエラー情報を提供）
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

    # インスタンス確認
    if ! gcloud compute instances describe "$GCE_INSTANCE_NAME" \
        --zone="$GCE_ZONE" \
        --project="$GCP_PROJECT_ID" &>/dev/null; then
        log_error "インスタンス $GCE_INSTANCE_NAME が見つかりません"
        log_error "Zone: $GCE_ZONE, Project: $GCP_PROJECT_ID"
        exit 1
    fi
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

    # 変数置換（セキュリティ：特殊文字をエスケープ）
    # 環境変数値をエスケープしてから置換
    ESCAPED_REMOTE_PATH=$(printf '%s\n' "$REMOTE_PATH" | sed 's/[[\.*^$()+?{|]/\\&/g')
    ESCAPED_REPO_URL=$(printf '%s\n' "$REPO_URL" | sed 's/[[\.*^$()+?{|]/\\&/g')
    ESCAPED_BRANCH=$(printf '%s\n' "$BRANCH" | sed 's/[[\.*^$()+?{|]/\\&/g')
    ESCAPED_STAGE=$(printf '%s\n' "$STAGE" | sed 's/[[\.*^$()+?{|]/\\&/g')

    deploy_script="${deploy_script//REMOTE_PATH_VAR/$ESCAPED_REMOTE_PATH}"
    deploy_script="${deploy_script//REPO_URL_VAR/$ESCAPED_REPO_URL}"
    deploy_script="${deploy_script//BRANCH_VAR/$ESCAPED_BRANCH}"
    deploy_script="${deploy_script//STAGE_VAR/$ESCAPED_STAGE}"

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

# GCEデプロイメイン
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

# メイン処理（直接実行時）
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    export_common_vars
    check_gce_prerequisites
    deploy_gce
fi