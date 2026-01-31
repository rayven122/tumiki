# Keycloak Clients設定

# =============================================================================
# ローカル変数定義
# =============================================================================

locals {
  # 共通のベーススコープ（両クライアントで使用）
  base_scopes = [
    "web-origins",
    "acr",
    "roles",
  ]

  # Manager クライアント用デフォルトスコープ
  manager_default_scopes = concat(local.base_scopes, [
    "profile",
    "email",
    keycloak_openid_client_scope.tumiki_claims.name,
  ])

  # Proxy クライアント用デフォルトスコープ
  proxy_default_scopes = concat(local.base_scopes, [
    keycloak_openid_client_scope.mcp_access.name,
    keycloak_openid_client_scope.tumiki_claims.name,
  ])

  # Proxy クライアント用オプショナルスコープ
  proxy_optional_scopes = [
    "address",
    "phone",
    "offline_access",
    "microprofile-jwt",
  ]
}

# =============================================================================
# tumiki-manager クライアント
# =============================================================================

# Next.js Manager Application用のOIDCクライアント
resource "keycloak_openid_client" "manager" {
  realm_id    = keycloak_realm.tumiki.id
  client_id   = var.manager_client_id
  name        = "Tumiki Manager Application"
  description = "Next.js Manager Application"

  enabled       = true
  access_type   = "CONFIDENTIAL"
  client_secret = var.manager_client_secret

  # 認証フロー設定
  standard_flow_enabled        = true
  implicit_flow_enabled        = false
  direct_access_grants_enabled = false
  service_accounts_enabled     = false

  # PKCE設定
  pkce_code_challenge_method = "S256"

  # リダイレクトURI設定
  valid_redirect_uris = var.manager_redirect_uris
  web_origins         = var.manager_web_origins

  # ログイン設定
  login_theme = ""
}

# Manager クライアントのデフォルトスコープ設定
resource "keycloak_openid_client_default_scopes" "manager_default_scopes" {
  realm_id       = keycloak_realm.tumiki.id
  client_id      = keycloak_openid_client.manager.id
  default_scopes = local.manager_default_scopes
}

# =============================================================================
# tumiki-proxy クライアント
# =============================================================================

# MCP Proxy Server用のOIDCクライアント
resource "keycloak_openid_client" "proxy" {
  realm_id    = keycloak_realm.tumiki.id
  client_id   = var.proxy_client_id
  name        = "Tumiki MCP Proxy"
  description = "MCP Proxy Server Client"

  enabled       = true
  access_type   = "CONFIDENTIAL"
  client_secret = var.proxy_client_secret

  # 認証フロー設定
  standard_flow_enabled        = true
  implicit_flow_enabled        = false
  direct_access_grants_enabled = true
  service_accounts_enabled     = true

  # リダイレクトURI設定
  valid_redirect_uris = var.proxy_redirect_uris
  web_origins         = ["*"]

  # フロントチャネルログアウト
  frontchannel_logout_enabled = true

  # バックチャネルログアウト設定
  backchannel_logout_session_required        = true
  backchannel_logout_revoke_offline_sessions = false

  # リフレッシュトークン設定
  use_refresh_tokens                    = true
  use_refresh_tokens_client_credentials = false

  # コンセント画面設定
  consent_required = false

  # その他の設定
  extra_config = {
    "client.secret.creation.time"                = "1763403072"
    "oidc.ciba.grant.enabled"                    = "false"
    "require.pushed.authorization.requests"      = "false"
    "tls.client.certificate.bound.access.tokens" = "false"
    "token.response.type.bearer.lower-case"      = "false"
  }
}

# Proxy クライアントのデフォルトスコープ設定
resource "keycloak_openid_client_default_scopes" "proxy_default_scopes" {
  realm_id       = keycloak_realm.tumiki.id
  client_id      = keycloak_openid_client.proxy.id
  default_scopes = local.proxy_default_scopes
}

# Proxy クライアントのオプショナルスコープ設定
# 注: profile, email はデフォルトスコープとして設定されるため除外
resource "keycloak_openid_client_optional_scopes" "proxy_optional_scopes" {
  realm_id        = keycloak_realm.tumiki.id
  client_id       = keycloak_openid_client.proxy.id
  optional_scopes = local.proxy_optional_scopes
}
