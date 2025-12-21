# Keycloak Protocol Mapper設定ガイド - デフォルト組織ID

## 概要

このドキュメントでは、Keycloakのユーザー属性`defaultOrganizationId`をJWTトークンの`tumiki`クレームに含めるためのProtocol Mapper設定方法を説明します。

## 前提条件

- Keycloak管理コンソールへのアクセス権限（realm-admin以上）
- tumikiクライアントが既に作成されていること
- Keycloak 22.0以降を使用していること

## Protocol Mapperとは

Protocol Mapperは、Keycloakがユーザー情報をトークン（JWT）に含める際のマッピングルールを定義する機能です。ユーザー属性をカスタムクレームとしてトークンに追加することで、アプリケーション側でKeycloakに再度問い合わせることなく必要な情報を取得できます。

## 設定手順

### 1. Keycloak管理コンソールにログイン

```
http://localhost:8080/admin/master/console/
```

### 2. Realmを選択

左上のドロップダウンから`tumiki` realm（または使用しているrealm）を選択します。

### 3. Clientsページへ移動

左メニューから **Clients** をクリックします。

### 4. tumikiクライアントを開く

クライアント一覧から **tumiki** クライアントをクリックして詳細ページを開きます。

### 5. Client Scopesタブに移動

上部のタブから **Client scopes** を選択します。

### 6. tumiki-dedicatedスコープを開く

**Dedicated scopes** セクションから `tumiki-dedicated` をクリックします。

### 7. Mappersタブに移動

上部のタブから **Mappers** を選択します。

### 8. 新しいMapperを作成

**Add mapper** ボタンをクリックし、**By configuration** を選択します。

### 9. User Attribute Mapperを選択

表示されたMapper typeリストから **User Attribute** を選択します。

### 10. Mapper設定を入力

以下の設定を入力します：

| フィールド | 値 | 説明 |
|----------|---|------|
| **Name** | `default-organization-id` | Mapper識別名（任意） |
| **User Attribute** | `default_organization_id` | Keycloakユーザー属性のキー名 |
| **Token Claim Name** | `tumiki.default_organization_id` | トークンに含めるクレーム名 |
| **Claim JSON Type** | `String` | データ型 |
| **Add to ID token** | ✅ ON | IDトークンに含める |
| **Add to access token** | ✅ ON | アクセストークンに含める |
| **Add to userinfo** | ✅ ON | UserInfoエンドポイントレスポンスに含める |
| **Multivalued** | ❌ OFF | 単一値 |
| **Aggregate attribute values** | ❌ OFF | 集約なし |

### 11. 保存

**Save** ボタンをクリックして設定を保存します。

## 動作確認

### 方法1: トークン内容の確認

1. アプリケーションでログインし、JWTトークンを取得
2. [jwt.io](https://jwt.io) でトークンをデコード
3. `tumiki.default_organization_id` クレームが含まれていることを確認

トークンの例：
```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "tumiki": {
    "organization_id": "org-456",
    "organization_group": "/tumiki/my-org",
    "roles": ["Owner"],
    "default_organization_id": "org-456"
  }
}
```

### 方法2: Next.jsセッションの確認

アプリケーションのサーバーコンポーネントで：

```typescript
import { auth } from "~/auth";

export default async function Page() {
  const session = await auth();
  console.log("Default Org ID:", session?.user?.tumiki?.default_organization_id);
  return <div>Check server logs</div>;
}
```

## トラブルシューティング

### クレームがトークンに含まれない

**原因1: ユーザー属性が設定されていない**

対処法：
```typescript
// Keycloak Adminクライアントで属性を設定
await keycloakClient.updateUserAttributes(userId, {
  default_organization_id: ['org-id-here']
});
```

**原因2: Mapperの設定が不正確**

確認事項：
- User Attributeフィールドが `default_organization_id` と完全一致しているか
- Token Claim Nameが `tumiki.default_organization_id` になっているか
- トークンタイプのチェックボックスがONになっているか

**原因3: セッションが古い**

対処法：
- 再ログインしてトークンを再取得

### 既存ユーザーの属性移行

既存ユーザーの`defaultOrganizationSlug`を`defaultOrganizationId`に移行する必要がある場合：

```typescript
// マイグレーションスクリプト例（未実装）
// 既存のdefaultOrganizationSlugからorganization.idを取得してKeycloak属性に設定
```

## 関連ファイル

- `packages/keycloak/src/provider.ts` - `setUserDefaultOrganization`メソッド実装
- `packages/keycloak/src/clientOperations.ts` - `updateUserAttributes`実装
- `apps/manager/src/lib/auth/session-utils.ts` - `getSessionInfo`でクレーム取得
- `apps/manager/src/server/api/routers/v2/organization/setDefaultOrganization.ts` - デフォルト組織切り替え時にKeycloak属性を更新

## 参考資料

- [Keycloak Protocol Mappers Documentation](https://www.keycloak.org/docs/latest/server_admin/#_protocol-mappers)
- [Keycloak User Attributes](https://www.keycloak.org/docs/latest/server_admin/#user-attributes)
- [Keycloak Token Claims](https://www.keycloak.org/docs/latest/securing_apps/#_token-exchange)
