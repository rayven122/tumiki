#!/usr/bin/env bash
# Keycloakテーマをサーバーにデプロイするスクリプト
#
# 使用方法:
#   pnpm keycloak:theme:deploy   # デプロイ実行
#   pnpm keycloak:theme:dry-run  # ドライラン（実際には転送しない）
#
# SSHホスト名は ~/.ssh/config に以下のように登録:
#   Host tumiki-sakura-keycloak
#     HostName <サーバーIP>
#     User ubuntu
#     IdentityFile ~/.ssh/your-key
#
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

# 共通ログ関数を読み込み
source "$SCRIPT_DIR/lib/log.sh"

# 設定
SSH_HOST="tumiki-sakura-keycloak"
LOCAL_THEMES_DIR="$PROJECT_ROOT/docker/keycloak/themes"
REMOTE_THEMES_DIR="/opt/keycloak/keycloak/themes"

# オプション解析
DRY_RUN=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
fi

# ========================================
# メイン処理
# ========================================
main() {
  log_info "=== Keycloakテーマデプロイ ==="

  # ローカルテーマディレクトリ確認
  if [[ ! -d "$LOCAL_THEMES_DIR" ]]; then
    log_error "テーマディレクトリが見つかりません: $LOCAL_THEMES_DIR"
    exit 1
  fi

  # SSH接続確認
  log_info "SSH接続を確認中..."
  if ! ssh -o ConnectTimeout=5 "$SSH_HOST" "echo ok" > /dev/null 2>&1; then
    log_error "SSH接続に失敗しました: $SSH_HOST"
    exit 1
  fi
  log_info "SSH接続OK"

  if [[ -n "$DRY_RUN" ]]; then
    log_warn "ドライランモード（実際には転送しません）"
  fi

  # テーマをデプロイ
  log_info "テーマを同期中..."
  rsync -avz --delete $DRY_RUN \
    "$LOCAL_THEMES_DIR/" \
    "$SSH_HOST:$REMOTE_THEMES_DIR/"

  if [[ -z "$DRY_RUN" ]]; then
    log_info "テーマ同期完了"

    # Keycloakキャッシュクリア
    log_info "Keycloakのテーマキャッシュをクリア中..."
    ssh "$SSH_HOST" "cd /opt/keycloak && docker compose exec -T keycloak /opt/keycloak/bin/kc.sh build" 2>/dev/null || true
    log_info "キャッシュクリア完了（反映には再ログインが必要な場合があります）"
  fi

  echo ""
  log_info "=== 完了 ==="
}

main "$@"
