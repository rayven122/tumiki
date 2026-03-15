# Keycloak Terraform 変数（本番環境）
# Terraform Cloud ワークスペース "keycloak-production" で使用
#
# シークレット値は Terraform Cloud の環境変数で設定:
#   - TF_VAR_keycloak_admin_password
#   - TF_VAR_manager_client_secret
#   - TF_VAR_proxy_client_secret
#   - TF_VAR_test_user_password
#   - TF_VAR_smtp_password
#   - TF_VAR_google_client_secret (オプション)

# Keycloak 接続設定
keycloak_url            = "https://auth.tumiki.cloud"
keycloak_admin_username = "admin"

# Realm 設定
realm_name         = "tumiki"
realm_display_name = "Tumiki Platform"

# クライアント設定
manager_client_id = "tumiki-manager"
proxy_client_id   = "tumiki-proxy"

# 許可されるリダイレクトURI（本番環境）
manager_redirect_uris = [
  "https://manager.tumiki.cloud/*"
]

manager_web_origins = [
  "https://manager.tumiki.cloud"
]

proxy_redirect_uris = [
  "http://localhost:6277/*",
  "http://localhost:6274/*"
]

# セキュリティ設定
ssl_required = "external"

# テーマ設定
login_theme   = "tumiki"
account_theme = "tumiki"

# テストユーザー設定
test_user_email      = "admin@tumiki.cloud"
test_user_first_name = "Admin"
test_user_last_name  = "User"

# SMTP 設定（本番環境）
smtp_host                = "smtp.gmail.com"
smtp_port                = "587"
smtp_from                = "no-reply@tumiki.cloud"
smtp_from_display_name   = "Tumiki"
