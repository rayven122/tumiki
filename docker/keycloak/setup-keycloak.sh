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

# 認証（リトライ機能付き）
echo "認証中..."
RETRY_COUNT=5
RETRY_DELAY=10

for i in $(seq 1 $RETRY_COUNT); do
  if $KCADM config credentials \
    --server "$KEYCLOAK_URL" \
    --realm master \
    --user "$KEYCLOAK_ADMIN_USERNAME" \
    --password "$KEYCLOAK_ADMIN_PASSWORD" \
    --config /tmp/kcadm.config 2>/tmp/kcadm_error.log; then
    echo "認証成功"
    break
  else
    if [ $i -eq $RETRY_COUNT ]; then
      echo "エラー: 認証に失敗しました（試行回数: $RETRY_COUNT）"
      cat /tmp/kcadm_error.log
      exit 1
    fi
    echo "認証失敗。${RETRY_DELAY}秒後に再試行します...（試行 $i/$RETRY_COUNT）"
    sleep $RETRY_DELAY
  fi
done

# Tumiki カスタムクレーム設定
echo "Tumiki カスタムクレーム設定中..."

# Client Scopeが存在するかチェック
CLIENT_SCOPE_JSON=$($KCADM get client-scopes -r "$REALM" --config /tmp/kcadm.config 2>/dev/null || echo "{}")
CLIENT_SCOPE_ID=$(echo "$CLIENT_SCOPE_JSON" | grep -B2 '"name" : "tumiki-claims"' | grep '"id"' | head -1 | sed 's/.*"id" : "\([^"]*\)".*/\1/')

if [ -z "$CLIENT_SCOPE_ID" ]; then
  CLIENT_SCOPE_ID=$($KCADM create client-scopes -r "$REALM" --config /tmp/kcadm.config \
    -s name=tumiki-claims \
    -s description="Tumiki custom claims for JWT" \
    -s protocol=openid-connect \
    -s 'attributes."include.in.token.scope"=true' \
    -s 'attributes."display.on.consent.screen"=false' \
    -i 2>/dev/null || echo "")
fi

if [ -z "$CLIENT_SCOPE_ID" ]; then
  echo "エラー: Client Scopeの作成に失敗しました"
  # 既存のClient Scope IDを再取得
  CLIENT_SCOPE_ID=$(echo "$CLIENT_SCOPE_JSON" | grep -B2 '"name" : "tumiki-claims"' | grep '"id"' | head -1 | sed 's/.*"id" : "\([^"]*\)".*/\1/')
fi

echo "Client Scope ID: $CLIENT_SCOPE_ID"

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
create_mapper "$CLIENT_SCOPE_ID" "tumiki_user_id" "tumiki_user_id" "tumiki.tumiki_user_id" "String"
create_mapper "$CLIENT_SCOPE_ID" "default_organization_id" "default_organization_id" "tumiki.default_organization_id" "String"

# 注意: mcp_instance_id は JWT に含めず、URL パスから取得する設計に変更
# そのため、Keycloak での mcp_instance_id マッパーは不要

# Clientに割り当て
CLIENT_ID=$($KCADM get clients -r "$REALM" --config /tmp/kcadm.config 2>/dev/null | grep -B2 "\"clientId\" *: *\"$CLIENT_NAME\"" | grep '"id"' | cut -d'"' -f4 | head -1)
if [ -n "$CLIENT_ID" ]; then
  $KCADM update clients/"$CLIENT_ID"/default-client-scopes/"$CLIENT_SCOPE_ID" -r "$REALM" --config /tmp/kcadm.config 2>/dev/null || true
fi

# tumiki-proxy クライアントにも割り当て
PROXY_CLIENT_ID=$($KCADM get clients -r "$REALM" --config /tmp/kcadm.config 2>/dev/null | grep -B2 '"clientId" *: *"tumiki-proxy"' | grep '"id"' | cut -d'"' -f4 | head -1)
if [ -n "$PROXY_CLIENT_ID" ]; then
  echo "tumiki-proxy クライアントにスコープを割り当て中..."
  $KCADM update clients/"$PROXY_CLIENT_ID"/default-client-scopes/"$CLIENT_SCOPE_ID" -r "$REALM" --config /tmp/kcadm.config 2>/dev/null || true
fi

