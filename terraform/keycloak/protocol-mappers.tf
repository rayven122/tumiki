# Keycloak Protocol Mappers設定

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

  # profile スコープのユーザープロパティマッパー
  profile_property_mappers = {
    username = {
      user_property    = "username"
      claim_name       = "preferred_username"
      claim_value_type = "String"
    }
    family_name = {
      name             = "family name"
      user_property    = "lastName"
      claim_name       = "family_name"
      claim_value_type = "String"
    }
    given_name = {
      name             = "given name"
      user_property    = "firstName"
      claim_name       = "given_name"
      claim_value_type = "String"
    }
  }

  # email スコープのユーザープロパティマッパー
  email_property_mappers = {
    email = {
      user_property    = "email"
      claim_name       = "email"
      claim_value_type = "String"
    }
    email_verified = {
      name             = "email verified"
      user_property    = "emailVerified"
      claim_name       = "email_verified"
      claim_value_type = "boolean"
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
# profile スコープのプロトコルマッパー
# =============================================================================

# ユーザープロパティマッパー
resource "keycloak_openid_user_property_protocol_mapper" "profile_properties" {
  for_each = local.profile_property_mappers

  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.profile.id
  name            = lookup(each.value, "name", each.key)

  user_property       = each.value.user_property
  claim_name          = each.value.claim_name
  claim_value_type    = each.value.claim_value_type
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# full name マッパー（特殊なタイプのため個別定義）
resource "keycloak_openid_full_name_protocol_mapper" "full_name" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.profile.id
  name            = "full name"

  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# picture マッパー（ユーザー属性マッパーのため個別定義）
resource "keycloak_openid_user_attribute_protocol_mapper" "picture" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.profile.id
  name            = "picture"

  user_attribute      = "picture"
  claim_name          = "picture"
  claim_value_type    = "String"
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# =============================================================================
# email スコープのプロトコルマッパー
# =============================================================================

resource "keycloak_openid_user_property_protocol_mapper" "email_properties" {
  for_each = local.email_property_mappers

  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.email.id
  name            = lookup(each.value, "name", each.key)

  user_property       = each.value.user_property
  claim_name          = each.value.claim_name
  claim_value_type    = each.value.claim_value_type
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# =============================================================================
# roles スコープのプロトコルマッパー
# =============================================================================

# realm roles マッパー
resource "keycloak_openid_user_realm_role_protocol_mapper" "realm_roles" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.roles.id
  name            = "realm roles"

  claim_name          = "realm_access.roles"
  claim_value_type    = "String"
  multivalued         = true
  add_to_id_token     = false
  add_to_access_token = true
  add_to_userinfo     = false
}

# client roles マッパー
resource "keycloak_openid_user_client_role_protocol_mapper" "client_roles" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.roles.id
  name            = "client roles"

  claim_name          = "resource_access.$${client_id}.roles"
  claim_value_type    = "String"
  multivalued         = true
  add_to_id_token     = false
  add_to_access_token = true
  add_to_userinfo     = false
}

# =============================================================================
# web-origins スコープのプロトコルマッパー
# =============================================================================

resource "keycloak_generic_protocol_mapper" "allowed_web_origins" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.web_origins.id
  name            = "allowed web origins"
  protocol        = "openid-connect"
  protocol_mapper = "oidc-allowed-origins-mapper"
  config          = {}
}

# =============================================================================
# acr スコープのプロトコルマッパー
# =============================================================================

resource "keycloak_generic_protocol_mapper" "acr_loa_level" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.acr.id
  name            = "acr loa level"
  protocol        = "openid-connect"
  protocol_mapper = "oidc-acr-mapper"
  config          = {}
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
resource "keycloak_openid_group_membership_protocol_mapper" "manager_group_roles" {
  realm_id  = keycloak_realm.tumiki.id
  client_id = keycloak_openid_client.manager.id
  name      = "Tumiki Group Roles"

  claim_name          = "tumiki.group_roles"
  full_path           = false
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
