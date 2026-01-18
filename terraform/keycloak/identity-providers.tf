# Keycloak Identity Providers設定
# Google IdP（オプション - 環境変数が設定されている場合のみ）

# =============================================================================
# ローカル変数定義
# =============================================================================

locals {
  # Google IdP が有効かどうか
  google_idp_enabled = var.google_client_id != ""

  # Google IdP 属性マッパー定義
  google_attribute_mappers = {
    email = {
      name           = "google-email"
      claim          = "email"
      user_attribute = "email"
    }
    first_name = {
      name           = "google-first-name"
      claim          = "given_name"
      user_attribute = "firstName"
    }
    last_name = {
      name           = "google-last-name"
      claim          = "family_name"
      user_attribute = "lastName"
    }
    email_verified = {
      name           = "google-email-verified"
      claim          = "email_verified"
      user_attribute = "emailVerified"
    }
    picture = {
      name           = "google-picture"
      claim          = "picture"
      user_attribute = "picture"
    }
  }
}

# =============================================================================
# Google Identity Provider
# =============================================================================

# Google IdP（条件付き）
# keycloak_oidc_google_identity_provider を使用すると authorization_url, token_url が自動設定される
resource "keycloak_oidc_google_identity_provider" "google" {
  count = local.google_idp_enabled ? 1 : 0

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

# =============================================================================
# Google IdP マッパー
# =============================================================================

# username マッパー（特殊なタイプのため個別定義）
resource "keycloak_custom_identity_provider_mapper" "google_username" {
  count = local.google_idp_enabled ? 1 : 0

  realm                    = keycloak_realm.tumiki.id
  name                     = "google-username"
  identity_provider_alias  = keycloak_oidc_google_identity_provider.google[0].alias
  identity_provider_mapper = "oidc-username-idp-mapper"

  extra_config = {
    syncMode = "INHERIT"
    template = "$${CLAIM.email}"
  }
}

# 属性マッパー（for_eachで一括定義）
resource "keycloak_custom_identity_provider_mapper" "google_attributes" {
  for_each = local.google_idp_enabled ? local.google_attribute_mappers : {}

  realm                    = keycloak_realm.tumiki.id
  name                     = each.value.name
  identity_provider_alias  = keycloak_oidc_google_identity_provider.google[0].alias
  identity_provider_mapper = "oidc-user-attribute-idp-mapper"

  extra_config = {
    syncMode         = "INHERIT"
    claim            = each.value.claim
    "user.attribute" = each.value.user_attribute
  }
}