# 組織管理用Realm Rolesの作成
echo "組織管理用Realm Rolesを作成中..."
create_realm_role() {
  local role_name=$1
  local role_description=$2

  # ロールが既に存在するかチェック
  if ! $KCADM get roles -r "$REALM" --config /tmp/kcadm.config 2>/dev/null | grep -q "\"name\" : \"$role_name\""; then
    $KCADM create roles -r "$REALM" --config /tmp/kcadm.config \
      -s name="$role_name" \
      -s description="$role_description" 2>/dev/null || true
    echo "  ✓ ロール '$role_name' を作成しました"
  else
    echo "  - ロール '$role_name' は既に存在します"
  fi
}

create_realm_role "Owner" "Organization Owner - Full permissions"
create_realm_role "Admin" "Organization Admin - Can manage members"
create_realm_role "Member" "Organization Member - Basic usage"
create_realm_role "Viewer" "Organization Viewer - Read-only access"

# Google IdP設定（環境変数がある場合のみ）
if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ]; then
  echo "Google IdP 設定中..."

  IDP_ALIAS="google"

  # カスタムFirst Broker Login Flowを作成（Review Profileをスキップ）
  CUSTOM_FLOW_ALIAS="tumiki-broker-login"

  if ! $KCADM get authentication/flows -r "$REALM" --config /tmp/kcadm.config 2>/dev/null | grep -q "\"alias\" : \"$CUSTOM_FLOW_ALIAS\""; then
    echo "カスタムブローカーログインフロー作成中..."

    # デフォルトの first broker login フローをコピー
    $KCADM create authentication/flows/"first%20broker%20login"/copy -r "$REALM" --config /tmp/kcadm.config \
      -s newName="$CUSTOM_FLOW_ALIAS" 2>/dev/null || true

    # Review Profile ステップを無効化
    # フローの実行ステップを取得
    sleep 1  # フローが作成されるまで少し待つ
    EXECUTIONS=$($KCADM get authentication/flows/"$CUSTOM_FLOW_ALIAS"/executions -r "$REALM" --config /tmp/kcadm.config 2>/dev/null)

    # Review Profile の実行IDを取得して無効化
    REVIEW_PROFILE_ID=$(echo "$EXECUTIONS" | grep -B5 "\"displayName\" : \"Review Profile\"" | grep '"id"' | head -1 | cut -d'"' -f4)

    if [ -n "$REVIEW_PROFILE_ID" ]; then
      # executionのrequirementを更新（フロー実行エンドポイント経由）
      $KCADM update authentication/flows/"$CUSTOM_FLOW_ALIAS"/executions -r "$REALM" --config /tmp/kcadm.config \
        --body "{\"id\":\"$REVIEW_PROFILE_ID\",\"requirement\":\"DISABLED\"}" 2>/dev/null || true
      echo "Review Profileステップを無効化しました"

      # Review Profile の設定を取得して update.profile.on.first.login を off に設定
      CONFIG_ID=$(echo "$EXECUTIONS" | grep -A10 "\"displayName\" : \"Review Profile\"" | grep "authenticationConfig" | cut -d'"' -f4)
      if [ -n "$CONFIG_ID" ]; then
        cat > /tmp/review-config.json <<EOF
{
  "config": {
    "update.profile.on.first.login": "off"
  }
}
EOF
        $KCADM update authentication/config/"$CONFIG_ID" -r "$REALM" --config /tmp/kcadm.config -f /tmp/review-config.json 2>/dev/null || true
        echo "Review Profile設定を off に更新しました"
      fi
    fi
  fi

  # IdP作成/更新
  if $KCADM get identity-provider/instances/"$IDP_ALIAS" -r "$REALM" --config /tmp/kcadm.config &>/dev/null; then
    $KCADM update identity-provider/instances/"$IDP_ALIAS" -r "$REALM" --config /tmp/kcadm.config \
      -s enabled=true \
      -s trustEmail=true \
      -s storeToken=false \
      -s firstBrokerLoginFlowAlias="$CUSTOM_FLOW_ALIAS" \
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
      -s firstBrokerLoginFlowAlias="$CUSTOM_FLOW_ALIAS" \
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

    # oidc-username-idp-mapper用の特別処理
    if [ "$type" = "oidc-username-idp-mapper" ]; then
      $KCADM create identity-provider/instances/"$IDP_ALIAS"/mappers -r "$REALM" --config /tmp/kcadm.config \
        --body "{\"name\":\"$name\",\"identityProviderAlias\":\"$IDP_ALIAS\",\"identityProviderMapper\":\"$type\",\"config\":{\"syncMode\":\"INHERIT\",\"template\":\"\${CLAIM.$claim}\"}}" 2>/dev/null || true
    else
      $KCADM create identity-provider/instances/"$IDP_ALIAS"/mappers -r "$REALM" --config /tmp/kcadm.config \
        --body "{\"name\":\"$name\",\"identityProviderAlias\":\"$IDP_ALIAS\",\"identityProviderMapper\":\"$type\",\"config\":{\"syncMode\":\"INHERIT\",\"claim\":\"$claim\",\"user.attribute\":\"$attr\"}}" 2>/dev/null || true
    fi
  }

  # Google IdPマッパー作成
  create_idp_mapper "google-username" "oidc-username-idp-mapper" "email" ""
  create_idp_mapper "google-email" "oidc-user-attribute-idp-mapper" "email" "email"
  create_idp_mapper "google-first-name" "oidc-user-attribute-idp-mapper" "given_name" "firstName"
  create_idp_mapper "google-last-name" "oidc-user-attribute-idp-mapper" "family_name" "lastName"
  create_idp_mapper "google-email-verified" "oidc-user-attribute-idp-mapper" "email_verified" "emailVerified"
  create_idp_mapper "google-picture" "oidc-user-attribute-idp-mapper" "picture" "picture"
