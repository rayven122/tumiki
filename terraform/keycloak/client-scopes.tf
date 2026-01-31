# Keycloak Client Scopes設定
# 注: profile, email, roles, web-origins, acr スコープは
#     Keycloakがデフォルトで作成するため、ここでは作成しない

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
