# IDaaS連携ガイド（SSO/SCIM対応）

本ドキュメントでは、tumikiにおけるIDaaS連携（SSO/SCIM対応）の現状と実装方法について説明します。

## 目次

- [現在の認証アーキテクチャ](#現在の認証アーキテクチャ)
- [実装状況](#実装状況)
- [SSO対応](#sso対応)
- [SCIM対応](#scim対応)
- [実装優先度](#実装優先度)
- [関連ドキュメント](#関連ドキュメント)

## 現在の認証アーキテクチャ

### 使用技術

- **認証基盤**: Keycloak 26.0（OpenID Connect / OAuth 2.0準拠）
- **パッケージ**: `packages/keycloak/`
- **設定管理**: Terraform（`terraform/keycloak/`）

### 認証フロー

```
User → Manager App → Keycloak OIDC → JWT Token
                    ↓
           Organization Group + Realm Roles
```

### クライアント構成

| クライアント | 用途 | タイプ |
|-------------|------|--------|
| `tumiki-manager` | Next.js Manager Application | CONFIDENTIAL、標準フロー |
| `tumiki-proxy` | MCP Proxy Server | CONFIDENTIAL、サービスアカウント |

### JWT Claims設計

Keycloakから発行されるJWTには以下のカスタムクレームが含まれます：

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "tumiki": {
    "org_id": "organization-id",
    "is_org_admin": true,
    "tumiki_user_id": "db-user-id",
    "default_organization_id": "org-id"
  }
}
```

詳細は [keycloak-jwt-claims-design.md](./keycloak-jwt-claims-design.md) を参照してください。

## 実装状況

| 機能 | 状態 | 詳細 |
|------|------|------|
| OAuth 2.0 / OIDC | ✅ 実装済み | Keycloak 26.0、Manager・Proxy対応 |
| JWT Claims | ✅ 実装済み | カスタムクレーム（org_id, is_org_admin等）マッパー設定 |
| Google IdP | ✅ 部分実装 | 環境変数で有効化（Terraform管理） |
| Azure AD / エンタープライズSSO | ❌ 未実装 | SAML・OpenID Connect汎用設定なし |
| SCIM（ユーザー同期） | ❌ 未実装 | Admin APIで手動管理 |
| Dynamic Client Registration | ✅ 実装済み | RFC 7591準拠、mcp-proxy統合 |
| 組織・グループ管理 | ✅ 実装済み | Keycloak Groups + Realm Roles |
| ロールベース権限 | ✅ 実装済み | Owner, Admin, Member, Viewer |
| セッション管理 | ✅ 実装済み | JWT + Redis キャッシュ |
| トークンリフレッシュ | ✅ 実装済み | oauth-token-managerで自動管理 |

### 現在実装されているIdP

- **Google IdP**: オプション設定（環境変数 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`）
  - OIDC接続
  - Email、First Name、Last Name、Email Verified、Picture属性のマッピング

## SSO対応

### SAML対応（Azure AD, Okta等）

エンタープライズ顧客向けにSAML IdPを追加する場合、`terraform/keycloak/identity-providers.tf` に設定を追加します。

#### Azure AD（Microsoft Entra ID）の例

```hcl
resource "keycloak_saml_identity_provider" "azure_ad" {
  realm                      = keycloak_realm.tumiki.id
  alias                      = "azure-ad"
  display_name               = "Microsoft Entra ID"
  enabled                    = true

  # Azure AD SAML設定
  entity_id                  = "https://sts.windows.net/{tenant-id}/"
  single_sign_on_service_url = "https://login.microsoftonline.com/{tenant-id}/saml2"
  single_logout_service_url  = "https://login.microsoftonline.com/{tenant-id}/saml2"

  # 署名設定
  validate_signature         = true
  signing_certificate        = file("${path.module}/certs/azure-ad.pem")

  # 属性マッピング
  name_id_policy_format      = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
  principal_type             = "ATTRIBUTE"
  principal_attribute        = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"

  # ユーザー設定
  trust_email                = true
  first_broker_login_flow_alias = "first broker login"
}

# 属性マッパー
resource "keycloak_custom_identity_provider_mapper" "azure_ad_email" {
  realm                    = keycloak_realm.tumiki.id
  identity_provider_alias  = keycloak_saml_identity_provider.azure_ad.alias
  name                     = "email"
  identity_provider_mapper = "saml-user-attribute-idp-mapper"

  extra_config = {
    syncMode         = "INHERIT"
    "user.attribute" = "email"
    attribute        = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
  }
}
```

#### Oktaの例

```hcl
resource "keycloak_saml_identity_provider" "okta" {
  realm                      = keycloak_realm.tumiki.id
  alias                      = "okta"
  display_name               = "Okta"
  enabled                    = true

  entity_id                  = "http://www.okta.com/{okta-entity-id}"
  single_sign_on_service_url = "https://{okta-domain}/app/{app-id}/sso/saml"

  validate_signature         = true
  signing_certificate        = file("${path.module}/certs/okta.pem")

  name_id_policy_format      = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
  trust_email                = true
}
```

### 汎用OIDC対応

Google以外のOIDCプロバイダーを追加する場合：

```hcl
resource "keycloak_oidc_identity_provider" "generic_oidc" {
  realm             = keycloak_realm.tumiki.id
  alias             = "custom-oidc"
  display_name      = "Custom OIDC Provider"
  enabled           = true

  authorization_url = "https://provider.example.com/oauth2/authorize"
  token_url         = "https://provider.example.com/oauth2/token"
  user_info_url     = "https://provider.example.com/oauth2/userinfo"
  jwks_url          = "https://provider.example.com/.well-known/jwks.json"

  client_id         = var.custom_oidc_client_id
  client_secret     = var.custom_oidc_client_secret

  default_scopes    = "openid email profile"
  trust_email       = true
}
```

### JIT（Just-In-Time）プロビジョニング

SSO初回ログイン時に自動的にユーザーを作成する設定：

```hcl
# First Broker Login フローでJITプロビジョニングを設定
resource "keycloak_authentication_flow" "jit_provisioning" {
  realm_id = keycloak_realm.tumiki.id
  alias    = "JIT Provisioning"
}

resource "keycloak_authentication_execution" "create_user" {
  realm_id          = keycloak_realm.tumiki.id
  parent_flow_alias = keycloak_authentication_flow.jit_provisioning.alias
  authenticator     = "idp-create-user-if-unique"
  requirement       = "ALTERNATIVE"
}
```

## SCIM対応

### 概要

SCIM（System for Cross-domain Identity Management）は、ユーザーとグループの自動同期を行うための標準プロトコルです。現在tumikiではSCIMは未実装ですが、以下の方法で実装可能です。

### 方法A: Keycloak SCIMエクステンション

[scim-for-keycloak](https://github.com/Captain-P-Goldfish/scim-for-keycloak) 拡張を使用：

```bash
# Keycloakにscim2-keycloak拡張をインストール
# 1. JARファイルをダウンロード
# 2. Keycloakのprovidersディレクトリに配置
# 3. Keycloakを再起動
```

この方法では、Keycloakが直接SCIMエンドポイントを提供します。

### 方法B: 独自SCIMエンドポイント実装

`apps/manager/` にSCIM 2.0準拠のエンドポイントを実装：

#### エンドポイント設計

| メソッド | パス | 説明 |
|----------|------|------|
| `GET` | `/scim/v2/Users` | ユーザー一覧取得 |
| `GET` | `/scim/v2/Users/:id` | ユーザー取得 |
| `POST` | `/scim/v2/Users` | ユーザー作成 |
| `PUT` | `/scim/v2/Users/:id` | ユーザー更新 |
| `PATCH` | `/scim/v2/Users/:id` | ユーザー部分更新 |
| `DELETE` | `/scim/v2/Users/:id` | ユーザー削除 |
| `GET` | `/scim/v2/Groups` | グループ一覧取得 |
| `GET` | `/scim/v2/Groups/:id` | グループ取得 |
| `POST` | `/scim/v2/Groups` | グループ作成 |
| `PUT` | `/scim/v2/Groups/:id` | グループ更新 |
| `DELETE` | `/scim/v2/Groups/:id` | グループ削除 |

#### 実装例（Next.js API Route）

```typescript
// apps/manager/src/app/api/scim/v2/Users/route.ts
import { keycloakProvider } from "@tumiki/keycloak";

export const GET = async (request: Request) => {
  // SCIM Bearer Token認証
  const authHeader = request.headers.get("Authorization");
  if (!validateScimToken(authHeader)) {
    return new Response(JSON.stringify({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      status: "401",
      detail: "Unauthorized"
    }), { status: 401 });
  }

  // Keycloak Admin APIからユーザー取得
  const users = await keycloakProvider.listUsers();

  // SCIM形式に変換
  return Response.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: users.length,
    Resources: users.map(toScimUser)
  });
};

export const POST = async (request: Request) => {
  const scimUser = await request.json();

  // Keycloakにユーザー作成
  const user = await keycloakProvider.createUser({
    email: scimUser.emails?.[0]?.value,
    firstName: scimUser.name?.givenName,
    lastName: scimUser.name?.familyName,
    enabled: scimUser.active ?? true
  });

  return Response.json(toScimUser(user), { status: 201 });
};
```

#### SCIMスキーマ例

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "user-uuid",
  "userName": "user@example.com",
  "name": {
    "givenName": "Taro",
    "familyName": "Yamada"
  },
  "emails": [
    {
      "value": "user@example.com",
      "primary": true
    }
  ],
  "active": true,
  "groups": [
    {
      "value": "group-uuid",
      "display": "Engineering"
    }
  ]
}
```

### 認証方式

SCIMエンドポイントの認証には以下を推奨：

1. **Bearer Token**: IdP側で発行したトークンを検証
2. **OAuth 2.0 Client Credentials**: サービス間認証

```typescript
// Bearer Token検証の例
const validateScimToken = (authHeader: string | null): boolean => {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  return token === process.env.SCIM_BEARER_TOKEN;
};
```

## 実装優先度

| 優先度 | 機能 | 理由 | 工数目安 |
|--------|------|------|----------|
| 高 | SAML IdP対応 | エンタープライズ顧客の多くがAzure AD/Okta使用 | 2-3日 |
| 高 | JITプロビジョニング | SSO初回ログイン時の自動ユーザー作成 | 1日 |
| 中 | SCIM対応 | 大規模組織でのユーザー一括管理 | 5-7日 |
| 低 | 汎用OIDC | 特定顧客要望時に対応 | 1-2日 |

## 組織・グループ管理

### データモデル

tumikiでは組織管理にKeycloak Groupsを使用しています：

- **Organization.id** = Keycloak Group ID
- **個人組織**: `isPersonal=true`（maxMembers=1）
- **チーム組織**: `isPersonal=false`

### 権限モデル

| ロール | 説明 |
|--------|------|
| Owner | 組織の所有者、全権限 |
| Admin | 管理者、メンバー管理可能 |
| Member | 一般メンバー |
| Viewer | 閲覧のみ |

詳細は [permission-management.md](./permission-management.md) を参照してください。

## 関連ドキュメント

- [keycloak-jwt-claims-design.md](./keycloak-jwt-claims-design.md) - JWT Claims設計
- [keycloak-dcr-setup.md](./keycloak-dcr-setup.md) - Dynamic Client Registration設定
- [permission-management.md](./permission-management.md) - 権限管理
- [permission-guide.md](./permission-guide.md) - 権限設定ガイド
- [terraform/keycloak/README.md](../../terraform/keycloak/README.md) - Keycloak Terraform設定

## 参考リンク

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [SCIM 2.0 RFC 7644](https://datatracker.ietf.org/doc/html/rfc7644)
- [SAML 2.0 Specification](https://docs.oasis-open.org/security/saml/v2.0/)
- [scim-for-keycloak](https://github.com/Captain-P-Goldfish/scim-for-keycloak)
