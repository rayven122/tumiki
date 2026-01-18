# Keycloak Protocol Mappers設定

# =============================================================================
# tumiki-claims スコープのプロトコルマッパー
# =============================================================================

# org_id マッパー
resource "keycloak_openid_user_attribute_protocol_mapper" "org_id" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.tumiki_claims.id
  name            = "org_id"

  user_attribute      = "tumiki_org_id"
  claim_name          = "tumiki.org_id"
  claim_value_type    = "String"
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# is_org_admin マッパー
resource "keycloak_openid_user_attribute_protocol_mapper" "is_org_admin" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.tumiki_claims.id
  name            = "is_org_admin"

  user_attribute      = "tumiki_is_org_admin"
  claim_name          = "tumiki.is_org_admin"
  claim_value_type    = "boolean"
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# tumiki_user_id マッパー
resource "keycloak_openid_user_attribute_protocol_mapper" "tumiki_user_id" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.tumiki_claims.id
  name            = "tumiki_user_id"

  user_attribute      = "tumiki_user_id"
  claim_name          = "tumiki.tumiki_user_id"
  claim_value_type    = "String"
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# default_organization_id マッパー
resource "keycloak_openid_user_attribute_protocol_mapper" "default_organization_id" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.tumiki_claims.id
  name            = "default_organization_id"

  user_attribute      = "default_organization_id"
  claim_name          = "tumiki.default_organization_id"
  claim_value_type    = "String"
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# =============================================================================
# profile スコープのプロトコルマッパー
# =============================================================================

# username マッパー
resource "keycloak_openid_user_property_protocol_mapper" "username" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.profile.id
  name            = "username"

  user_property       = "username"
  claim_name          = "preferred_username"
  claim_value_type    = "String"
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# full name マッパー
resource "keycloak_openid_full_name_protocol_mapper" "full_name" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.profile.id
  name            = "full name"

  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# family name マッパー
resource "keycloak_openid_user_property_protocol_mapper" "family_name" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.profile.id
  name            = "family name"

  user_property       = "lastName"
  claim_name          = "family_name"
  claim_value_type    = "String"
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# given name マッパー
resource "keycloak_openid_user_property_protocol_mapper" "given_name" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.profile.id
  name            = "given name"

  user_property       = "firstName"
  claim_name          = "given_name"
  claim_value_type    = "String"
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# picture マッパー
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

# email マッパー
resource "keycloak_openid_user_property_protocol_mapper" "email" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.email.id
  name            = "email"

  user_property       = "email"
  claim_name          = "email"
  claim_value_type    = "String"
  add_to_id_token     = true
  add_to_access_token = true
  add_to_userinfo     = true
}

# email verified マッパー
resource "keycloak_openid_user_property_protocol_mapper" "email_verified" {
  realm_id        = keycloak_realm.tumiki.id
  client_scope_id = keycloak_openid_client_scope.email.id
  name            = "email verified"

  user_property       = "emailVerified"
  claim_name          = "email_verified"
  claim_value_type    = "boolean"
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

# allowed web origins マッパー
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

# acr loa level マッパー
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

# Client Host マッパー
resource "keycloak_openid_user_session_note_protocol_mapper" "proxy_client_host" {
  realm_id  = keycloak_realm.tumiki.id
  client_id = keycloak_openid_client.proxy.id
  name      = "Client Host"

  claim_name          = "clientHost"
  claim_value_type    = "String"
  session_note        = "clientHost"
  add_to_id_token     = true
  add_to_access_token = true
}

# Client ID マッパー
resource "keycloak_openid_user_session_note_protocol_mapper" "proxy_client_id" {
  realm_id  = keycloak_realm.tumiki.id
  client_id = keycloak_openid_client.proxy.id
  name      = "Client ID"

  claim_name          = "client_id"
  claim_value_type    = "String"
  session_note        = "client_id"
  add_to_id_token     = true
  add_to_access_token = true
}

# Client IP Address マッパー
resource "keycloak_openid_user_session_note_protocol_mapper" "proxy_client_address" {
  realm_id  = keycloak_realm.tumiki.id
  client_id = keycloak_openid_client.proxy.id
  name      = "Client IP Address"

  claim_name          = "clientAddress"
  claim_value_type    = "String"
  session_note        = "clientAddress"
  add_to_id_token     = true
  add_to_access_token = true
}
