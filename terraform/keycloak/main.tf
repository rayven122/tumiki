# Keycloak Terraform設定
# Tumiki開発環境のKeycloak設定をコードで管理
#
# 使用方法:
#   ローカル開発: terraform init && terraform apply
#   本番環境:     terraform init -backend-config=backend-cloud.hcl
#
# 注意: ローカルと本番でbackendが異なるため、切り替え時は
#       rm -rf .terraform && terraform init ... が必要

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    keycloak = {
      source  = "keycloak/keycloak"
      version = ">= 5.0.0"
    }
  }
}

# Keycloak Provider設定
# Password Grant認証（admin-cli）で開発環境向けにシンプル化
provider "keycloak" {
  client_id = "admin-cli"
  username  = var.keycloak_admin_username
  password  = var.keycloak_admin_password
  url       = var.keycloak_url
}
