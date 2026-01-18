# Keycloak Terraform変数定義

# Keycloak接続設定
variable "keycloak_url" {
  description = "Keycloak サーバーURL"
  type        = string
  default     = "http://localhost:8443"
}

variable "keycloak_admin_username" {
  description = "Keycloak 管理者ユーザー名"
  type        = string
  default     = "admin"
}

variable "keycloak_admin_password" {
  description = "Keycloak 管理者パスワード"
  type        = string
  sensitive   = true
  default     = "admin123"
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
  description = "Manager App クライアントシークレット"
  type        = string
  sensitive   = true
  default     = "tumiki-manager-secret-change-in-production"
}

variable "proxy_client_id" {
  description = "MCP Proxy クライアントID"
  type        = string
  default     = "tumiki-proxy"
}

variable "proxy_client_secret" {
  description = "MCP Proxy クライアントシークレット"
  type        = string
  sensitive   = true
  default     = "tumiki-proxy-secret-change-in-production"
}

# 許可されるリダイレクトURI
variable "manager_redirect_uris" {
  description = "Manager App リダイレクトURI一覧"
  type        = list(string)
  default = [
    "http://localhost:3000/*",
    "http://localhost:3001/*",
    "https://manager.tumiki.cloud/*"
  ]
}

variable "manager_web_origins" {
  description = "Manager App Web Origins一覧"
  type        = list(string)
  default = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://manager.tumiki.cloud"
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

# テストユーザー設定
variable "test_user_email" {
  description = "テストユーザーのメールアドレス"
  type        = string
  default     = "admin@tumiki.local"
}

variable "test_user_password" {
  description = "テストユーザーのパスワード"
  type        = string
  sensitive   = true
  default     = "admin123"
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
