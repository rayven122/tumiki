# Terraform Cloud設定（本番環境用）
# ローカル開発時はこのファイルが自動的に無効化されます

terraform {
  cloud {
    hostname     = "app.terraform.io"
    organization = "tumiki"
    workspaces {
      name = "keycloak-production"
    }
  }
}
