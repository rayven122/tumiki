# Keycloak Authentication Flow設定

resource "keycloak_authentication_flow" "google_only_browser" {
  count = local.google_only_browser_login_enabled ? 1 : 0

  realm_id    = keycloak_realm.tumiki.id
  alias       = "tumiki-google-only-browser"
  description = "Browser login flow that keeps SSO cookies and redirects unauthenticated users to Google."
}

resource "keycloak_authentication_execution" "google_only_cookie" {
  count = local.google_only_browser_login_enabled ? 1 : 0

  realm_id          = keycloak_realm.tumiki.id
  parent_flow_alias = keycloak_authentication_flow.google_only_browser[0].alias
  authenticator     = "auth-cookie"
  requirement       = "ALTERNATIVE"
  priority          = 10
}

resource "keycloak_authentication_execution" "google_only_idp_redirector" {
  count = local.google_only_browser_login_enabled ? 1 : 0

  realm_id          = keycloak_realm.tumiki.id
  parent_flow_alias = keycloak_authentication_flow.google_only_browser[0].alias
  authenticator     = "identity-provider-redirector"
  requirement       = "ALTERNATIVE"
  priority          = 20

  depends_on = [
    keycloak_authentication_execution.google_only_cookie,
  ]
}

resource "keycloak_authentication_execution_config" "google_only_idp_redirector" {
  count = local.google_only_browser_login_enabled ? 1 : 0

  realm_id     = keycloak_realm.tumiki.id
  execution_id = keycloak_authentication_execution.google_only_idp_redirector[0].id
  alias        = "tumiki-google-only-idp-redirector"

  config = {
    defaultProvider = local.google_idp_alias
  }
}

resource "keycloak_authentication_bindings" "google_only_browser" {
  count = local.google_only_browser_login_enabled ? 1 : 0

  realm_id     = keycloak_realm.tumiki.id
  browser_flow = keycloak_authentication_flow.google_only_browser[0].alias

  # Google IdP 障害時は google_only_browser_login = false で apply し直す。
  # この binding が destroy されると realm の browser_flow はデフォルトへ戻る。
  depends_on = [
    keycloak_authentication_execution_config.google_only_idp_redirector,
  ]
}