fi

# ユーザープロフィール設定: firstName と lastName を任意にする
# 注: この設定は新規ユーザー作成時とプロフィール更新時の両方に適用される
echo "ユーザープロフィール設定: firstName と lastName を任意にしています..."

# User Profile を有効化（Keycloak 21+）
$KCADM update realms/"$REALM" -r "$REALM" --config /tmp/kcadm.config \
  -s 'attributes."userProfileEnabled"=true' 2>/dev/null || true

# 既存のUser Profileを取得し、firstName/lastNameのrequiredを削除
# これにより新規作成時も更新時も両方で任意フィールドになる
if $KCADM get users/profile -r "$REALM" --config /tmp/kcadm.config > /tmp/user-profile-orig.json 2>/dev/null; then
  # sedを使ってfirstName/lastNameのrequiredブロックを削除
  # JSONの"required": {...}ブロック全体を、firstName/lastNameの属性から削除
  sed -E '/"name" *: *"(firstName|lastName)"/,/"multivalued"/{ /"required" *: *\{/,/\},?/d; }' \
    /tmp/user-profile-orig.json > /tmp/user-profile.json

  # 設定を適用
  if $KCADM update users/profile -r "$REALM" --config /tmp/kcadm.config -f /tmp/user-profile.json 2>&1; then
    echo "✓ firstName と lastName を任意フィールドに設定しました"
  else
    echo "警告: User Profile設定の更新に失敗しました"
  fi
else
  echo "警告: User Profileの取得に失敗しました"
fi

# masterレルムのSSL要件を無効化（開発環境用）
# 注: tumikiレルムはtumiki-realm.jsonで既にsslRequired=noneが設定済み
echo "masterレルムのSSL要件を無効化中..."
$KCADM update realms/master -r master --config /tmp/kcadm.config \
  -s sslRequired=NONE 2>/dev/null || true

# DCR (Dynamic Client Registration) の匿名アクセスを有効化
# Trusted Hosts ポリシーを削除することで、IAT なしでの DCR を許可
echo "DCR 匿名アクセスを有効化中..."
POLICIES_JSON=$($KCADM get components -r "$REALM" --config /tmp/kcadm.config \
  -q type=org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy 2>/dev/null || echo "[]")

# Anonymous Access Policies の Trusted Hosts ポリシー ID を取得して削除
TRUSTED_HOSTS_ID=$(echo "$POLICIES_JSON" | grep -B10 '"name" : "Trusted Hosts"' | grep -A10 '"subType" : "anonymous"' | grep '"id"' | head -1 | sed 's/.*"id" : "\([^"]*\)".*/\1/')

if [ -n "$TRUSTED_HOSTS_ID" ]; then
  if $KCADM delete components/"$TRUSTED_HOSTS_ID" -r "$REALM" --config /tmp/kcadm.config 2>/dev/null; then
    echo "  ✓ Trusted Hosts ポリシーを削除しました（匿名 DCR 有効）"
  else
    echo "  - Trusted Hosts ポリシーの削除に失敗しました"
  fi
else
  echo "  - Trusted Hosts ポリシーは既に削除済みです"
fi

echo "セットアップ完了"
