#!/usr/bin/env bash
# Keycloak Terraform管理スクリプト
# .env変数をTF_VAR_*に変換してTerraformを実行
#
# 使用例:
#   ./keycloak.sh init                                    # 初期化
#   ./keycloak.sh plan                                    # ローカル環境
#   ./keycloak.sh apply -var-file=terraform.tfvars.production  # 本番環境
set -euo pipefail

cd "$(dirname "$0")/../terraform/keycloak"

# .env変数をTF_VAR_*に変換してエクスポート（plan, apply, destroyで必要）
export_tf_vars() {
  # 必須: .env設定が必要
  export TF_VAR_keycloak_admin_username="${KEYCLOAK_ADMIN_USERNAME}"
  export TF_VAR_keycloak_admin_password="${KEYCLOAK_ADMIN_PASSWORD}"
  export TF_VAR_manager_client_id="${KEYCLOAK_CLIENT_ID}"
  export TF_VAR_manager_client_secret="${KEYCLOAK_CLIENT_SECRET}"
  # 任意: 空でもOK
  export TF_VAR_google_client_id="${GOOGLE_CLIENT_ID:-}"
  export TF_VAR_google_client_secret="${GOOGLE_CLIENT_SECRET:-}"
}

case "${1:-}" in
  init)
    terraform init
    ;;
  plan)
    export_tf_vars
    shift  # 'plan'を除去
    terraform plan "$@"  # 追加引数(-var-file等)をサポート
    ;;
  apply)
    export_tf_vars
    shift  # 'apply'を除去
    terraform apply -auto-approve "$@"
    ;;
  destroy)
    export_tf_vars
    shift  # 'destroy'を除去
    terraform destroy -auto-approve "$@"
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
