# Keycloak Terraform設定
# Tumiki開発環境のKeycloak設定をコードで管理

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
