#!/usr/bin/env bash
# Keycloak Terraform管理スクリプト
# .env変数をTF_VAR_*に変換してTerraformを実行
#
# 使用例:
#   ./keycloak.sh init                                    # 初期化
#   ./keycloak.sh plan                                    # ローカル環境
#   ./keycloak.sh apply -var-file=terraform.tfvars.production  # 本番環境
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 共通ログ関数を読み込み
source "$SCRIPT_DIR/lib/log.sh"

cd "$SCRIPT_DIR/../terraform/keycloak"

# 必須環境変数リスト
REQUIRED_VARS=(
  "KEYCLOAK_ADMIN_USERNAME"
  "KEYCLOAK_ADMIN_PASSWORD"
  "KEYCLOAK_CLIENT_ID"
  "KEYCLOAK_CLIENT_SECRET"
  "KEYCLOAK_PROXY_CLIENT_SECRET"
  "KEYCLOAK_TEST_USER_PASSWORD"
)

# .env変数をTF_VAR_*に変換してエクスポート（plan, apply, destroyで必要）
export_tf_vars() {
  # 必須環境変数チェック
  if ! check_required_vars "${REQUIRED_VARS[@]}"; then
    log_error ".envファイルを確認し、必要な環境変数を設定してください"
    exit 1
  fi

  # 必須: .env設定が必要
  export TF_VAR_keycloak_admin_username="${KEYCLOAK_ADMIN_USERNAME}"
  export TF_VAR_keycloak_admin_password="${KEYCLOAK_ADMIN_PASSWORD}"
  export TF_VAR_manager_client_id="${KEYCLOAK_CLIENT_ID}"
  export TF_VAR_manager_client_secret="${KEYCLOAK_CLIENT_SECRET}"
  export TF_VAR_proxy_client_secret="${KEYCLOAK_PROXY_CLIENT_SECRET}"
  export TF_VAR_test_user_password="${KEYCLOAK_TEST_USER_PASSWORD}"
  # 任意: 空でもOK
  export TF_VAR_google_client_id="${GOOGLE_CLIENT_ID:-}"
  export TF_VAR_google_client_secret="${GOOGLE_CLIENT_SECRET:-}"

  log_info "Terraform変数をエクスポートしました"
}

case "${1:-}" in
  init)
    log_info "Terraformを初期化しています..."
    terraform init
    log_info "初期化完了"
    ;;
  plan)
    export_tf_vars
    shift  # 'plan'を除去
    log_info "変更をプレビューしています..."
    terraform plan "$@"  # 追加引数(-var-file等)をサポート
    ;;
  apply)
    export_tf_vars
    shift  # 'apply'を除去
    log_info "変更を適用しています..."
    terraform apply -auto-approve "$@"
    log_info "適用完了"
    ;;
  destroy)
    export_tf_vars
    shift  # 'destroy'を除去
    log_warn "リソースを削除します"
    terraform destroy -auto-approve "$@"
    log_info "削除完了"
    ;;
  *)
    echo "Usage: $0 {init|plan|apply|destroy} [terraform-args]"
    echo ""
    echo "Commands:"
    echo "  init     Initialize Terraform"
    echo "  plan     Preview changes"
    echo "  apply    Apply changes"
    echo "  destroy  Destroy resources"
    echo ""
    echo "Examples:"
    echo "  $0 init                                          # Initialize"
    echo "  $0 plan                                          # Local environment"
    echo "  $0 apply                                         # Apply to local"
    echo "  $0 plan -var-file=terraform.tfvars.production    # Production preview"
    echo "  $0 apply -var-file=terraform.tfvars.production   # Apply to production"
    exit 1
    ;;
esac
