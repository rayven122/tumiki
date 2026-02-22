# @tumiki/keycloak

Tumikiプロジェクト専用のKeycloak統合パッケージ。組織管理、ロール管理、カスタムJWTクレームを提供します。

## 📋 目次

- [概要](#概要)
- [アーキテクチャ](#アーキテクチャ)
- [Keycloak統合設計](#keycloak統合設計)
- [JWTカスタムクレーム](#jwtカスタムクレーム)
- [デフォルト組織管理](#デフォルト組織管理)
- [Protocol Mapper設定](#protocol-mapper設定)
- [使用方法](#使用方法)
- [トラブルシューティング](#トラブルシューティング)

## 概要

このパッケージは、TumikiプラットフォームにおけるKeycloak認証・認可の統合を提供します。

### 主な機能

- **組織管理**: Keycloakグループベースのマルチテナント組織管理
- **ロール管理**: 階層的な組織ロール（Owner, Admin, Member, Viewer）
- **カスタムJWTクレーム**: 組織情報、ロール、デフォルト組織をJWTに自動付与
- **セッション管理**: ロール変更時の即座なセッション無効化
- **デフォルト組織**: ユーザー属性ベースのデフォルト組織管理

## アーキテクチャ

### パッケージ構成

```
packages/keycloak/
├── src/
│   ├── client.ts              # Keycloak Admin APIクライアント
│   ├── clientOperations.ts    # グループ・ロール・ユーザー操作
│   ├── provider.ts            # IOrganizationProvider実装
│   ├── providerServices.ts    # 組織管理サービス層
│   ├── types.ts               # 型定義
│   └── index.ts               # エクスポート
├── README.md                  # このファイル
└── package.json
```

### レイヤー構成

```
┌─────────────────────────────────────┐
│  Applications (manager, mcp-proxy)  │
├─────────────────────────────────────┤
│  KeycloakOrganizationProvider       │  ← IOrganizationProvider
├─────────────────────────────────────┤
│  Provider Services                  │  ← 組織管理ロジック
├─────────────────────────────────────┤
│  KeycloakAdminClient                │  ← Admin API Client
├─────────────────────────────────────┤
│  @keycloak/keycloak-admin-client    │  ← 公式ライブラリ
└─────────────────────────────────────┘
```

## Keycloak統合設計

### 組織表現モデル

Tumikiでは、組織をKeycloakの**グループ**として表現します。

#### グループ構造

```
/tumiki
  ├── /my-org                    # 組織グループ（externalId: keycloak-group-id）
  │   ├── Owner (Group Role)     # 組織ロール
  │   ├── Admin (Group Role)
  │   ├── Member (Group Role)
  │   └── Viewer (Group Role)
  └── /another-org
      ├── Owner
      ├── Admin
      ├── Member
      └── Viewer
```

### データベースとの対応

```typescript
// PostgreSQL (Prisma)
Organization {
  id: string                    // 内部ID (cuid2)
  externalId: string            // Keycloakグループid
  name: string                  // 組織名
  slug: string                  // URLスラッグ
}

// Keycloak Group
Group {
  id: string                    // = Organization.externalId
  name: string                  // = "/tumiki/{slug}"
  path: string                  // グループのパス
  subGroups: []                 // サブグループなし
}
```

### ロール管理設計

#### Realm Roles（グローバル）

```
- Owner      # 組織オーナー - 全権限
- Admin      # 組織管理者 - メンバー管理可能
- Member     # 組織メンバー - 基本利用
- Viewer     # 組織閲覧者 - 読み取り専用
```

#### Group Roles（組織ごと）

各組織グループは、上記4つのロールを**Group Role**として持ちます。

```typescript
// ユーザーに組織ロールを付与
await provider.addMember({
  externalId: "keycloak-group-id",
  userId: "user-sub",
  role: "Owner",
});
```

ユーザーが組織に追加されると：

1. グループにメンバー追加
2. Group RoleをユーザーにマッピングRealm Roleにマッピング（JWTに含める）

## JWTカスタムクレーム

Tumikiでは、以下のカスタムクレームをJWTトークンに含めます。

### クレーム一覧

| クレーム名                       | データ型 | 説明                       | Keycloakユーザー属性         |
| -------------------------------- | -------- | -------------------------- | ---------------------------- |
| `tumiki.organization_id`         | String   | 現在選択中の組織ID         | `tumiki_organization_id`     |
| `tumiki.organization_group`      | String   | 組織のKeycloakグループパス | `tumiki_organization_group`  |
| `tumiki.roles`                   | String[] | ユーザーのRealm Roles      | - (Realm Rolesから自動)      |
| `tumiki.default_organization_id` | String   | デフォルト組織ID           | `default_organization_id`    |
| `tumiki.is_keycloak_managed`     | Boolean  | Keycloak管理フラグ         | `tumiki_is_keycloak_managed` |
| `tumiki.group_roles`             | String[] | グループメンバーシップ     | - (Group Membershipから自動) |

### JWTトークン例

```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "email_verified": true,
  "name": "山田 太郎",
  "given_name": "太郎",
  "family_name": "山田",
  "tumiki": {
    "organization_id": "org-456",
    "organization_group": "/tumiki/my-org",
    "roles": ["Owner", "Member"],
    "default_organization_id": "org-456",
    "is_keycloak_managed": true,
    "group_roles": ["/tumiki/my-org", "/tumiki/another-org"]
  }
}
```

## デフォルト組織管理

### 設計思想

ユーザーのデフォルト組織は、**Keycloakユーザー属性**で管理します。

#### 従来の方式（廃止）

```typescript
// ❌ 旧方式: データベースのUser.defaultOrganizationSlugで管理
User {
  defaultOrganizationSlug: string | null  // deprecated
}
```

#### 新方式（Keycloak完全統合）

```typescript
// ✅ 新方式: Keycloakユーザー属性で管理
KeycloakUser {
  attributes: {
    default_organization_id: ["org-456"]  // 配列形式
  }
}

// JWTトークンに自動付与
JWT {
  tumiki: {
    default_organization_id: "org-456"
  }
}
```

### デフォルト組織の設定

```typescript
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";

const provider = new KeycloakOrganizationProvider(config);

// デフォルト組織を設定
await provider.setUserDefaultOrganization({
  userId: "user-sub",
  organizationId: "org-789",
});
```

実行内容：

1. Keycloakユーザー属性 `default_organization_id` を更新
2. 次回ログイン時、JWTに `tumiki.default_organization_id: "org-789"` が含まれる

### セッションからの取得

```typescript
import { auth } from "~/auth";
import { getSessionInfo } from "~/lib/auth/session-utils";

export default async function Page() {
  const session = await auth();
  const { organizationId } = getSessionInfo(session);

  console.log("デフォルト組織ID:", organizationId);
  // => "org-789"
}
```

### 利用シーン

1. **ログイン直後の組織選択**
   - デフォルト組織が設定されている → その組織のダッシュボードへリダイレクト
   - 設定されていない → 組織選択画面を表示

2. **組織切り替え**
   - ユーザーが別の組織に切り替え
   - `setUserDefaultOrganization` でKeycloak属性を更新
   - セッション無効化により次回ログインで新しいデフォルト組織を使用

3. **組織一覧表示**
   - 現在のデフォルト組織を強調表示
   - `getUserOrganizations` に `currentOrganizationId` を渡す

## Protocol Mapper設定

Protocol Mapperは、Keycloakユーザー属性をJWTクレームにマッピングする機能です。

### 自動設定（推奨）

Docker環境では、起動時に自動的にProtocol Mapperが設定されます。

#### 設定ファイル

1. **Realm設定**: `docker/keycloak/tumiki-realm.json`
   - 初回起動時にインポート
   - tumiki-manager、tumiki-proxyクライアントにProtocol Mapper定義済み

2. **セットアップスクリプト**: `docker/keycloak/setup-keycloak.sh`
   - 実行中のKeycloakにProtocol Mapperを追加
   - 既存環境の更新に使用

#### 起動方法

```bash
# Keycloakコンテナ起動（Protocol Mapper自動設定）
pnpm docker:up
```

### 手動設定

既存のKeycloak環境に手動で設定する場合は、以下の手順に従います。

#### 1. Keycloak管理コンソールにログイン

```
http://localhost:8080/admin/master/console/
```

#### 2. Protocol Mapperを追加

**対象Client**: `tumiki-manager`

| 設定項目                | 値                               |
| ----------------------- | -------------------------------- |
| **Name**                | `Tumiki Default Organization ID` |
| **Mapper Type**         | `User Attribute`                 |
| **User Attribute**      | `default_organization_id`        |
| **Token Claim Name**    | `tumiki.default_organization_id` |
| **Claim JSON Type**     | `String`                         |
| **Add to ID token**     | ✅ ON                            |
| **Add to access token** | ✅ ON                            |
| **Add to userinfo**     | ✅ ON                            |

同様の設定を `tumiki-proxy` クライアントにも追加してください。

### Protocol Mapper一覧

現在設定されているProtocol Mapper：

| Mapper名                       | User Attribute               | Token Claim                      | 用途                   |
| ------------------------------ | ---------------------------- | -------------------------------- | ---------------------- |
| Tumiki Organization ID         | `tumiki_organization_id`     | `tumiki.organization_id`         | 現在の組織ID           |
| Tumiki Organization Group      | `tumiki_organization_group`  | `tumiki.organization_group`      | 組織グループパス       |
| Tumiki Organization Roles      | -                            | `tumiki.roles`                   | Realm Roles            |
| Tumiki Default Organization ID | `default_organization_id`    | `tumiki.default_organization_id` | デフォルト組織ID       |
| Tumiki Keycloak Managed Flag   | `tumiki_is_keycloak_managed` | `tumiki.is_keycloak_managed`     | Keycloak管理フラグ     |
| Tumiki Group Roles             | -                            | `tumiki.group_roles`             | グループメンバーシップ |

### 動作確認

#### トークン内容の確認

1. アプリケーションでログイン
2. JWTトークンを取得（ブラウザの開発者ツール）
3. [jwt.io](https://jwt.io) でデコード
4. `tumiki.default_organization_id` クレームが含まれることを確認

#### セッション確認

```typescript
import { auth } from "~/auth";

export default async function Page() {
  const session = await auth();
  console.log("Token Claims:", session?.user?.tumiki);
  // {
  //   organization_id: "org-456",
  //   organization_group: "/tumiki/my-org",
  //   roles: ["Owner"],
  //   default_organization_id: "org-456"
  // }
}
```

## 使用方法

### インストール

```bash
pnpm add @tumiki/keycloak
```

### 初期化

```typescript
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";

const provider = new KeycloakOrganizationProvider({
  baseUrl: process.env.KEYCLOAK_URL!,
  realm: process.env.KEYCLOAK_REALM!,
  adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME!,
  adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD!,
});
```

### 組織管理

#### デフォルトロール初期化（アプリ起動時に一度だけ呼び出す）

デフォルトロール（Owner, Admin, Member, Viewer）は全組織で共通のRealm Rolesとして
アプリケーション初期化時に作成されている必要があります。

```typescript
const provider = KeycloakOrganizationProvider.fromEnv();

// アプリ起動時に一度だけ呼び出す
const result = await provider.ensureDefaultRealmRolesExist();
if (!result.success) {
  console.error("デフォルトロール作成失敗:", result.error);
}
```

#### 組織作成

```typescript
const result = await provider.createOrganization({
  name: "My Organization",
  groupName: "my-org",
  ownerId: "user-sub",
});

if (result.success) {
  console.log("Keycloak Group ID:", result.externalId);
}
```

#### メンバー追加

```typescript
await provider.addMember({
  externalId: "keycloak-group-id",
  userId: "user-sub",
  role: "Admin", // Owner | Admin | Member | Viewer
});
```

#### ロール変更

```typescript
await provider.updateMemberRole({
  externalId: "keycloak-group-id",
  userId: "user-sub",
  newRole: "Member",
});

// セッション無効化（変更を即座に反映）
await provider.invalidateUserSessions({
  userId: "user-sub",
});
```

#### デフォルト組織設定

```typescript
await provider.setUserDefaultOrganization({
  userId: "user-sub",
  organizationId: "org-789",
});
```

### 型定義

```typescript
import type {
  IOrganizationProvider,
  KeycloakAdminConfig,
  KeycloakGroup,
  KeycloakRole,
  KeycloakUser,
  OrganizationRole,
} from "@tumiki/keycloak";
```

## トラブルシューティング

### クレームがトークンに含まれない

#### 原因1: ユーザー属性が設定されていない

Protocol Mapperは、Keycloakユーザー属性を読み取ります。属性が未設定の場合、クレームは含まれません。

**確認方法:**

```typescript
// Keycloak Admin API経由で確認
const user = await keycloak.users.findOne({
  id: "user-sub",
  realm: "tumiki",
});

console.log(user.attributes?.default_organization_id);
// => ["org-456"] (配列形式)
```

**修正方法:**

```typescript
await provider.setUserDefaultOrganization({
  userId: "user-sub",
  organizationId: "org-456",
});
```

#### 原因2: Protocol Mapperの設定ミス

**確認事項:**

- User Attribute: `default_organization_id` (完全一致)
- Token Claim Name: `tumiki.default_organization_id`
- Add to ID token: ON
- Add to access token: ON
- Add to userinfo: ON

#### 原因3: セッションが古い

Protocol Mapper設定変更やユーザー属性更新後は、再ログインが必要です。

**修正方法:**

1. アプリケーションからログアウト
2. 再ログインしてトークンを再取得

### セッション無効化が機能しない

Keycloakのセッション無効化は、Admin APIで実行する必要があります。

```typescript
// ロール変更後、セッションを無効化
await provider.invalidateUserSessions({
  userId: "user-sub",
});
```

これにより、次回アクセス時に新しいトークン（新しいロール）が発行されます。

### デフォルト組織が反映されない

#### 確認手順

1. **Keycloakユーザー属性を確認**

   ```bash
   # Keycloak管理コンソール
   # Users > {user} > Attributes
   # default_organization_id: org-456
   ```

2. **Protocol Mapperを確認**

   ```bash
   # Clients > tumiki-manager > Client Scopes > tumiki-claims
   # Mappers > Tumiki Default Organization ID
   ```

3. **JWTトークンを確認**

   ```bash
   # [jwt.io](https://jwt.io) でデコード
   # tumiki.default_organization_id が含まれているか
   ```

4. **セッションを更新**
   - ログアウト → 再ログイン

### Docker環境でのProtocol Mapper設定失敗

#### 症状

`setup-keycloak.sh` 実行時にエラーが発生する。

#### 原因

- Keycloakコンテナが起動していない
- 環境変数が不足している

#### 修正方法

```bash
# 1. Keycloakコンテナが起動しているか確認
pnpm docker:ps

# 2. Keycloakコンテナを再起動
pnpm docker:down
pnpm docker:up

# 3. セットアップスクリプトを手動実行
docker exec tumiki-keycloak bash /opt/keycloak/setup-keycloak.sh
```

### その他のエラー

#### Keycloak Admin API接続エラー

```
Error: getaddrinfo ENOTFOUND keycloak
```

**原因**: Keycloak URLが間違っている

**修正**: `.env` ファイルで `KEYCLOAK_URL` を確認

```env
KEYCLOAK_URL=http://localhost:8080
```

#### グループが見つからない

```
Error: Group not found
```

**原因**: `externalId` が正しくない、またはグループが削除されている

**修正**: データベースの `Organization.externalId` を確認

## 関連ドキュメント

- [Keycloak公式ドキュメント](https://www.keycloak.org/docs/latest/)
- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/index.html)
- [Protocol Mappers](https://www.keycloak.org/docs/latest/server_admin/#_protocol-mappers)
- [Tumiki認証設計](../../docs/auth/keycloak-jwt-claims-design.md)
- [権限管理ガイド](../../docs/auth/permission-guide.md)

## ライセンス

MIT
