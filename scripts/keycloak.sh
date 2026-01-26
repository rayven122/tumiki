#!/usr/bin/env bash
# Keycloak Terraform管理スクリプト
# .env変数をTF_VAR_*に変換してTerraformを実行
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
    terraform plan
    ;;
  apply)
    export_tf_vars
    terraform apply -auto-approve
    ;;
  destroy)
    export_tf_vars
    terraform destroy -auto-approve
    ;;
  *)
    echo "Usage: $0 {init|plan|apply|destroy}"
    exit 1
    ;;
esac
