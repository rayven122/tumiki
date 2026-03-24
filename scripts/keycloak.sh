#!/usr/bin/env bash
# Keycloak Terraform管理スクリプト
#
# 使用例:
#   ./keycloak.sh local init      # ローカル環境を初期化
#   ./keycloak.sh local apply     # ローカル環境に適用
#   ./keycloak.sh prod plan       # 本番環境のプレビュー
#   ./keycloak.sh prod apply      # 本番環境に適用
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
TF_DIR="$SCRIPT_DIR/../terraform/keycloak"
CLOUD_TF="$TF_DIR/cloud.tf"
CLOUD_TF_DISABLED="$TF_DIR/cloud.tf.disabled"

source "$SCRIPT_DIR/lib/log.sh"

# .envファイルから環境変数を読み込み
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
  log_info ".envファイルを読み込みました"
fi

cd "$TF_DIR"

# 必須環境変数リスト
REQUIRED_VARS=(
  "KEYCLOAK_ADMIN_USERNAME"
  "KEYCLOAK_ADMIN_PASSWORD"
  "KEYCLOAK_CLIENT_ID"
  "KEYCLOAK_CLIENT_SECRET"
  "KEYCLOAK_PROXY_CLIENT_SECRET"
  "KEYCLOAK_TEST_USER_PASSWORD"
  "SMTP_HOST"
  "SMTP_USER"
  "SMTP_PASS"
  "FROM_EMAIL"
)

# TF_VAR_*にエクスポート
export_tf_vars() {
  if ! check_required_vars "${REQUIRED_VARS[@]}"; then
    log_error ".envファイルを確認し、必要な環境変数を設定してください"
    exit 1
  fi

  export TF_VAR_keycloak_admin_username="${KEYCLOAK_ADMIN_USERNAME}"
  export TF_VAR_keycloak_admin_password="${KEYCLOAK_ADMIN_PASSWORD}"
  export TF_VAR_manager_client_id="${KEYCLOAK_CLIENT_ID}"
  export TF_VAR_manager_client_secret="${KEYCLOAK_CLIENT_SECRET}"
  export TF_VAR_registry_client_id="${REGISTRY_KEYCLOAK_CLIENT_ID:-tumiki-registry}"
  export TF_VAR_registry_client_secret="${REGISTRY_KEYCLOAK_CLIENT_SECRET:-dev-registry-secret-change-in-production}"
  export TF_VAR_proxy_client_secret="${KEYCLOAK_PROXY_CLIENT_SECRET}"
  export TF_VAR_test_user_password="${KEYCLOAK_TEST_USER_PASSWORD}"
  export TF_VAR_smtp_host="${SMTP_HOST}"
  export TF_VAR_smtp_port="${SMTP_PORT:-587}"
  export TF_VAR_smtp_user="${SMTP_USER}"
  export TF_VAR_smtp_password="${SMTP_PASS}"
  export TF_VAR_smtp_from="${FROM_EMAIL}"
  export TF_VAR_smtp_from_display_name="${FROM_NAME:-Tumiki}"
  export TF_VAR_google_client_id="${GOOGLE_CLIENT_ID:-}"
  export TF_VAR_google_client_secret="${GOOGLE_CLIENT_SECRET:-}"

  log_info "Terraform変数をエクスポートしました"
}

# cloud.tfを無効化/復元
disable_cloud() { [ -f "$CLOUD_TF" ] && mv "$CLOUD_TF" "$CLOUD_TF_DISABLED"; }
restore_cloud() { [ -f "$CLOUD_TF_DISABLED" ] && mv "$CLOUD_TF_DISABLED" "$CLOUD_TF"; }
trap restore_cloud EXIT

# 使用方法
usage() {
  echo "Usage: $0 {local|prod} {init|plan|apply|destroy}"
  echo ""
  echo "  local  ローカル開発環境（cloud.tfを無効化）"
  echo "  prod   本番環境（Terraform Cloud）"
  exit 1
}

[ -z "${1:-}" ] && usage
ENV="$1"
COMMAND="${2:-}"
shift 2 || usage

case "$ENV" in
  local)
    disable_cloud
    log_info "ローカルモード"
    ;;
  prod|production)
    log_info "本番モード（Terraform Cloud）"
    ;;
  *)
    usage
    ;;
esac

case "$COMMAND" in
  init)
    [ "$ENV" = "local" ] && rm -rf .terraform 2>/dev/null || true
    terraform init
    ;;
  plan)
    export_tf_vars
    terraform plan "$@"
    ;;
  apply)
    export_tf_vars
    terraform apply -auto-approve "$@"
    ;;
  destroy)
    export_tf_vars
    terraform destroy -auto-approve "$@"
    ;;
  *)
    usage
    ;;
esac
