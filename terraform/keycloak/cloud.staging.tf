# Terraform Cloud 設定（ステージング環境）
# ステージング環境のKeycloak設定をTerraform Cloudで管理
#
# 使用方法:
#   terraform init -backend-config=cloud.staging.tf
#   terraform apply -var-file=environments/staging.tfvars

terraform {
  cloud {
    hostname     = "app.terraform.io"
    organization = "tumiki"
    workspaces {
      name = "keycloak-staging"
    }
  }
}
