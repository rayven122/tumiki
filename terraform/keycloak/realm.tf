# Keycloak Realm設定

# Tumiki Realm
resource "keycloak_realm" "tumiki" {
  realm        = var.realm_name
  display_name = var.realm_display_name
  enabled      = true

  # SSL設定（本番環境: external、開発環境: none）
  ssl_required = var.ssl_required

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
  internationalization {
    supported_locales = ["ja", "en"]
    default_locale    = "ja"
  }

  # SMTP設定（メール送信用）
  smtp_server {
    host              = var.smtp_host
    port              = var.smtp_port
    from              = var.smtp_from
    from_display_name = var.smtp_from_display_name
    starttls          = true

    auth {
      username = var.smtp_user
      password = var.smtp_password
    }
  }

  # User Profile有効化
  attributes = {
    userProfileEnabled = "true"
  }
}

# Master Realmへの参照（data source）
data "keycloak_realm" "master" {
  realm = "master"
}

# User Profile設定（firstName/lastNameをオプショナルに）
resource "keycloak_realm_user_profile" "tumiki" {
  realm_id = keycloak_realm.tumiki.id

  attribute {
    name         = "username"
    display_name = "$${username}"
  }

  attribute {
    name               = "email"
    display_name       = "$${email}"
    required_for_roles = ["user"]
  }

  attribute {
    name         = "firstName"
    display_name = "$${firstName}"
  }

  attribute {
    name         = "lastName"
    display_name = "$${lastName}"
  }
}
