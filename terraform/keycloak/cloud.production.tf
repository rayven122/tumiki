# Terraform Cloud 設定（本番環境）
# 本番環境のKeycloak設定をTerraform Cloudで管理
#
# 使用方法:
#   terraform init -backend-config=cloud.production.tf
#   terraform apply -var-file=environments/production.tfvars

terraform {
  cloud {
    hostname     = "app.terraform.io"
    organization = "tumiki"
    workspaces {
      name = "keycloak-production"
    }
  }
}
