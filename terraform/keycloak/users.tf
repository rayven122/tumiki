# Keycloak Users設定

# 管理者テストユーザー
# var.enable_test_user = false の環境ではテストユーザーを作成しない。
resource "keycloak_user" "admin_test" {
  count    = var.enable_test_user ? 1 : 0
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

  # Keycloak User Profile設定でfirstName/lastNameが読み取り専用の場合は無視
  lifecycle {
    ignore_changes = [first_name, last_name]
  }
}

# テストユーザーにOwnerロールを割り当て
resource "keycloak_user_roles" "admin_test_roles" {
  count    = var.enable_test_user ? 1 : 0
  realm_id = keycloak_realm.tumiki.id
  user_id  = keycloak_user.admin_test[0].id

  role_ids = [
    keycloak_role.org_roles["owner"].id
  ]
}
