# Keycloak Terraform開発環境デフォルト値
# このファイルは開発環境用のデフォルト値を定義します
#
# 認証情報は.envファイルから環境変数で取得:
# - KEYCLOAK_ADMIN_USERNAME / KEYCLOAK_ADMIN_PASSWORD
# - KEYCLOAK_CLIENT_ID / KEYCLOAK_CLIENT_SECRET

# Keycloak接続設定
keycloak_url = "http://localhost:8888"

# Realm設定
realm_name         = "tumiki"
realm_display_name = "Tumiki Platform"

# Manager Appクライアント設定
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
proxy_client_id = "tumiki-proxy"
proxy_redirect_uris = [
  "http://localhost:6277/*",
  "http://localhost:6274/*"
]

# テーマ設定（tumikiテーマはloginのみ提供、accountはデフォルトを使用）
account_theme = "keycloak.v3"

# テストユーザー設定
test_user_email      = "admin@tumiki.local"
test_user_first_name = "Admin"
test_user_last_name  = "User"
