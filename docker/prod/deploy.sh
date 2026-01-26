#!/usr/bin/env bash
# 本番環境 Keycloak デプロイスクリプト
# さくらのクラウドのVMにSSH経由でKeycloakをデプロイ
set -euo pipefail

# ===================================
# 設定
# ===================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# SSH接続設定（~/.ssh/configで設定済みのホスト名）
KEYCLOAK_HOST="${KEYCLOAK_SSH_HOST:-tumiki-keycloak}"
DB_HOST="${DB_SSH_HOST:-tumiki-prod-db}"

# リモートパス
REMOTE_DIR="/home/tumiki/keycloak"

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# ===================================
# 環境変数チェック
# ===================================
check_env() {
    local missing=()

    # 必須環境変数
    local required_vars=(
        "KEYCLOAK_ADMIN_USERNAME"
        "KEYCLOAK_ADMIN_PASSWORD"
        "KC_DB_HOST"
        "KC_DB_NAME"
        "KC_DB_USERNAME"
        "KC_DB_PASSWORD"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing+=("$var")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required environment variables:"
        for var in "${missing[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "Please set these in docker/prod/.env or export them."
        echo "See docker/prod/.env.example for reference."
        exit 1
    fi
}

# ===================================
# データベース接続確認
# ===================================
setup_db() {
    log_info "Checking PostgreSQL connection..."

    ssh "$DB_HOST" "psql -h localhost -U postgres -c '\\l'" || {
        log_error "Cannot connect to PostgreSQL on $DB_HOST"
        exit 1
    }

    log_info "Creating Keycloak database if not exists..."
    ssh "$DB_HOST" "psql -h localhost -U postgres -c \"SELECT 1 FROM pg_database WHERE datname='${KC_DB_NAME}'\" | grep -q 1 || \
        psql -h localhost -U postgres -c \"CREATE DATABASE ${KC_DB_NAME}\""

    ssh "$DB_HOST" "psql -h localhost -U postgres -c \"SELECT 1 FROM pg_roles WHERE rolname='${KC_DB_USERNAME}'\" | grep -q 1 || \
        psql -h localhost -U postgres -c \"CREATE USER ${KC_DB_USERNAME} WITH PASSWORD '${KC_DB_PASSWORD}'\""

    ssh "$DB_HOST" "psql -h localhost -U postgres -c \"GRANT ALL PRIVILEGES ON DATABASE ${KC_DB_NAME} TO ${KC_DB_USERNAME}\""

    log_info "Database setup complete"
}

# ===================================
# Docker/Docker Composeインストール
# ===================================
setup() {
    log_info "Setting up Docker on Keycloak VM..."

    # Dockerインストール確認・インストール
    ssh "$KEYCLOAK_HOST" 'command -v docker > /dev/null 2>&1' || {
        log_info "Installing Docker..."
        ssh "$KEYCLOAK_HOST" 'curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER'
    }

    # Docker Composeプラグイン確認
    ssh "$KEYCLOAK_HOST" 'docker compose version > /dev/null 2>&1' || {
        log_info "Installing Docker Compose plugin..."
        ssh "$KEYCLOAK_HOST" 'sudo apt-get update && sudo apt-get install -y docker-compose-plugin'
    }

    # リモートディレクトリ作成
    ssh "$KEYCLOAK_HOST" "mkdir -p $REMOTE_DIR/nginx"

    log_info "Docker setup complete"
}

# ===================================
# ファイル転送・デプロイ
# ===================================
deploy() {
    check_env

    log_info "Deploying Keycloak to production..."

    # 設定ファイル転送
    log_info "Transferring configuration files..."
    scp "$SCRIPT_DIR/compose.yaml" "$KEYCLOAK_HOST:$REMOTE_DIR/"
    scp "$SCRIPT_DIR/nginx/nginx.conf" "$KEYCLOAK_HOST:$REMOTE_DIR/nginx/"

    # .envファイル生成・転送
    log_info "Generating .env file..."
    cat > "/tmp/keycloak-prod.env" << EOF
KEYCLOAK_ADMIN_USERNAME=${KEYCLOAK_ADMIN_USERNAME}
KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}
KC_DB_HOST=${KC_DB_HOST}
KC_DB_NAME=${KC_DB_NAME}
KC_DB_USERNAME=${KC_DB_USERNAME}
KC_DB_PASSWORD=${KC_DB_PASSWORD}
EOF
    scp "/tmp/keycloak-prod.env" "$KEYCLOAK_HOST:$REMOTE_DIR/.env"
    rm "/tmp/keycloak-prod.env"

    # コンテナ起動
    log_info "Starting Keycloak containers..."
    ssh "$KEYCLOAK_HOST" "cd $REMOTE_DIR && docker compose pull && docker compose up -d"

    # ヘルスチェック待機
    log_info "Waiting for Keycloak to be healthy..."
    local max_attempts=60
    local attempt=0
    while [[ $attempt -lt $max_attempts ]]; do
        if ssh "$KEYCLOAK_HOST" "curl -sf http://localhost:8080/health/ready > /dev/null 2>&1"; then
            log_info "Keycloak is ready!"
            break
        fi
        ((attempt++))
        echo -n "."
        sleep 5
    done

    if [[ $attempt -eq $max_attempts ]]; then
        log_warn "Keycloak did not become healthy in time. Check logs with: pnpm keycloak:prod:logs"
    fi

    log_info "Deployment complete"
    echo ""
    echo "Next steps:"
    echo "  1. Apply Terraform configuration: pnpm keycloak:prod:apply"
    echo "  2. Check status: pnpm keycloak:prod:status"
    echo "  3. View logs: pnpm keycloak:prod:logs"
}

