#!/bin/bash
# Keycloak Dynamic Client Registration (DCR) ポリシー設定スクリプト
# 匿名クライアント登録を許可するため、制限的なポリシーを削除
set -euo pipefail

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${REALM:-tumiki}"
ADMIN_USER="${KEYCLOAK_ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin123}"

echo "=== Keycloak DCR Policy Configuration ==="
echo "URL: $KEYCLOAK_URL"
echo "Realm: $REALM"

# kcadmコマンドのパス
KCADM="/opt/keycloak/bin/kcadm.sh"

# 管理者認証
echo "Authenticating as admin..."
$KCADM config credentials \
    --server "$KEYCLOAK_URL" \
    --realm master \
    --user "$ADMIN_USER" \
    --password "$ADMIN_PASSWORD"

# 匿名ポリシーを削除する関数
# jqが利用できない環境ではawkを使用
delete_anonymous_policy() {
    local policy_name="$1"
    echo "Checking for policy: $policy_name"

    # DCRポリシー一覧を取得
    local policies
    policies=$($KCADM get clients-initial-access -r "$REALM" 2>/dev/null || echo "[]")

    # anonymous-policiesエンドポイントを使用
    local anon_policies
    anon_policies=$($KCADM get "clients-registrations-policy/anonymous-policies" -r "$REALM" 2>/dev/null || echo "[]")

    # jqが利用可能な場合
    if command -v jq &> /dev/null; then
        local policy_id
        policy_id=$(echo "$anon_policies" | jq -r ".[] | select(.name == \"$policy_name\") | .id" 2>/dev/null || echo "")

        if [[ -n "$policy_id" && "$policy_id" != "null" ]]; then
            echo "Deleting policy: $policy_name (ID: $policy_id)"
            $KCADM delete "clients-registrations-policy/anonymous-policies/$policy_id" -r "$REALM" || {
                echo "Warning: Could not delete policy $policy_name"
            }
        else
            echo "Policy not found or already deleted: $policy_name"
        fi
    else
        # awkでJSONをパース（jqが利用できない場合）
        local policy_id
        policy_id=$(echo "$anon_policies" | awk -v name="$policy_name" '
            BEGIN { RS="}"; FS="[,:]" }
            /"name"/ && /"id"/ {
                found_name = 0; found_id = ""
                for (i=1; i<=NF; i++) {
                    gsub(/["\[\] ]/, "", $i)
                    if ($i == "name" && $(i+1) == name) found_name = 1
                    if ($i == "id") found_id = $(i+1)
                }
                if (found_name && found_id != "") print found_id
            }
        ' 2>/dev/null || echo "")

        if [[ -n "$policy_id" ]]; then
            echo "Deleting policy: $policy_name (ID: $policy_id)"
            $KCADM delete "clients-registrations-policy/anonymous-policies/$policy_id" -r "$REALM" || {
                echo "Warning: Could not delete policy $policy_name"
            }
        else
            echo "Policy not found or already deleted: $policy_name"
        fi
    fi
}

# レルムの存在確認
echo "Checking realm: $REALM"
if ! $KCADM get "realms/$REALM" &>/dev/null; then
    echo "Realm $REALM does not exist. Skipping DCR policy configuration."
    exit 0
fi

# 制限的なDCRポリシーを削除
echo "Removing restrictive DCR policies..."

# Trusted Hosts ポリシー（特定のホストからのみ登録を許可）
delete_anonymous_policy "Trusted Hosts"

# Allowed Client Scopes ポリシー（特定のスコープのみ許可）
delete_anonymous_policy "Allowed Client Scopes"

# Allowed Protocol Mapper Types ポリシー（特定のマッパータイプのみ許可）
delete_anonymous_policy "Allowed Protocol Mapper Types"

# Consent Required ポリシー
delete_anonymous_policy "Consent Required"

# Max Clients Limit ポリシー
delete_anonymous_policy "Max Clients Limit"

# Tumikiカスタムテーマを適用
echo "Tumikiカスタムテーマを適用中..."
$KCADM update realms/"$REALM" \
  -s loginTheme=tumiki \
  -s accountTheme=tumiki 2>/dev/null || true
echo "✓ Tumikiテーマを適用しました"

# 国際化設定（日本語・英語）
echo "国際化設定を有効化中..."
$KCADM update realms/"$REALM" \
  -s internationalizationEnabled=true \
  -s 'supportedLocales=["ja","en"]' \
  -s defaultLocale=ja 2>/dev/null || true
echo "✓ 国際化設定を有効化しました（日本語・英語）"

echo "=== DCR Policy Configuration Complete ==="
echo "Anonymous client registration is now less restricted for realm: $REALM"
