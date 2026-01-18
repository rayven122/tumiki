# Keycloak Client Scopes設定

# mcp:access スコープ
# MCP Proxyへのアクセス権限を表すスコープ
resource "keycloak_openid_client_scope" "mcp_access" {
  realm_id    = keycloak_realm.tumiki.id
  name        = "mcp:access"
  description = "MCP Proxy access scope"

  include_in_token_scope = true
  gui_order              = 1
}

# tumiki-claims スコープ
# Tumikiカスタムクレーム用のスコープ
resource "keycloak_openid_client_scope" "tumiki_claims" {
  realm_id    = keycloak_realm.tumiki.id
  name        = "tumiki-claims"
  description = "Tumiki custom claims for JWT"

  include_in_token_scope = true
  gui_order              = 2
}

# profile スコープ（カスタムマッパー付き）
resource "keycloak_openid_client_scope" "profile" {
  realm_id    = keycloak_realm.tumiki.id
  name        = "profile"
  description = "OpenID Connect built-in scope: profile"

  include_in_token_scope = true
  gui_order              = 3

  consent_screen_text = "$${profileScopeConsentText}"
}

# email スコープ
resource "keycloak_openid_client_scope" "email" {
  realm_id    = keycloak_realm.tumiki.id
  name        = "email"
  description = "OpenID Connect built-in scope: email"

  include_in_token_scope = true
  gui_order              = 4

  consent_screen_text = "$${emailScopeConsentText}"
}

# roles スコープ
resource "keycloak_openid_client_scope" "roles" {
  realm_id    = keycloak_realm.tumiki.id
  name        = "roles"
  description = "OpenID Connect built-in scope: roles"

  include_in_token_scope = false
  gui_order              = 5
}

# web-origins スコープ
resource "keycloak_openid_client_scope" "web_origins" {
  realm_id    = keycloak_realm.tumiki.id
  name        = "web-origins"
  description = "OpenID Connect built-in scope: web-origins"

  include_in_token_scope = false
  gui_order              = 6
}

# acr スコープ
resource "keycloak_openid_client_scope" "acr" {
  realm_id    = keycloak_realm.tumiki.id
  name        = "acr"
  description = "OpenID Connect built-in scope: acr"

  include_in_token_scope = false
  gui_order              = 7
}
