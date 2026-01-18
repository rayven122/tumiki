# Keycloak Realm Roles設定
# 組織管理用のRealm Roles

# Owner ロール - 全権限
resource "keycloak_role" "owner" {
  realm_id    = keycloak_realm.tumiki.id
  name        = "Owner"
  description = "Organization Owner - Full permissions"
}

# Admin ロール - メンバー管理可能
resource "keycloak_role" "admin" {
  realm_id    = keycloak_realm.tumiki.id
  name        = "Admin"
  description = "Organization Admin - Can manage members"
}

# Member ロール - 基本利用
resource "keycloak_role" "member" {
  realm_id    = keycloak_realm.tumiki.id
  name        = "Member"
  description = "Organization Member - Basic usage"
}

# Viewer ロール - 読み取り専用
resource "keycloak_role" "viewer" {
  realm_id    = keycloak_realm.tumiki.id
  name        = "Viewer"
  description = "Organization Viewer - Read-only access"
}
