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

# Master RealmのSSL要件を無効化（開発環境用）
# 注: Keycloak Provider 5.0以降ではdata sourceを使用
data "keycloak_realm" "master" {
  realm = "master"
}

resource "keycloak_realm" "master_ssl_update" {
  realm        = "master"
  enabled      = data.keycloak_realm.master.enabled
  ssl_required = "none"

  lifecycle {
    ignore_changes = [
      display_name,
      display_name_html,
      registration_allowed,
      registration_email_as_username,
      reset_password_allowed,
      remember_me,
      login_with_email_allowed,
      duplicate_emails_allowed,
      verify_email,
      edit_username_allowed,
      attributes,
    ]
  }
}
