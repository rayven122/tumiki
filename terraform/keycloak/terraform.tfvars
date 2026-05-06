# Keycloak Terraform開発環境デフォルト値
# このファイルはローカル検証用です。本番・検証環境では専用tfvarsまたはTF_VAR_*を使用してください。
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

# Internal Managerクライアント設定（ローカル検証専用。本番デプロイ時はURIを追加すること）
# /api/auth/callback/oidc … NextAuth が直接 Keycloak と接続する場合のコールバック
# /api/oauth/oidc          … SAML Jackson 経由の OIDC ブローカー（SSO Connection 経由）コールバック
internal_manager_redirect_uris = [
  "http://localhost:3100/api/auth/callback/oidc",
  "http://localhost:3101/api/auth/callback/oidc",
  "http://localhost:3100/api/oauth/oidc",
  "http://localhost:3101/api/oauth/oidc"
  # TODO: 本番デプロイ時は例 "https://internal.tumiki.cloud/api/auth/callback/oidc" と "/api/oauth/oidc" を追加する
]
internal_manager_web_origins = [
  "http://localhost:3100",
  "http://localhost:3101"
]

# MCP Proxyクライアント設定
proxy_client_id = "tumiki-proxy"
proxy_redirect_uris = [
  "http://localhost:6277/*",
  "http://localhost:6274/*"
]

# テストユーザー設定
test_user_email      = "admin@tumiki.local"
test_user_first_name = "Admin"
test_user_last_name  = "User"

# テーマ設定（ローカルKeycloakは組み込みテーマを使用。Keycloak 26 で legacy "keycloak" テーマが廃止されたため keycloak.v2 / keycloak.v3 を使う。本番はvariables.tfの既定値 tumiki を使用）
login_theme   = "keycloak.v2"
account_theme = "keycloak.v3"
