# JWT Claims 設計仕様書

## 📋 概要

本ドキュメントでは、Tumiki における Keycloak JWT トークンの構造設計について詳細に説明します。

### 設計目標

1. **サイズ制限**: Cookie 制限（4KB）内に収まるJWT構造
2. **必要十分な情報**: 認証・認可に必要な最小限のクレーム
3. **標準準拠**: OpenID Connect / OAuth 2.0 標準に準拠
4. **拡張性**: 将来の機能追加に対応可能

---

## 🎯 JWT 構造設計

### 完全な JWT ペイロード構造

```json
{
  // ========================================
  // 標準クレーム（OpenID Connect / OAuth 2.0）
  // ========================================

  // ユーザー識別子（Keycloak内のユーザーID）
  "sub": "f47ac10b-58cc-4372-a567-0e02b2c3d479",

  // メールアドレス
  "email": "user@example.com",

  // 表示名
  "name": "山田 太郎",

  // ユーザー名
  "preferred_username": "yamada.taro",

  // 発行者（Keycloak Realm）
  "iss": "https://keycloak.tumiki.cloud/realms/tumiki",

  // 対象者（クライアントID）
  "aud": "tumiki-app",

  // 発行時刻（Unix timestamp）
  "iat": 1699564800,

  // 有効期限（Unix timestamp）
  "exp": 1699568400,

  // ========================================
  // Keycloak 標準クレーム
  // ========================================

  // Realmレベルのロール
  "realm_access": {
    "roles": ["admin", "user", "viewer"]
  },

  // クライアント固有のロール
  "resource_access": {
    "tumiki-app": {
      "roles": ["mcp_access", "api_user"]
    }
  },

  // 認証されたクライアントID
  "azp": "tumiki-app",

  // 許可されたスコープ（スペース区切り）
  "scope": "openid email profile mcp:access",

  // セッションID
  "session_state": "7b3f8e9c-1a2b-4c5d-8e9f-0a1b2c3d4e5f",

  // ========================================
  // Tumiki カスタムクレーム
  // ========================================

  "tumiki": {
    // 組織ID（Organization.id）
    "org_id": "org_clx9k2m0p0000qr8v7h3j4k5l",

    // 組織管理者フラグ（OrganizationMember.isAdmin）
    "is_org_admin": true,

    // TumikiデータベースのユーザーID（User.id）
    "user_db_id": "clx9k2m0p0001qr8v7h3j4k5m"
  }
}
```

### サイズ分析

#### 標準クレーム部分
- 必須クレーム: 約200バイト
- Keycloak標準: 約150バイト

#### Tumikiカスタムクレーム
- `tumiki` オブジェクト: 約150バイト

#### 合計サイズ
- JSON形式: 約500バイト
- Base64エンコード後: 約650バイト
- JWT署名付き: 約900バイト

**結論**: Cookie制限（4KB）の約22%で、十分に余裕がある。

---

## 🔧 Keycloak 設定

### Protocol Mapper 設定方法

Keycloak Admin Console での手動設定手順とスクリプト自動設定の両方を説明します。

#### 方法1: Admin Console（手動設定）

1. **Client Scope の作成**

```
Realm: tumiki
→ Client Scopes
→ Create client scope

Name: tumiki-claims
Description: Tumiki custom claims for JWT
Type: Optional
Protocol: openid-connect
Include in token scope: ON
```

2. **Protocol Mapper の追加**

以下の3つのMapperを作成します。

##### Mapper 1: org_id

```
Mapper Type: User Attribute
Name: org_id
User Attribute: tumiki_org_id
Token Claim Name: tumiki.org_id
Claim JSON Type: String
Add to ID token: ON
Add to access token: ON
Add to userinfo: ON
Multivalued: OFF
```

##### Mapper 2: is_org_admin

```
Mapper Type: User Attribute
Name: is_org_admin
User Attribute: tumiki_is_org_admin
Token Claim Name: tumiki.is_org_admin
Claim JSON Type: boolean
Add to ID token: ON
Add to access token: ON
Add to userinfo: ON
Multivalued: OFF
```

##### Mapper 3: user_db_id

```
Mapper Type: User Attribute
Name: user_db_id
User Attribute: tumiki_user_db_id
Token Claim Name: tumiki.user_db_id
Claim JSON Type: String
Add to ID token: ON
Add to access token: ON
Add to userinfo: ON
Multivalued: OFF
```

3. **Client への割り当て**

```
Realm: tumiki
→ Clients
→ tumiki-app
→ Client scopes
→ Add client scope

Client Scope: tumiki-claims
Assignment type: Default
```

#### 方法2: kcadm.sh スクリプト（自動設定）

`docker/keycloak/init-scripts/setup-tumiki.sh` に追加:

