# Keycloak Terraform設定
# Tumiki環境のKeycloak設定をコードで管理
#
# 使用方法:
#   ローカル開発: pnpm keycloak:init && pnpm keycloak:apply
#   本番環境: pnpm keycloak:prod:plan && pnpm keycloak:prod:apply

terraform {
  required_version = ">= 1.9.0"

  required_providers {
    keycloak = {
      source  = "keycloak/keycloak"
      version = ">= 5.0.0"
    }
  }
}

# Keycloak Provider設定
provider "keycloak" {
  client_id = "admin-cli"
  username  = var.keycloak_admin_username
  password  = var.keycloak_admin_password
  url       = var.keycloak_url
}

# Master realmのデータソース（Keycloak接続確認用）
data "keycloak_realm" "master" {
  realm = "master"
}
