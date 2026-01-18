# Keycloak Realm Roles設定
# 組織管理用のRealm Roles

# ロール定義
locals {
  realm_roles = {
    owner  = { description = "Organization Owner - Full permissions" }
    admin  = { description = "Organization Admin - Can manage members" }
    member = { description = "Organization Member - Basic usage" }
    viewer = { description = "Organization Viewer - Read-only access" }
  }
}

# 組織ロール（for_eachで一括定義）
resource "keycloak_role" "org_roles" {
  for_each = local.realm_roles

  realm_id    = keycloak_realm.tumiki.id
  name        = title(each.key)
  description = each.value.description
}
