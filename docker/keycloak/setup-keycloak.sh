#!/bin/bash
# Keycloak セットアップスクリプト
# 環境変数から設定を読み込んでKeycloakを構成します

set -e

# 環境変数チェック
check_env() {
  local var_name=$1
  if [ -z "${!var_name}" ]; then
    echo "エラー: 環境変数 $var_name が設定されていません"
    exit 1
  fi
}

# 必須環境変数
check_env "KEYCLOAK_ADMIN_USERNAME"
check_env "KEYCLOAK_ADMIN_PASSWORD"

# デフォルト値
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${KEYCLOAK_REALM:-tumiki}"
CLIENT_NAME="${KEYCLOAK_CLIENT_ID:-tumiki-manager}"
KCADM="/opt/keycloak/bin/kcadm.sh"

echo "Keycloak セットアップ開始"

# 認証
echo "認証中..."
$KCADM config credentials \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN_USERNAME" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" \
  --config /tmp/kcadm.config

# Tumiki カスタムクレーム設定
echo "Tumiki カスタムクレーム設定中..."

# Client Scopeが存在するかチェック
CLIENT_SCOPE_ID=$($KCADM get client-scopes -r "$REALM" --config /tmp/kcadm.config 2>/dev/null | grep -o '"id":"[^"]*"' | grep -A1 '"name":"tumiki-claims"' | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1 || echo "")

if [ -z "$CLIENT_SCOPE_ID" ]; then
  CLIENT_SCOPE_ID=$($KCADM create client-scopes -r "$REALM" --config /tmp/kcadm.config \
    -s name=tumiki-claims \
    -s description="Tumiki custom claims for JWT" \
    -s protocol=openid-connect \
    -s 'attributes."include.in.token.scope"=true' \
    -s 'attributes."display.on.consent.screen"=false' \
    -i)
fi

# マッパー作成関数
create_mapper() {
  local scope_id=$1 name=$2 user_attr=$3 claim_name=$4 json_type=$5

  $KCADM create client-scopes/"$scope_id"/protocol-mappers/models -r "$REALM" --config /tmp/kcadm.config \
    -s name="$name" \
    -s protocol=openid-connect \
    -s protocolMapper=oidc-usermodel-attribute-mapper \
    -s "config.\"user.attribute\"=$user_attr" \
    -s "config.\"claim.name\"=$claim_name" \
    -s "config.\"jsonType.label\"=$json_type" \
    -s 'config."id.token.claim"=true' \
    -s 'config."access.token.claim"=true' \
    -s 'config."userinfo.token.claim"=true' 2>/dev/null || true
}

# カスタムクレームマッパー作成
create_mapper "$CLIENT_SCOPE_ID" "org_id" "tumiki_org_id" "tumiki.org_id" "String"
create_mapper "$CLIENT_SCOPE_ID" "is_org_admin" "tumiki_is_org_admin" "tumiki.is_org_admin" "boolean"
create_mapper "$CLIENT_SCOPE_ID" "user_db_id" "tumiki_user_db_id" "tumiki.user_db_id" "String"

# Clientに割り当て
CLIENT_ID=$($KCADM get clients -r "$REALM" --config /tmp/kcadm.config 2>/dev/null | grep -B2 "\"clientId\" *: *\"$CLIENT_NAME\"" | grep '"id"' | cut -d'"' -f4 | head -1)
if [ -n "$CLIENT_ID" ]; then
  $KCADM update clients/"$CLIENT_ID"/default-client-scopes/"$CLIENT_SCOPE_ID" -r "$REALM" --config /tmp/kcadm.config 2>/dev/null || true
fi

# Google IdP設定（環境変数がある場合のみ）
if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ]; then
  echo "Google IdP 設定中..."

  IDP_ALIAS="google"

  # IdP作成/更新
  if $KCADM get identity-provider/instances/"$IDP_ALIAS" -r "$REALM" --config /tmp/kcadm.config &>/dev/null; then
    $KCADM update identity-provider/instances/"$IDP_ALIAS" -r "$REALM" --config /tmp/kcadm.config \
      -s enabled=true \
      -s trustEmail=true \
      -s storeToken=false \
      -s config.clientId="$GOOGLE_CLIENT_ID" \
      -s config.clientSecret="$GOOGLE_CLIENT_SECRET" \
      -s config.defaultScope="openid profile email" \
      -s config.syncMode="IMPORT" 2>/dev/null
  else
    $KCADM create identity-provider/instances -r "$REALM" --config /tmp/kcadm.config \
      -s alias="$IDP_ALIAS" \
      -s providerId="google" \
      -s enabled=true \
      -s trustEmail=true \
      -s storeToken=false \
      -s firstBrokerLoginFlowAlias="first broker login" \
      -s config.clientId="$GOOGLE_CLIENT_ID" \
      -s config.clientSecret="$GOOGLE_CLIENT_SECRET" \
      -s config.defaultScope="openid profile email" \
      -s config.syncMode="IMPORT" 2>/dev/null
  fi

  # マッパー作成関数
  create_idp_mapper() {
    local name=$1 type=$2 claim=$3 attr=$4

    if $KCADM get identity-provider/instances/"$IDP_ALIAS"/mappers -r "$REALM" --config /tmp/kcadm.config 2>/dev/null | grep -q "\"name\" : \"$name\""; then
      return 0
    fi

    $KCADM create identity-provider/instances/"$IDP_ALIAS"/mappers -r "$REALM" --config /tmp/kcadm.config \
      -s name="$name" \
      -s identityProviderAlias="$IDP_ALIAS" \
      -s identityProviderMapper="$type" \
      -s config.syncMode="INHERIT" \
      -s config.claim="$claim" \
      -s config.user.attribute="$attr" 2>/dev/null || true
  }

  # Google IdPマッパー作成
  create_idp_mapper "google-username" "oidc-username-idp-mapper" "email" ""
  create_idp_mapper "google-email" "oidc-user-attribute-idp-mapper" "email" "email"
  create_idp_mapper "google-first-name" "oidc-user-attribute-idp-mapper" "given_name" "firstName"
  create_idp_mapper "google-last-name" "oidc-user-attribute-idp-mapper" "family_name" "lastName"
  create_idp_mapper "google-email-verified" "oidc-user-attribute-idp-mapper" "email_verified" "emailVerified"
  create_idp_mapper "google-picture" "oidc-user-attribute-idp-mapper" "picture" "picture"
fi

echo "セットアップ完了"
