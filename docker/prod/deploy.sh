#!/bin/bash
# Keycloak デプロイスクリプト
# さくらのクラウドVM向け（SSH config 対応版）

set -e

# ===========================================
# 設定
# ===========================================
# SSH config で定義されたホスト名を使用
SSH_HOST_KEYCLOAK="${SSH_HOST_KEYCLOAK:-tumiki-sakura-keycloak}"
REMOTE_DIR="/opt/keycloak"
# PostgreSQL接続先（tumiki-keycloakから接続）
DB_HOST="192.168.0.100"

# スクリプトのディレクトリ
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 共通Keycloak設定ディレクトリ（docker/keycloak/）
KEYCLOAK_DIR="$(cd "$SCRIPT_DIR/../keycloak" && pwd)"

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ===========================================
# ヘルパー関数
# ===========================================
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

ssh_keycloak() {
    ssh "$SSH_HOST_KEYCLOAK" "$@"
}

scp_keycloak() {
    scp "$@" "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/"
}

# ===========================================
# ヘルプ
# ===========================================
show_help() {
    echo "Keycloak デプロイスクリプト（さくらのクラウド向け）"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup-db    PostgreSQL データベースを準備"
    echo "  setup       初回セットアップ（Dockerインストール含む）"
    echo "  deploy      設定ファイルをデプロイして起動"
    echo "  update      設定を更新して再起動"
    echo "  logs        ログを表示"
    echo "  status      ステータス確認"
    echo "  stop        サービス停止"
    echo "  restart     サービス再起動"
    echo "  shell       Keycloak VMにSSH接続"
    echo ""
    echo "前提条件:"
    echo "  ~/.ssh/config に以下のホストが定義されていること:"
    echo "    - tumiki-sakura-keycloak (Keycloak VM)"
    echo "  PostgreSQL (192.168.0.100) への接続は tumiki-keycloak 経由で行います"
    echo ""
    echo "Example:"
    echo "  $0 setup-db   # 最初に実行: DBを準備"
    echo "  $0 setup      # 次に実行: Dockerをインストール"
    echo "  $0 deploy     # 最後に実行: Keycloakをデプロイ"
}

# ===========================================
# コマンド実装
# ===========================================

cmd_setup_db() {
    log_step "PostgreSQL データベース接続を確認中..."

    # .envファイルから設定を読み込み
    if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
        log_error ".envファイルが見つかりません"
        log_info "cp .env.example .env して値を設定してください"
        exit 1
    fi

    source "$SCRIPT_DIR/.env"

    if [[ -z "$KC_DB_PASSWORD" ]]; then
        log_error "KC_DB_PASSWORD が設定されていません"
        exit 1
    fi

    log_info "tumiki-keycloak から PostgreSQL への接続をテスト中..."

    # psqlクライアントをインストール（必要な場合）
    ssh_keycloak "which psql > /dev/null 2>&1" || {
        log_info "PostgreSQL クライアントをインストール中..."
        ssh_keycloak "sudo apt-get update && sudo apt-get install -y postgresql-client"
    }

    # 接続テスト
    if ssh_keycloak "PGPASSWORD='$KC_DB_PASSWORD' psql -h $DB_HOST -U ${KC_DB_USERNAME:-keycloak} -d ${KC_DB_NAME:-keycloak} -c 'SELECT 1' > /dev/null 2>&1"; then
        log_info "✓ PostgreSQL への接続成功！"
        log_info "  ホスト: $DB_HOST"
        log_info "  データベース: ${KC_DB_NAME:-keycloak}"
        log_info "  ユーザー: ${KC_DB_USERNAME:-keycloak}"
    else
        log_error "PostgreSQL への接続に失敗しました"
        echo ""
        log_warn "以下の手順でデータベースを手動でセットアップしてください:"
        echo ""
        echo "  1. PostgreSQL サーバー (192.168.0.100) にログイン"
        echo ""
        echo "  2. データベースとユーザーを作成:"
        echo "     sudo -u postgres psql"
        echo "     CREATE DATABASE keycloak;"
        echo "     CREATE USER keycloak WITH ENCRYPTED PASSWORD '<password>';"
        echo "     GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;"
        echo "     \\c keycloak"
        echo "     GRANT ALL ON SCHEMA public TO keycloak;"
        echo "     \\q"
        echo ""
        echo "  3. pg_hba.conf に追加:"
        echo "     host    keycloak    keycloak    192.168.0.90/32    scram-sha-256"
        echo ""
        echo "  4. postgresql.conf を確認:"
        echo "     listen_addresses = '*'"
        echo ""
        echo "  5. PostgreSQL を再読み込み:"
        echo "     sudo systemctl reload postgresql"
        echo ""
        exit 1
    fi

    log_info "PostgreSQL セットアップ確認完了"
}

cmd_setup() {
    log_step "Keycloak VM の初回セットアップを開始..."

    # .envファイルの存在確認
    if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
        log_error ".envファイルが見つかりません"
        log_info "cp .env.example .env して値を設定してください"
        exit 1
    fi

    log_info "SSH接続をテスト中..."
    if ! ssh_keycloak "echo 'SSH connection successful'"; then
        log_error "SSH接続に失敗しました"
        log_info "~/.ssh/config に $SSH_HOST_KEYCLOAK が定義されているか確認してください"
        exit 1
    fi

    log_info "Dockerをインストール中..."
    ssh_keycloak "which docker > /dev/null 2>&1" && {
        log_warn "Docker は既にインストールされています"
    } || {
        ssh_keycloak "curl -fsSL https://get.docker.com | sudo sh"
        ssh_keycloak "sudo usermod -aG docker \$USER"
        log_warn "Dockerグループの変更を反映するため、再接続が必要です"
    }

    log_info "ディレクトリを作成中..."
    ssh_keycloak "sudo mkdir -p $REMOTE_DIR/keycloak/init-scripts && sudo chown -R \$USER:\$USER $REMOTE_DIR"

    log_info "初回セットアップ完了"
    log_info ""
    log_info "次のステップ:"
    log_info "  1. SSH再接続: ssh $SSH_HOST_KEYCLOAK (Dockerグループ反映のため)"
    log_info "  2. デプロイ: $0 deploy"
}

