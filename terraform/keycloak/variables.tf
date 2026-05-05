# Keycloak Terraform変数定義

# Keycloak接続設定
# 本番環境: Infisical 経由の TF_VAR_keycloak_url 環境変数で設定
variable "keycloak_url" {
  description = "Keycloak サーバーURL（本番: TF_VAR_keycloak_url 環境変数で上書き）"
  type        = string
  default     = "http://localhost:8080"
}

variable "keycloak_admin_username" {
  description = "Keycloak 管理者ユーザー名"
  type        = string
  default     = "admin"
}

variable "keycloak_admin_password" {
  description = "Keycloak 管理者パスワード（環境変数 TF_VAR_keycloak_admin_password で設定）"
  type        = string
  sensitive   = true
}

# Realm設定
variable "realm_name" {
  description = "Keycloak Realm名"
  type        = string
  default     = "tumiki"
}

variable "realm_display_name" {
  description = "Realm表示名"
  type        = string
  default     = "Tumiki Platform"
}

# クライアント設定
variable "manager_client_id" {
  description = "Manager App クライアントID"
  type        = string
  default     = "tumiki-manager"
}

variable "manager_client_secret" {
  description = "Manager App クライアントシークレット（環境変数 TF_VAR_manager_client_secret で設定）"
  type        = string
  sensitive   = true
}

variable "internal_manager_client_id" {
  description = "Internal Manager クライアントID"
  type        = string
  default     = "tumiki-internal-manager"
}

variable "internal_manager_client_secret" {
  description = "Internal Manager クライアントシークレット（環境変数 TF_VAR_internal_manager_client_secret で設定）"
  type        = string
  sensitive   = true
}

variable "proxy_client_id" {
  description = "MCP Proxy クライアントID"
  type        = string
  default     = "tumiki-proxy"
}

variable "proxy_client_secret" {
  description = "MCP Proxy クライアントシークレット（環境変数 TF_VAR_proxy_client_secret で設定）"
  type        = string
  sensitive   = true
}

# 許可されるリダイレクトURI
variable "manager_redirect_uris" {
  description = "Manager App リダイレクトURI一覧"
  type        = list(string)
  default = [
    "http://localhost:3000/*",
    "https://localhost:3000/*",
    "http://localhost:3001/*",
    "https://manager.tumiki.cloud/*"
  ]
}

variable "manager_web_origins" {
  description = "Manager App Web Origins一覧"
  type        = list(string)
  default = [
    "http://localhost:3000",
    "https://localhost:3000",
    "http://localhost:3001",
    "https://manager.tumiki.cloud"
  ]
}

variable "internal_manager_redirect_uris" {
  description = "Internal Manager リダイレクトURI一覧"
  type        = list(string)
  default = [
    "http://localhost:3100/api/auth/callback/oidc",
    "http://localhost:3101/api/auth/callback/oidc"
  ]
}

variable "internal_manager_web_origins" {
  description = "Internal Manager Web Origins一覧"
  type        = list(string)
  default = [
    "http://localhost:3100",
    "http://localhost:3101"
  ]
}

variable "proxy_redirect_uris" {
  description = "MCP Proxy リダイレクトURI一覧"
  type        = list(string)
  default = [
    "http://localhost:6277/*",
    "http://localhost:6274/*"
  ]
}

# Desktop App クライアント設定
variable "desktop_client_id" {
  description = "Desktop App クライアントID"
  type        = string
  default     = "tumiki-desktop"
}

variable "desktop_redirect_uris" {
  description = "Desktop App リダイレクトURI一覧"
  type        = list(string)
  default = [
    "tumiki://auth/callback"
  ]
}
# セキュリティ設定
variable "ssl_required" {
  description = "SSL要求レベル（none/external/all）"
  type        = string
  default     = "none"
}

# テーマ設定
variable "login_theme" {
  description = "ログイン画面テーマ"
  type        = string
  nullable    = false
  default     = "tumiki"
}

variable "account_theme" {
  description = "アカウント管理画面テーマ"
  type        = string
  nullable    = false
  default     = "keycloak.v3"
}

# テストユーザー設定
variable "test_user_email" {
  description = "テストユーザーのメールアドレス"
  type        = string
  default     = "admin@tumiki.local"
}

variable "test_user_password" {
  description = "テストユーザーのパスワード（環境変数 TF_VAR_test_user_password で設定）"
  type        = string
  sensitive   = true
}

variable "test_user_first_name" {
  description = "テストユーザーの名前"
  type        = string
  default     = "Admin"
}

variable "test_user_last_name" {
  description = "テストユーザーの姓"
  type        = string
  default     = "User"
}

# SMTP設定（メール送信用）
variable "smtp_host" {
  description = "SMTPサーバーホスト"
  type        = string
}

variable "smtp_port" {
  description = "SMTPサーバーポート"
  type        = string
  default     = "587"
}

variable "smtp_user" {
  description = "SMTP認証ユーザー名"
  type        = string
}

variable "smtp_password" {
  description = "SMTP認証パスワード（環境変数 TF_VAR_smtp_password で設定）"
  type        = string
  sensitive   = true
}

variable "smtp_from" {
  description = "送信元メールアドレス"
  type        = string
}

variable "smtp_from_display_name" {
  description = "送信者表示名"
  type        = string
  default     = "Tumiki"
}

# Google IdP設定（オプション）
variable "google_client_id" {
  description = "Google OAuth クライアントID（空の場合はGoogle IdPを設定しない）"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth クライアントシークレット"
  type        = string
  sensitive   = true
  default     = ""
}

# Google IdP の First Broker Login フロー alias
# 本番 realm では手動配備された "tumiki-broker-login" を参照する。
# 開発・staging ではデフォルトの "first broker login" を使用。
variable "first_broker_login_flow_alias" {
  description = "Google IdP の First Broker Login フロー alias"
  type        = string
  default     = "first broker login"
}

# 環境別フィーチャーフラグ
# 旧本番 realm では User Profile feature を有効化していないため、
# 本番では false に設定して drift を発生させない。
variable "enable_user_profile" {
  description = "keycloak_realm_user_profile を Terraform で管理するか"
  type        = bool
  default     = true
}

# 管理者テストユーザーの作成可否
# 本番 realm では Terraform 管理のテストユーザーを作成しない。
variable "enable_test_user" {
  description = "管理者テストユーザー（admin_test）を作成するか"
  type        = bool
  default     = true
}

# Internal Manager クライアントの作成可否
# 本番 realm にはまだ配備していないため、本番では false を指定。
variable "enable_internal_manager_client" {
  description = "tumiki-internal-manager クライアントを作成するか"
  type        = bool
  default     = true
}

# Desktop クライアントの作成可否
# 本番 realm にはまだ配備していないため、本番では false を指定。
variable "enable_desktop_client" {
  description = "tumiki-desktop クライアントを作成するか"
  type        = bool
  default     = true
}
