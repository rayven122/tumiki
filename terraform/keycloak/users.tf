# Keycloak Users設定
# 開発環境用テストユーザー

# 管理者テストユーザー
resource "keycloak_user" "admin_test" {
  realm_id = keycloak_realm.tumiki.id
  username = var.test_user_email
  email    = var.test_user_email
  enabled  = true

  email_verified = true
  first_name     = var.test_user_first_name
  last_name      = var.test_user_last_name

  initial_password {
    value     = var.test_user_password
    temporary = false
  }
}

# テストユーザーにOwnerロールを割り当て
resource "keycloak_user_roles" "admin_test_roles" {
  realm_id = keycloak_realm.tumiki.id
  user_id  = keycloak_user.admin_test.id

  role_ids = [
    keycloak_role.owner.id
  ]
}