cmd_deploy() {
    log_step "Keycloak をデプロイ中..."

    # .envファイルの存在確認
    if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
        log_error ".envファイルが見つかりません"
        exit 1
    fi

    # 必須環境変数のチェック
    source "$SCRIPT_DIR/.env"
    local required_vars=("KEYCLOAK_ADMIN_PASSWORD" "KC_DB_HOST" "KC_DB_PASSWORD" "KC_HOSTNAME")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "$var が設定されていません"
            exit 1
        fi
    done

    log_info "設定ファイルをアップロード中..."

    # メイン設定ファイル
    scp "$SCRIPT_DIR/compose.yaml" "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/"
    scp "$SCRIPT_DIR/.env" "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/"

    # nginx設定ファイル
    ssh_keycloak "mkdir -p $REMOTE_DIR/nginx"
    scp "$SCRIPT_DIR/nginx/nginx.conf" "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/nginx/"

    # Keycloak設定ファイル（共通設定ディレクトリ docker/keycloak/ から）
    ssh_keycloak "mkdir -p $REMOTE_DIR/keycloak/init-scripts"
    scp "$KEYCLOAK_DIR/tumiki-realm.json" "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/keycloak/"
    scp "$KEYCLOAK_DIR/setup-keycloak.sh" "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/keycloak/"
    scp "$KEYCLOAK_DIR/entrypoint.sh" "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/keycloak/"
    scp -r "$KEYCLOAK_DIR/init-scripts/"* "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/keycloak/init-scripts/" 2>/dev/null || true

    # 実行権限を付与
    ssh_keycloak "chmod +x $REMOTE_DIR/keycloak/*.sh"

    # .env ファイルの権限を制限
    ssh_keycloak "chmod 600 $REMOTE_DIR/.env"

    log_info "Docker イメージを取得中..."
    ssh_keycloak "cd $REMOTE_DIR && docker compose pull"

    log_info "コンテナを起動中..."
    ssh_keycloak "cd $REMOTE_DIR && docker compose up -d"

    log_info ""
    log_info "デプロイ完了！"
    log_info ""
    log_info "確認コマンド:"
    log_info "  ステータス: $0 status"
    log_info "  ログ:       $0 logs"
    log_info ""
    log_info "アクセス URL: https://$KC_HOSTNAME"
}

cmd_update() {
    log_step "設定を更新中..."

    # .envファイルの存在確認
    if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
        log_error ".envファイルが見つかりません"
        exit 1
    fi

    log_info "設定ファイルをアップロード中..."
    scp "$SCRIPT_DIR/compose.yaml" "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/"
    scp "$SCRIPT_DIR/.env" "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/"
    ssh_keycloak "chmod 600 $REMOTE_DIR/.env"

    # nginx設定ファイルも更新
    scp "$SCRIPT_DIR/nginx/nginx.conf" "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/nginx/"

    # Keycloak設定ファイルも更新（共通設定ディレクトリから）
    scp "$KEYCLOAK_DIR/tumiki-realm.json" "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/keycloak/"
    scp "$KEYCLOAK_DIR/setup-keycloak.sh" "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/keycloak/"
    scp "$KEYCLOAK_DIR/entrypoint.sh" "$SSH_HOST_KEYCLOAK:$REMOTE_DIR/keycloak/"
    ssh_keycloak "chmod +x $REMOTE_DIR/keycloak/*.sh"

    log_info "コンテナを再起動中..."
    ssh_keycloak "cd $REMOTE_DIR && docker compose up -d --force-recreate"

    log_info "更新完了！"
}

cmd_logs() {
    log_info "ログを表示中... (Ctrl+C で終了)"
    ssh_keycloak "cd $REMOTE_DIR && docker compose logs -f --tail=100"
}

cmd_status() {
    log_info "ステータスを確認中..."
    echo ""
    ssh_keycloak "cd $REMOTE_DIR && docker compose ps"
    echo ""

    # ヘルスチェック
    log_info "Keycloak ヘルスチェック:"
    ssh_keycloak "curl -sf http://localhost:8080/health/ready 2>/dev/null && echo ' OK' || echo ' NOT READY'"
}

cmd_stop() {
    log_step "サービスを停止中..."
    ssh_keycloak "cd $REMOTE_DIR && docker compose stop"
    log_info "停止完了"
}

cmd_restart() {
    log_step "サービスを再起動中..."
    ssh_keycloak "cd $REMOTE_DIR && docker compose restart"
    log_info "再起動完了"
}

cmd_shell() {
    log_info "Keycloak VM に接続中..."
    ssh_keycloak
}

# ===========================================
# メイン処理
# ===========================================
COMMAND="${1:-}"

case $COMMAND in
    setup-db)
        cmd_setup_db
        ;;
    setup)
        cmd_setup
        ;;
    deploy)
        cmd_deploy
        ;;
    update)
        cmd_update
        ;;
    logs)
        cmd_logs
        ;;
    status)
        cmd_status
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    shell)
        cmd_shell
        ;;
    -h|--help|"")
        show_help
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