# ===================================
# ステータス確認
# ===================================
status() {
    log_info "Checking Keycloak status..."
    ssh "$KEYCLOAK_HOST" "cd $REMOTE_DIR && docker compose ps"
    echo ""

    log_info "Health check..."
    if ssh "$KEYCLOAK_HOST" "curl -sf http://localhost:8080/health/ready > /dev/null 2>&1"; then
        echo -e "${GREEN}Keycloak is healthy${NC}"
    else
        echo -e "${RED}Keycloak is not healthy${NC}"
    fi
}

# ===================================
# ログ表示
# ===================================
logs() {
    ssh "$KEYCLOAK_HOST" "cd $REMOTE_DIR && docker compose logs -f --tail=100"
}

# ===================================
# サービス再起動
# ===================================
restart() {
    log_info "Restarting Keycloak..."
    ssh "$KEYCLOAK_HOST" "cd $REMOTE_DIR && docker compose restart"
    log_info "Restart complete"
}

# ===================================
# SSHシェル接続
# ===================================
shell() {
    log_info "Connecting to Keycloak VM..."
    ssh "$KEYCLOAK_HOST"
}

# ===================================
# コンテナ停止
# ===================================
stop() {
    log_info "Stopping Keycloak..."
    ssh "$KEYCLOAK_HOST" "cd $REMOTE_DIR && docker compose stop"
    log_info "Stopped"
}

# ===================================
# コンテナ削除
# ===================================
down() {
    log_warn "This will remove all Keycloak containers and volumes"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ssh "$KEYCLOAK_HOST" "cd $REMOTE_DIR && docker compose down -v"
        log_info "Removed"
    else
        log_info "Cancelled"
    fi
}

# ===================================
# 使用方法
# ===================================
usage() {
    cat << EOF
Usage: $0 <command>

Commands:
  setup-db    Check PostgreSQL connection and create database
  setup       Install Docker and prepare Keycloak VM
  deploy      Deploy Keycloak containers to production
  status      Check Keycloak status
  logs        View Keycloak logs (follows)
  restart     Restart Keycloak services
  shell       SSH into Keycloak VM
  stop        Stop Keycloak containers
  down        Remove Keycloak containers and volumes

Environment:
  Set environment variables in docker/prod/.env or export them.
  See docker/prod/.env.example for required variables.

SSH Configuration:
  Configure SSH hosts in ~/.ssh/config:
    Host tumiki-keycloak
      HostName <keycloak-vm-ip>
      User tumiki
      IdentityFile ~/.ssh/id_rsa

    Host tumiki-prod-db
      HostName <db-vm-ip>
      User tumiki
      IdentityFile ~/.ssh/id_rsa

Examples:
  $0 setup-db    # Prepare database
  $0 setup       # Install Docker
  $0 deploy      # Deploy Keycloak
  $0 status      # Check status
EOF
}

# ===================================
# メイン
# ===================================

# .envファイルを読み込み（存在する場合）
if [[ -f "$SCRIPT_DIR/.env" ]]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

case "${1:-}" in
    setup-db) setup_db ;;
    setup) setup ;;
    deploy) deploy ;;
    status) status ;;
    logs) logs ;;
    restart) restart ;;
    shell) shell ;;
    stop) stop ;;
    down) down ;;
    *) usage ;;
esac
