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

  # トークン設定
  access_token_lifespan       = "30m"  # 30分
  client_session_idle_timeout = "168h" # 7日
  client_session_max_lifespan = "720h" # 30日

  # セッション設定
  sso_session_idle_timeout = "168h" # 7日
  sso_session_max_lifespan = "720h" # 30日

  # テーマ設定（ログイン画面にtumikiテーマを適用）
  login_theme = "tumiki"

  # 国際化設定（日本語・英語サポート）
  internationalization_enabled = true
  supported_locales            = ["ja", "en"]
  default_locale               = "ja"

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
