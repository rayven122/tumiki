# Keycloak Terraform開発環境デフォルト値
# このファイルは開発環境用のデフォルト値を定義します
# 本番環境では別のtfvarsファイルを使用してください
#
# 認証情報は.envファイルから環境変数で取得:
# - KEYCLOAK_ADMIN_USERNAME / KEYCLOAK_ADMIN_PASSWORD
# - KEYCLOAK_CLIENT_ID / KEYCLOAK_CLIENT_SECRET
# - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (任意)

# Keycloak接続設定
keycloak_url = "http://localhost:8888"

# Realm設定
realm_name         = "tumiki"
realm_display_name = "Tumiki Platform"

# Manager Appクライアント設定（リダイレクトURIのみ）
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
