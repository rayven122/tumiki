# Keycloak Terraform Outputs

# Realm情報
output "realm_id" {
  description = "Tumiki Realm ID"
  value       = keycloak_realm.tumiki.id
}

output "realm_name" {
  description = "Tumiki Realm名"
  value       = keycloak_realm.tumiki.realm
}

# クライアント情報
output "manager_client_id" {
  description = "Manager App クライアントID"
  value       = keycloak_openid_client.manager.client_id
}

output "manager_client_internal_id" {
  description = "Manager App 内部ID"
  value       = keycloak_openid_client.manager.id
}

output "proxy_client_id" {
  description = "MCP Proxy クライアントID"
  value       = keycloak_openid_client.proxy.client_id
}

output "proxy_client_internal_id" {
  description = "MCP Proxy 内部ID"
  value       = keycloak_openid_client.proxy.id
}

# テストユーザー情報
output "test_user_id" {
  description = "テストユーザーID"
  value       = keycloak_user.admin_test.id
}

output "test_user_email" {
  description = "テストユーザーメールアドレス"
  value       = keycloak_user.admin_test.email
}

# ロール情報
output "role_owner_id" {
  description = "Owner ロールID"
  value       = keycloak_role.org_roles["owner"].id
}

output "role_admin_id" {
  description = "Admin ロールID"
  value       = keycloak_role.org_roles["admin"].id
}

output "role_member_id" {
  description = "Member ロールID"
  value       = keycloak_role.org_roles["member"].id
}

output "role_viewer_id" {
  description = "Viewer ロールID"
  value       = keycloak_role.org_roles["viewer"].id
}

# Client Scope情報
output "client_scope_tumiki_claims_id" {
  description = "tumiki-claims Client Scope ID"
  value       = keycloak_openid_client_scope.tumiki_claims.id
}

output "client_scope_mcp_access_id" {
  description = "mcp:access Client Scope ID"
  value       = keycloak_openid_client_scope.mcp_access.id
}

# Google IdP情報（条件付き）
output "google_idp_alias" {
  description = "Google IdP エイリアス（設定されている場合）"
  value       = var.google_client_id != "" ? keycloak_oidc_google_identity_provider.google[0].alias : null
}

# 接続情報（開発者向け）
output "keycloak_issuer_url" {
  description = "Keycloak Issuer URL（アプリケーション設定用）"
  value       = "${var.keycloak_url}/realms/${var.realm_name}"
}

output "keycloak_admin_url" {
  description = "Keycloak Admin Console URL"
  value       = "${var.keycloak_url}/admin/"
}
