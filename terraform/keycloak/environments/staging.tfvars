# Keycloak Terraform 変数（ステージング環境）
# Terraform Cloud ワークスペース "keycloak-staging" で使用
#
# シークレット値は Terraform Cloud の環境変数で設定:
#   - TF_VAR_keycloak_admin_password
#   - TF_VAR_manager_client_secret
#   - TF_VAR_proxy_client_secret
#   - TF_VAR_test_user_password
#   - TF_VAR_smtp_password

# Keycloak 接続設定（ステージング環境）
keycloak_url            = "https://auth-stg.tumiki.cloud"
keycloak_admin_username = "admin"

# Realm 設定
realm_name         = "tumiki"
realm_display_name = "Tumiki Platform (Staging)"

# クライアント設定
manager_client_id = "tumiki-manager"
proxy_client_id   = "tumiki-proxy"

# 許可されるリダイレクトURI（ステージング環境）
manager_redirect_uris = [
  "http://localhost:3000/*",
  "https://localhost:3000/*",
  "https://stg.tumiki.cloud/*"
]

manager_web_origins = [
  "http://localhost:3000",
  "https://localhost:3000",
  "https://stg.tumiki.cloud"
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

# テストユーザー設定（ステージング環境）
test_user_email      = "admin@stg.tumiki.cloud"
test_user_first_name = "Admin"
test_user_last_name  = "Staging"

# SMTP 設定（ステージング環境）
smtp_host                = "smtp.gmail.com"
smtp_port                = "587"
smtp_from                = "no-reply-stg@tumiki.cloud"
smtp_from_display_name   = "Tumiki Staging"

# Google IdP 設定（ステージング環境では無効化）
google_client_id = ""
