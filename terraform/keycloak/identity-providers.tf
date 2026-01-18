# Keycloak Identity Providers設定
# Google IdP（オプション - 環境変数が設定されている場合のみ）

# Google IdP（条件付き）
# keycloak_oidc_google_identity_provider を使用すると authorization_url, token_url が自動設定される
resource "keycloak_oidc_google_identity_provider" "google" {
  count = var.google_client_id != "" ? 1 : 0

  realm         = keycloak_realm.tumiki.id
  client_id     = var.google_client_id
  client_secret = var.google_client_secret

  enabled     = true
  trust_email = true
  store_token = false

  default_scopes = "openid profile email"
  sync_mode      = "IMPORT"

  # Review Profileステップはカスタムフローで制御
  # 注: Terraformではカスタム認証フローの完全な設定が難しいため、
  # 基本的なIdP設定のみを行い、First Broker Loginフローは
  # デフォルトを使用する
}

# Google IdP マッパー: username
resource "keycloak_custom_identity_provider_mapper" "google_username" {
  count = var.google_client_id != "" ? 1 : 0

  realm                    = keycloak_realm.tumiki.id
  name                     = "google-username"
  identity_provider_alias  = keycloak_oidc_google_identity_provider.google[0].alias
  identity_provider_mapper = "oidc-username-idp-mapper"

  extra_config = {
    syncMode = "INHERIT"
    template = "$${CLAIM.email}"
  }
}

# Google IdP マッパー: email
resource "keycloak_custom_identity_provider_mapper" "google_email" {
  count = var.google_client_id != "" ? 1 : 0

  realm                    = keycloak_realm.tumiki.id
  name                     = "google-email"
  identity_provider_alias  = keycloak_oidc_google_identity_provider.google[0].alias
  identity_provider_mapper = "oidc-user-attribute-idp-mapper"

  extra_config = {
    syncMode         = "INHERIT"
    claim            = "email"
    "user.attribute" = "email"
  }
}

# Google IdP マッパー: first name
resource "keycloak_custom_identity_provider_mapper" "google_first_name" {
  count = var.google_client_id != "" ? 1 : 0

  realm                    = keycloak_realm.tumiki.id
  name                     = "google-first-name"
  identity_provider_alias  = keycloak_oidc_google_identity_provider.google[0].alias
  identity_provider_mapper = "oidc-user-attribute-idp-mapper"

  extra_config = {
    syncMode         = "INHERIT"
    claim            = "given_name"
    "user.attribute" = "firstName"
  }
}

# Google IdP マッパー: last name
resource "keycloak_custom_identity_provider_mapper" "google_last_name" {
  count = var.google_client_id != "" ? 1 : 0

  realm                    = keycloak_realm.tumiki.id
  name                     = "google-last-name"
  identity_provider_alias  = keycloak_oidc_google_identity_provider.google[0].alias
  identity_provider_mapper = "oidc-user-attribute-idp-mapper"

  extra_config = {
    syncMode         = "INHERIT"
    claim            = "family_name"
    "user.attribute" = "lastName"
  }
}

# Google IdP マッパー: email verified
resource "keycloak_custom_identity_provider_mapper" "google_email_verified" {
  count = var.google_client_id != "" ? 1 : 0

  realm                    = keycloak_realm.tumiki.id
  name                     = "google-email-verified"
  identity_provider_alias  = keycloak_oidc_google_identity_provider.google[0].alias
  identity_provider_mapper = "oidc-user-attribute-idp-mapper"

  extra_config = {
    syncMode         = "INHERIT"
    claim            = "email_verified"
    "user.attribute" = "emailVerified"
  }
}

# Google IdP マッパー: picture
resource "keycloak_custom_identity_provider_mapper" "google_picture" {
  count = var.google_client_id != "" ? 1 : 0

  realm                    = keycloak_realm.tumiki.id
  name                     = "google-picture"
  identity_provider_alias  = keycloak_oidc_google_identity_provider.google[0].alias
  identity_provider_mapper = "oidc-user-attribute-idp-mapper"

  extra_config = {
    syncMode         = "INHERIT"
    claim            = "picture"
    "user.attribute" = "picture"
  }
}