```bash
#!/bin/bash

# Keycloak管理CLIの設定
KCADM="/opt/keycloak/bin/kcadm.sh"
REALM="tumiki"
CLIENT_NAME="tumiki-app"

# ログイン
$KCADM config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password admin

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
  -s 'config."userinfo.token.claim"=true'

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
  -s 'config."userinfo.token.claim"=true'

# Protocol Mapper 3: user_db_id
echo "Creating mapper: user_db_id"
$KCADM create client-scopes/$CLIENT_SCOPE_ID/protocol-mappers/models \
  -r $REALM \
  -s name=user_db_id \
  -s protocol=openid-connect \
  -s protocolMapper=oidc-usermodel-attribute-mapper \
  -s 'config."user.attribute"=tumiki_user_db_id' \
  -s 'config."claim.name"=tumiki.user_db_id' \
  -s 'config."jsonType.label"=String' \
  -s 'config."id.token.claim"=true' \
  -s 'config."access.token.claim"=true' \
  -s 'config."userinfo.token.claim"=true'

# Clientを取得
echo "Getting client ID for: $CLIENT_NAME"
CLIENT_ID=$($KCADM get clients \
  -r $REALM \
  --fields id,clientId \
  | jq -r ".[] | select(.clientId==\"$CLIENT_NAME\") | .id")

echo "Client UUID: $CLIENT_ID"

# ClientにClient Scopeを割り当て（Default）
echo "Assigning client scope to client"
$KCADM update clients/$CLIENT_ID/default-client-scopes/$CLIENT_SCOPE_ID \
  -r $REALM

echo "✅ Tumiki custom claims setup completed!"
```

実行方法:

```bash
# Keycloakコンテナ内で実行
docker exec -it tumiki-keycloak bash
cd /opt/keycloak/init-scripts
chmod +x setup-tumiki.sh
./setup-tumiki.sh
```

---

## 👤 ユーザー属性の管理

### ユーザー属性の設定方法

Keycloakの各ユーザーに以下の属性を設定する必要があります：

- `tumiki_org_id`: 組織ID
- `tumiki_is_org_admin`: 管理者フラグ（`true` / `false`）
- `tumiki_user_db_id`: TumikiデータベースのユーザーID

#### 方法1: Admin Console（手動設定）

```
Realm: tumiki
→ Users
→ ユーザーを選択
→ Attributes タブ

Key: tumiki_org_id
Value: org_clx9k2m0p0000qr8v7h3j4k5l

Key: tumiki_is_org_admin
Value: true

Key: tumiki_user_db_id
Value: clx9k2m0p0001qr8v7h3j4k5m

→ Save
```

#### 方法2: Keycloak Admin API（自動設定）

```typescript
// apps/manager/src/lib/keycloakAdmin.ts（新規作成）
import KcAdminClient from "@keycloak/keycloak-admin-client";

const kcAdminClient = new KcAdminClient({
  baseUrl: process.env.KEYCLOAK_ISSUER!.replace("/realms/tumiki", ""),
  realmName: "tumiki",
});

// 管理者として認証
await kcAdminClient.auth({
  grantType: "client_credentials",
  clientId: process.env.KEYCLOAK_ID!,
  clientSecret: process.env.KEYCLOAK_SECRET!,
});

/**
 * ユーザー属性を更新
 */
export async function updateKeycloakUserAttributes(
  keycloakUserId: string,
  attributes: {
    tumiki_org_id: string;
    tumiki_is_org_admin: boolean;
    tumiki_user_db_id: string;
  }
) {
  await kcAdminClient.users.update(
    { id: keycloakUserId },
    {
      attributes: {
        tumiki_org_id: [attributes.tumiki_org_id],
        tumiki_is_org_admin: [String(attributes.tumiki_is_org_admin)],
        tumiki_user_db_id: [attributes.tumiki_user_db_id],
      },
    }
  );
}
```

#### 方法3: Auth.js Callback（自動同期）

**推奨**: ユーザーログイン時に自動的にKeycloak属性を同期

```typescript
// apps/manager/src/auth.ts
import { updateKeycloakUserAttributes } from "./lib/keycloakAdmin";

export default {
  // ...
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "keycloak") {
        return true;
      }

      // DBからユーザー情報を取得
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        include: {
          organizationMembers: {
            where: { organization: { isPersonal: true } },
            include: { organization: true },
          },
        },
      });

      if (!dbUser) {
        return false;
      }

      const personalOrg = dbUser.organizationMembers[0];

      if (!personalOrg) {
        // 個人組織がない場合は作成
        // ...
      }

      // Keycloak属性を更新
      await updateKeycloakUserAttributes(account.providerAccountId, {
        tumiki_org_id: personalOrg.organizationId,
        tumiki_is_org_admin: personalOrg.isAdmin,
        tumiki_user_db_id: user.id,
      });

      return true;
    },
  },
};
```

---

## 📊 JWTサイズの検証

### シナリオ別サイズ比較

#### シナリオA: サーバー単位スコープ（現在の設計） ✅

