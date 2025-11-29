# MCP Proxy 認証ロジック調査レポート

## 概要
JWT から `mcp_instance_id` を削除し、URL パスから取得・検証する方式への変更を検討するための調査。

## 1. 認証ミドルウェアの構造

### 1.1 JWT 型定義 (`TumikiJWTClaims`)
**ファイル**: `apps/mcp-proxy/src/types/index.ts` (L36-41)

```typescript
export type TumikiJWTClaims = {
  org_id: string; // 組織ID
  is_org_admin: boolean; // 組織管理者フラグ
  tumiki_user_id: string; // TumikiユーザーID
  mcp_instance_id?: string; // ★★★ 現在はオプション（MCP接続時は必須）★★★
};
```

**現在の仕様**:
- `mcp_instance_id` はオプション（`?`）だが、MCP接続時は必須
- 理由: 管理画面用JWTは `mcp_instance_id` が不要、MCP用は必須

### 1.2 JWT 検証関数 (`authenticateWithJWT`)
**ファイル**: `apps/mcp-proxy/src/middleware/auth/index.ts` (L72-167)

**主な処理**:

1. **Keycloak OAuth判定** (L96-102):
   ```typescript
   const isOAuthToken =
     jwtPayload.tumiki?.org_id &&
     jwtPayload.tumiki?.mcp_instance_id &&
     !jwtPayload.tumiki?.tumiki_user_id;
   ```
   - `mcp_instance_id` がある + `tumiki_user_id` がない → OAuth Token

2. **通常JWT用の必須チェック** (L111-118):
   ```typescript
   if (!jwtPayload.tumiki?.mcp_instance_id) {
     return c.json(
       createUnauthorizedError(
         "mcp_instance_id is required for MCP server access..."
       ),
       401,
     );
   }
   ```
   - ★ ここが主要な必須チェック ★

3. **権限チェック** (L120-151):
   ```typescript
   const hasPermission = await checkPermission(
     jwtPayload.tumiki.tumiki_user_id,
     jwtPayload.tumiki.org_id,
     "MCP_SERVER_INSTANCE",
     "READ",
     jwtPayload.tumiki.mcp_instance_id, // ← ここで使用
   );
   ```

### 1.3 ルート定義
**ファイル**: `apps/mcp-proxy/src/routes/mcp.ts` (L8-12)

```typescript
mcpRoute.post(
  "/mcp/:userMcpServerInstanceId", // ★ URL パスから取得可能 ★
  integratedAuthMiddleware,
  mcpHandler,
);
```

## 2. URL パスからの instance_id 取得

### 2.1 MCP ハンドラー
**ファイル**: `apps/mcp-proxy/src/handlers/mcp/index.ts` (L72-114)

```typescript
export const mcpHandler = async (c: Context<HonoEnv>) => {
  const userMcpServerInstanceId = c.req.param("userMcpServerInstanceId"); // ★ ここで取得可能 ★
  
  const jwtPayload = c.get("jwtPayload");
  const apiKeyAuthInfo = c.get("apiKeyAuthInfo");
  const organizationId = 
    jwtPayload?.tumiki.org_id ?? apiKeyAuthInfo?.organizationId ?? "";
  
  try {
    const server = createMcpServer(userMcpServerInstanceId);
    // ...
  }
};
```

**重要**: URL パスから既に `userMcpServerInstanceId` を取得している

### 2.2 Instance Resolver での検証
**ファイル**: `apps/mcp-proxy/src/services/instanceResolver.ts` (L15-99)

```typescript
export async function resolveUserMcpServerInstance(
  jwtPayload: JWTPayload,
): Promise<UserMcpServerInstance> {
  const { org_id, mcp_instance_id, tumiki_user_id } = jwtPayload.tumiki;

  // mcp_instance_id が必須（★ JWT から取得）★
  if (!mcp_instance_id) {
    throw new Error("mcp_instance_id is required for MCP server access...");
  }

  // データベース取得
  const instance = await db.userMcpServerInstance.findUnique({
    where: { id: mcp_instance_id },
  });

  // 検証項目:
  // 1. インスタンスの存在確認
  // 2. 論理削除チェック
  // 3. 組織の整合性チェック (instance.organizationId !== org_id)

  return instance;
}
```

**現在の流れ**:
1. JWT から `mcp_instance_id` を取得
2. URL パスの `:userMcpServerInstanceId` とは別

## 3. インスタンスの権限検証

### 3.1 Permission Service
**ファイル**: `apps/mcp-proxy/src/services/permissionService.ts` (L26-73)

