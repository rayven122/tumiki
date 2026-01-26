# Keycloak Realm設定

# Tumiki Realm
resource "keycloak_realm" "tumiki" {
  realm        = var.realm_name
  display_name = var.realm_display_name
  enabled      = true

  # 開発環境向けSSL設定
  ssl_required = "none"

  # ユーザー登録設定
  registration_allowed           = true
  registration_email_as_username = true
  reset_password_allowed         = true
  remember_me                    = true

  # ログイン設定
  login_with_email_allowed = true
  duplicate_emails_allowed = false
  verify_email             = true
  edit_username_allowed    = false

  # User Profile設定（firstName/lastName任意化）
  attributes = {
    userProfileEnabled = "true"
  }
}

# Master Realmへの参照（data source）
# Keycloakの起動時に自動作成されるため、作成ではなく参照のみ
data "keycloak_realm" "master" {
  realm = "master"
}