**JWT ペイロード**:
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "scope": "openid email profile mcp:access",
  "tumiki": {
    "org_id": "org_clx9k2m0p0000qr8v7h3j4k5l",
    "is_org_admin": true,
    "user_db_id": "clx9k2m0p0001qr8v7h3j4k5m"
  }
}
```

- JSON: 約500バイト
- Base64: 約650バイト
- JWT署名付き: **約900バイト** ✅

**評価**: Cookie制限（4KB）の22%、余裕あり。

---

#### シナリオB: ツール単位スコープ（細粒度） ❌

**JWT ペイロード**（100ツールの場合）:
```json
{
  "sub": "user_id",
  "scope": "mcp:tool:notion:database_query mcp:tool:notion:page_create mcp:tool:figma:get_file ...",
  "tumiki": { /* ... */ }
}
```

- 1ツールスコープ: 約30バイト
- 100ツール: 約3,000バイト
- 500ツール: **約15,000バイト** ❌

**評価**: Cookie制限を大幅に超過、実装不可。

---

#### シナリオC: サーバー単位 + DB詳細管理（ハイブリッド） ✅

**JWT ペイロード**:
```json
{
  "sub": "user_id",
  "scope": "mcp:access",  // 基本アクセス権のみ
  "tumiki": { /* ... */ }
}
```

**DB側管理**:
- ツールグループ単位の権限
- 個別ツールの有効/無効
- リソースアクセス制御

- JWT: 約500バイト ✅
- DB問い合わせ: Redisキャッシュで高速化

**評価**: 最適解。JWTサイズを抑えつつ詳細な権限管理が可能。

---

## 🔐 セキュリティ考慮事項

### 1. JWTの有効期限

```typescript
// Keycloak設定（推奨値）
{
  "accessTokenLifespan": 900,        // 15分
  "accessTokenLifespanForImplicitFlow": 900,
  "ssoSessionIdleTimeout": 1800,     // 30分
  "ssoSessionMaxLifespan": 36000,    // 10時間
  "offlineSessionIdleTimeout": 2592000  // 30日
}
```

**理由**:
- 短いトークン有効期限でセキュリティ向上
- リフレッシュトークンで長時間セッション維持

### 2. クレームの最小化原則

JWTには必要最小限の情報のみを含める：

- ✅ 含めるべき: ユーザーID、組織ID、基本ロール
- ❌ 含めない: APIキー、パスワード、詳細権限、PII（不要な個人情報）

### 3. 署名アルゴリズム

```typescript
// 推奨: RS256（非対称鍵）
{
  "algorithm": "RS256",
  "jwksUri": "https://keycloak.tumiki.cloud/realms/tumiki/protocol/openid-connect/certs"
}
```

**理由**:
- 公開鍵で検証可能（秘密鍵の共有不要）
- Keycloak標準のJWKS対応

### 4. カスタムクレームの検証

```typescript
// apps/mcp-proxy/src/middleware/keycloakAuth.ts
function validateTumikiClaims(payload: JWTPayload): boolean {
  const { tumiki } = payload;

  // 必須クレームのチェック
  if (!tumiki?.org_id || !tumiki?.user_db_id) {
    return false;
  }

  // CUID形式の検証（org_clx...）
  if (!/^org_[a-z0-9]{25}$/.test(tumiki.org_id)) {
    return false;
  }

  if (!/^cl[a-z0-9]{24}$/.test(tumiki.user_db_id)) {
    return false;
  }

  return true;
}
```

---

## 🧪 テスト方法

### JWTデコードテスト

```bash
# JWTトークンを取得
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# デコード（jwt.io または jqコマンド）
echo $TOKEN | cut -d. -f2 | base64 -d | jq .
```

期待される出力:
```json
{
  "sub": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "email": "user@example.com",
  "tumiki": {
    "org_id": "org_clx9k2m0p0000qr8v7h3j4k5l",
    "is_org_admin": true,
    "user_db_id": "clx9k2m0p0001qr8v7h3j4k5m"
  }
}
```

### Protocol Mapper動作確認

```bash
# Keycloak Admin APIでトークンを取得
curl -X POST "http://localhost:8443/realms/tumiki/protocol/openid-connect/token" \
  -d "client_id=tumiki-app" \
  -d "client_secret=tumiki-app-secret" \
  -d "grant_type=password" \
  -d "username=test@example.com" \
  -d "password=testpass" \
  | jq -r '.access_token' \
  | cut -d. -f2 \
  | base64 -d \
  | jq .
```

確認項目:
- [ ] `tumiki.org_id` が含まれる
- [ ] `tumiki.is_org_admin` がboolean型
- [ ] `tumiki.user_db_id` が含まれる

---

## 📚 参考資料

### Keycloak公式ドキュメント

- [Protocol Mappers](https://www.keycloak.org/docs/latest/server_admin/#_protocol-mappers)
- [User Attributes](https://www.keycloak.org/docs/latest/server_admin/#user-attributes)
- [Client Scopes](https://www.keycloak.org/docs/latest/server_admin/#_client_scopes)

### OpenID Connect仕様

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [Standard Claims](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims)

### JWT仕様

- [RFC 7519 - JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
- [JWT.io - Debugger](https://jwt.io/)

---

## 🔄 バージョン履歴

| バージョン | 日付 | 変更内容 |
|----------|------|---------|
| 1.0.0 | 2025-11-05 | 初版作成 |

---

**最終更新**: 2025-11-05