```typescript
export const checkPermission = async (
  userId: string,
  orgId: string,
  resourceType: ResourceType, // "MCP_SERVER_INSTANCE"
  action: PermissionAction,   // "READ"
  resourceId?: string,        // mcp_instance_id
): Promise<boolean>
```

**検証内容**:
- キャッシュ確認（Redis）
- DB権限チェック
- キャッシュ保存

### 3.2 OAuth 認証での権限チェック
**ファイル**: `apps/mcp-proxy/src/middleware/auth/keycloakOAuth.ts` (L193-224)

```typescript
// OAuth Client自体が組織に紐づいているため、組織として権限チェック
const hasPermission = await checkPermission(
  organizationId, // OAuth Clientの組織ID（userId として使用）
  organizationId,
  "MCP_SERVER_INSTANCE",
  "READ",
  instanceId, // JWT から取得した mcp_instance_id
);
```

## 4. 変更の影響範囲

### 4.1 JWT から削除が必要な箇所

**変更対象**:

1. **型定義** (`TumikiJWTClaims`):
   - `mcp_instance_id` フィールド削除（オプションではなく）

2. **JWT 検証** (`authenticateWithJWT`):
   - L111-118 の必須チェック削除
   - OAuth 判定ロジック修正 (L96-102)：`mcp_instance_id` に依存しなくなる

3. **Instance Resolver** (`resolveUserMcpServerInstance`):
   - ★ 関数シグネチャ変更: JWT ペイロードではなく、URL パスから instance_id を受け取る
   - 例: `resolveUserMcpServerInstance(jwtPayload, urlInstanceId)`

4. **API Key 認証** (`apiKeyAuthMiddleware`):
   - 開発モードダミーデータ更新 (L12-14)

5. **OAuth ミドルウェア** (`keycloakOAuthMiddleware`):
   - L174-183 の必須チェック修正
   - カスタムクレーム検証から `mcp_instance_id` チェック削除

### 4.2 URL パス取得が必要な箇所

**新たに追加**:

1. **認証ミドルウェア**:
   - URL パスから instance_id を抽出
   - JWT の instance_id との一致検証（セキュリティ）

2. **Instance Resolver**:
   - URL パスの instance_id を利用した検証

3. **Permission チェック**:
   - URL パスの instance_id を使用

## 5. 使用箇所サマリー

### `mcp_instance_id` が使用される箇所

| ファイル | 行番号 | 用途 | 影響 |
|---------|--------|------|------|
| types/index.ts | 41 | 型定義 | 削除 |
| middleware/auth/index.ts | 96-102 | OAuth判定 | 修正 |
| middleware/auth/index.ts | 111-118 | 必須チェック | 削除 |
| middleware/auth/index.ts | 128, 135, 156 | ロギング | 更新 |
| middleware/auth/keycloakOAuth.ts | 174-183 | 必須チェック | 修正 |
| middleware/auth/keycloakOAuth.ts | 190 | 変数取得 | 削除 |
| middleware/auth/apiKey.ts | 12-14 | 開発モードダミー | 更新 |
| services/instanceResolver.ts | 19-89 | 全体 | 大幅修正 |
| handlers/mcp/index.ts | 73 | URL パスから既に取得済み | 利用 |
| routes/mcp.ts | 9 | ルート定義 | 変更なし |

## 6. セキュリティ考慮事項

### 6.1 現在の構成の問題
- JWT に `mcp_instance_id` が含まれているため、JWT生成時に特定のインスタンスに限定される
- URL パスとJWT内の instance_id が一致しない可能性がある（検証なし）

### 6.2 提案される構成のメリット
- JWT はより一般的（特定インスタンスに限定されない）
- URL パスが source of truth
- 権限検証時に URL パスの instance_id を使用

### 6.3 必要な検証
- **URL パスとの一致確認**: URL からの instance_id が有効か
- **組織確認**: JWT の org_id とインスタンスの organizationId が一致するか
- **権限確認**: ユーザーがそのインスタンスへアクセス可能か

## 7. 関連テストファイル

- `apps/mcp-proxy/src/middleware/__tests__/auth.test.ts` - L162-196: mcp_instance_id チェック
- `apps/mcp-proxy/src/middleware/__tests__/keycloakAuth.test.ts` - L75, 133: mcp_instance_id 使用
- `apps/mcp-proxy/src/services/instanceResolver.test.ts` - L88-163: instance_id検証テスト

## 実装段階での推奨アプローチ

1. **Phase 1**: 型定義と型チェック修正
2. **Phase 2**: JWT 検証ロジック修正（必須チェック削除）
3. **Phase 3**: Instance Resolver 修正（URL パス取得）
4. **Phase 4**: OAuth ミドルウェア修正
5. **Phase 5**: テスト更新
6. **Phase 6**: 統合テスト実行
