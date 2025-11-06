#!/bin/bash

# =============================================================================
# Tumiki Keycloak Protocol Mapper Setup Script
# =============================================================================
# このスクリプトは Keycloak に Tumiki カスタムクレームを設定します。
#
# 設定内容:
# - Client Scope: tumiki-claims
# - Protocol Mapper 1: org_id (tumiki.org_id)
# - Protocol Mapper 2: is_org_admin (tumiki.is_org_admin)
# - Protocol Mapper 3: user_db_id (tumiki.user_db_id)
#
# 実行方法:
# docker exec -it tumiki-keycloak bash
# cd /opt/keycloak/init-scripts
# chmod +x setup-tumiki.sh
# ./setup-tumiki.sh
# =============================================================================

set -e

# Keycloak管理CLIの設定
KCADM="/opt/keycloak/bin/kcadm.sh"
REALM="tumiki"
CLIENT_NAME="tumiki-manager"

echo "========================================="
echo "Tumiki Keycloak Setup Script"
echo "========================================="

# ログイン
echo "Logging in to Keycloak Admin API..."
$KCADM config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password admin123

echo "✅ Logged in successfully"

# Client Scopeが既に存在するかチェック（jq不要版）
echo "Checking if client scope 'tumiki-claims' exists..."
CLIENT_SCOPE_ID=$($KCADM get client-scopes -r $REALM | grep -o '"id":"[^"]*"' | grep -A1 '"name":"tumiki-claims"' | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1 || echo "")

if [ -n "$CLIENT_SCOPE_ID" ]; then
  echo "⚠️  Client Scope 'tumiki-claims' already exists: $CLIENT_SCOPE_ID"
else
  echo "Creating Tumiki custom claims client scope..."

  # Client Scopeの作成
  CLIENT_SCOPE_ID=$($KCADM create client-scopes \
    -r $REALM \
    -s name=tumiki-claims \
    -s description="Tumiki custom claims for JWT" \
    -s protocol=openid-connect \
    -s 'attributes."include.in.token.scope"=true' \
    -s 'attributes."display.on.consent.screen"=false' \
    -i)

  echo "✅ Client Scope created: $CLIENT_SCOPE_ID"
fi

echo "Client Scope ID: $CLIENT_SCOPE_ID"

# Protocol Mapper 1: org_id
echo "Creating mapper: org_id"
$KCADM create client-scopes/$CLIENT_SCOPE_ID/protocol-mappers/models \
  -r $REALM \
  -s name=org_id \
  -s protocol=openid-connect \
  -s protocolMapper=oidc-usermodel-attribute-mapper \
  -s 'config."user.attribute"=tumiki_org_id' \
  -s 'config."claim.name"=tumiki.org_id' \
  -s 'config."jsonType.label"=String' \
  -s 'config."id.token.claim"=true' \
  -s 'config."access.token.claim"=true' \
  -s 'config."userinfo.token.claim"=true' 2>/dev/null || echo "  ℹ️  Mapper 'org_id' may already exist"

echo "✅ Mapper 'org_id' configured"

# Protocol Mapper 2: is_org_admin
echo "Creating mapper: is_org_admin"
$KCADM create client-scopes/$CLIENT_SCOPE_ID/protocol-mappers/models \
  -r $REALM \
  -s name=is_org_admin \
  -s protocol=openid-connect \
  -s protocolMapper=oidc-usermodel-attribute-mapper \
  -s 'config."user.attribute"=tumiki_is_org_admin' \
  -s 'config."claim.name"=tumiki.is_org_admin' \
  -s 'config."jsonType.label"=boolean' \
  -s 'config."id.token.claim"=true' \
  -s 'config."access.token.claim"=true' \
  -s 'config."userinfo.token.claim"=true' 2>/dev/null || echo "  ℹ️  Mapper 'is_org_admin' may already exist"

echo "✅ Mapper 'is_org_admin' configured"

# Protocol Mapper 3: tumiki_user_id
echo "Creating mapper: tumiki_user_id"
$KCADM create client-scopes/$CLIENT_SCOPE_ID/protocol-mappers/models \
  -r $REALM \
  -s name=tumiki_user_id \
  -s protocol=openid-connect \
  -s protocolMapper=oidc-usermodel-attribute-mapper \
  -s 'config."user.attribute"=tumiki_tumiki_user_id' \
  -s 'config."claim.name"=tumiki.tumiki_user_id' \
  -s 'config."jsonType.label"=String' \
  -s 'config."id.token.claim"=true' \
  -s 'config."access.token.claim"=true' \
  -s 'config."userinfo.token.claim"=true' 2>/dev/null || echo "  ℹ️  Mapper 'tumiki_user_id' may already exist"

echo "✅ Mapper 'tumiki_user_id' configured"

# Protocol Mapper 4: mcp_instance_id
echo "Creating mapper: mcp_instance_id"
$KCADM create client-scopes/$CLIENT_SCOPE_ID/protocol-mappers/models \
  -r $REALM \
  -s name=mcp_instance_id \
  -s protocol=openid-connect \
  -s protocolMapper=oidc-usermodel-attribute-mapper \
  -s 'config."user.attribute"=tumiki_mcp_instance_id' \
  -s 'config."claim.name"=tumiki.mcp_instance_id' \
  -s 'config."jsonType.label"=String' \
  -s 'config."id.token.claim"=true' \
  -s 'config."access.token.claim"=true' \
  -s 'config."userinfo.token.claim"=true' 2>/dev/null || echo "  ℹ️  Mapper 'mcp_instance_id' may already exist"

echo "✅ Mapper 'mcp_instance_id' configured"

# Clientを取得（jq不要版）
echo "Getting client ID for: $CLIENT_NAME"
CLIENT_ID=$($KCADM get clients -r $REALM | grep -B2 "\"clientId\" *: *\"$CLIENT_NAME\"" | grep '"id"' | cut -d'"' -f4 | head -1)

if [ -z "$CLIENT_ID" ]; then
  echo "❌ Error: Client '$CLIENT_NAME' not found"
  exit 1
fi

echo "Client UUID: $CLIENT_ID"

# ClientにClient Scopeが既に割り当てられているかチェック（jq不要版）
EXISTING_ASSIGNMENT=$($KCADM get clients/$CLIENT_ID/default-client-scopes -r $REALM | grep "\"id\" *: *\"$CLIENT_SCOPE_ID\"" || echo "")

if [ -n "$EXISTING_ASSIGNMENT" ]; then
  echo "⚠️  Client Scope already assigned to client. Skipping assignment."
else
  # ClientにClient Scopeを割り当て（Default）
  echo "Assigning client scope to client..."
  $KCADM update clients/$CLIENT_ID/default-client-scopes/$CLIENT_SCOPE_ID \
    -r $REALM

  echo "✅ Client Scope assigned to client"
fi

echo ""
echo "========================================="
echo "✅ Tumiki custom claims setup completed!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Verify JWT claims by logging in and inspecting the access token"
echo "2. Ensure user attributes are set:"
echo "   - tumiki_org_id"
echo "   - tumiki_is_org_admin"
echo "   - tumiki_tumiki_user_id"
echo "   - tumiki_mcp_instance_id"
echo "3. Test JWT decoding: echo \$TOKEN | cut -d. -f2 | base64 -d | jq ."
echo ""
