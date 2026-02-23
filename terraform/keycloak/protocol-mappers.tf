# Keycloak Protocol Mappers設定
# 注: profile, email, roles, web-origins, acr スコープは
#     Keycloakがデフォルトでプロトコルマッパーを含むため、
#     ここではカスタムスコープのマッパーのみを定義

# =============================================================================
# ローカル変数定義
# =============================================================================

locals {
  # tumiki-claims スコープのユーザー属性マッパー
  tumiki_claim_mappers = {
    org_id = {
      user_attribute   = "tumiki_org_id"
      claim_name       = "tumiki.org_id"
      claim_value_type = "String"
    }
    is_org_admin = {
      user_attribute   = "tumiki_is_org_admin"
      claim_name       = "tumiki.is_org_admin"
      claim_value_type = "boolean"
    }
    tumiki_user_id = {
      user_attribute   = "tumiki_user_id"
      claim_name       = "tumiki.tumiki_user_id"
      claim_value_type = "String"
    }
    default_organization_id = {
      user_attribute   = "default_organization_id"
      claim_name       = "tumiki.default_organization_id"
      claim_value_type = "String"
    }
  }

  # Proxy クライアントのセッションノートマッパー
  proxy_session_note_mappers = {
    client_host = {
      name             = "Client Host"
      claim_name       = "clientHost"
      session_note     = "clientHost"
      claim_value_type = "String"
    }
    client_id = {
      name             = "Client ID"
      claim_name       = "client_id"
      session_note     = "client_id"
      claim_value_type = "String"
    }
    client_address = {
      name             = "Client IP Address"
      claim_name       = "clientAddress"
      session_note     = "clientAddress"
      claim_value_type = "String"
    }
  }
}

# =============================================================================
# tumiki-claims スコープのプロトコルマッパー
# =============================================================================

resource "keycloak_openid_user_attribute_protocol_mapper" "tumiki_claims" {
  for_each = local.tumiki_claim_mappers

  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.tumiki_claims.id
  name            = each.key

  user_attribute      = each.value.user_attribute
  claim_name          = each.value.claim_name
  claim_value_type    = each.value.claim_value_type
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# =============================================================================
# Manager クライアント固有のプロトコルマッパー
# =============================================================================

# Tumiki Organization Roles マッパー
resource "keycloak_openid_user_realm_role_protocol_mapper" "manager_org_roles" {
  realm_id  = keycloak_realm.tumiki.id
  client_id = keycloak_openid_client.manager.id
  name      = "Tumiki Organization Roles"

  claim_name          = "tumiki.roles"
  claim_value_type    = "String"
  multivalued         = true
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# Tumiki Group Roles マッパー
# 組織別ロール管理のため、full_path=true でグループパスを含める
# 例: ["/org-rayven/_Owner", "/org-acme/_Member"]
resource "keycloak_openid_group_membership_protocol_mapper" "manager_group_roles" {
  realm_id  = keycloak_realm.tumiki.id
  client_id = keycloak_openid_client.manager.id
  name      = "Tumiki Group Roles"

  claim_name          = "tumiki.group_roles"
  full_path           = true
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# =============================================================================
# Proxy クライアント固有のプロトコルマッパー
# =============================================================================

resource "keycloak_openid_user_session_note_protocol_mapper" "proxy_session_notes" {
  for_each = local.proxy_session_note_mappers

  realm_id  = keycloak_realm.tumiki.id
  client_id = keycloak_openid_client.proxy.id
  name      = each.value.name

  claim_name          = each.value.claim_name
  claim_value_type    = each.value.claim_value_type
  session_note        = each.value.session_note
  add_to_id_token     = true
  add_to_access_token = true
}
