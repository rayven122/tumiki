# Terraform Cloud Backend設定（本番環境用）
#
# 使用方法:
#   terraform init -backend-config=backend-cloud.hcl
#
# 事前準備:
#   1. Terraform Cloudにログイン: terraform login
#   2. Organization "tumiki" に参加
#   3. Workspace "keycloak-production" が作成済み（Execution Mode: CLI-driven）

hostname     = "app.terraform.io"
organization = "tumiki"
workspaces { name = "keycloak-production" }
