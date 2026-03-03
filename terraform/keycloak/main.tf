# Keycloak Terraform設定
# Tumiki開発環境のKeycloak設定をコードで管理
#
# 使用方法:
#   ローカル開発: TF_WORKSPACE=default terraform init -backend=false && terraform apply
#   本番環境(CI): terraform init && terraform plan -var-file=terraform.tfvars.production
#
# 注意: ローカル開発時は -backend=false でCloudバックエンドをスキップ

terraform {
  required_version = ">= 1.9.0"

  # Terraform Cloud backend（CI/CD用）
  cloud {
    hostname     = "app.terraform.io"
    organization = "tumiki"
    workspaces {
      name = "keycloak-production"
    }
  }

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
