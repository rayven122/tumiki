# Keycloak Terraform開発環境デフォルト値
# このファイルは開発環境用のデフォルト値を定義します
# 本番環境では別のtfvarsファイルを使用してください

# Keycloak接続設定
keycloak_url            = "http://localhost:8888"
keycloak_admin_username = "admin"
keycloak_admin_password = "admin123"

# Realm設定
realm_name         = "tumiki"
realm_display_name = "Tumiki Platform"

# Manager Appクライアント設定
manager_client_id     = "tumiki-manager"
manager_client_secret = "tumiki-manager-secret-change-in-production"
manager_redirect_uris = [
  "http://localhost:3000/*",
  "http://localhost:3001/*",
  "https://manager.tumiki.cloud/*"
]
manager_web_origins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://manager.tumiki.cloud"
]

# MCP Proxyクライアント設定
proxy_client_id     = "tumiki-proxy"
proxy_client_secret = "tumiki-proxy-secret-change-in-production"
proxy_redirect_uris = [
  "http://localhost:6277/*",
  "http://localhost:6274/*"
]

# テストユーザー設定
test_user_email      = "admin@tumiki.local"
test_user_password   = "admin123"
test_user_first_name = "Admin"
test_user_last_name  = "User"

# Google IdP設定（開発環境では空、必要な場合は環境変数で上書き）
# google_client_id     = ""
# google_client_secret = ""
