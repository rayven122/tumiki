# Tumiki 権限管理ガイド

> **最終更新**: 2025-12-21
> **DB設計バージョン**: Unix型権限システム (read/write/execute)

## 📋 目次

1. [概要](#概要)
2. [アーキテクチャ設計](#アーキテクチャ設計)
3. [データベーススキーマ](#データベーススキーマ)
4. [Keycloakロール命名規則](#keycloakロール命名規則)
5. [Unix型権限の使い方](#unix型権限の使い方)
6. [権限チェックフロー](#権限チェックフロー)
7. [実装パターン](#実装パターン)
8. [運用ガイド](#運用ガイド)
9. [トラブルシューティング](#トラブルシューティング)

---

## 概要

Tumikiの権限管理システムは、Keycloakとデータベースを組み合わせた**ハイブリッド型アーキテクチャ**と、Unix型のシンプルな**read/write/execute権限モデル**を採用しています。

### 設計思想

- **Keycloak**: 認証とメンバーシップ管理
- **データベース**: 全ての認可（権限管理）
- **Unix型権限**: read（読み取り）、write（書き込み）、execute（実行）の3つの権限フラグ
- **シンプルさ**: 複雑な6アクション型（CREATE/READ/UPDATE/DELETE/MANAGE/EXECUTE）から3フラグ型へ簡素化

### 主要な特徴

- ✅ **1:1ロールマッピング**: Keycloakロールとデータベースロールは1対1対応
- ✅ **データ保護**: OrganizationとOrganizationMemberのデータは完全に保持
- ✅ **シンプルな権限**: Unixファイルシステムと同じ馴染みのある権限モデル
- ✅ **柔軟性**: リソース全体または特定リソースに対する権限設定が可能

---

## アーキテクチャ設計

### Keycloakの責務

- ✅ ユーザー認証（Authentication）
- ✅ 組織メンバーシップの管理
- ✅ グループ管理（組織・部署）
- ✅ JWTへのロール情報の埋め込み

### データベースの責務

- ✅ **全ての認可（Authorization）**
- ✅ アプリケーションロールの定義
- ✅ Unix型権限（read/write/execute）の管理
- ✅ リソース固有の権限設定

### データベースで管理しないもの

- ❌ ユーザーの認証情報
- ❌ 組織グループ（Keycloakで管理）
- ❌ メンバーシップの詳細な属性

---

## データベーススキーマ

### OrganizationRole（アプリケーションロール定義）

```prisma
/// アプリケーションロール定義（権限セット）
model OrganizationRole {
  /// 組織ID
  organizationId String
  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  /// URL識別子（例: data-engineer）
  slug           String

  /// ロール名（表示用）
  name           String

  /// ロールの説明
  description    String?

  /// デフォルトロールか（新メンバーに自動付与）
  isDefault      Boolean          @default(false)

  /// このロールが持つ詳細な権限
  permissions    RolePermission[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@id([organizationId, slug])
  @@unique([organizationId, name])
}
```

**重要ポイント**:
- 複合主キー `[organizationId, slug]` を使用
- `slug` はURLセーフな識別子で不変
- Keycloakロール名は動的生成: `org:{orgSlug}:role:{roleSlug}`
- `keycloakRoles` フィールドは削除（1:1マッピングのため不要）

### ResourceType（リソースタイプ）

```prisma
/// リソースタイプ
enum ResourceType {
  /// MCPサーバー設定
  MCP_SERVER_CONFIG
  /// MCPサーバー
  MCP_SERVER
  /// MCPサーバーテンプレート
  MCP_SERVER_TEMPLATE
}
```

**シンプル化のポイント**:
- MCP関連リソースのみに限定
- GROUP、MEMBER、ROLE、TOOL_GROUP、MCP_TOOLは削除
- 必要に応じて将来拡張可能

### RolePermission（Unix型権限）

```prisma
/// ロールに付与された権限（Unix型権限）
model RolePermission {
  id             String           @id @default(cuid())

  /// 組織ID
  organizationId String

  /// ロールslug
  roleSlug       String
  role           OrganizationRole @relation(fields: [organizationId, roleSlug], references: [organizationId, slug], onDelete: Cascade)

  /// リソースタイプ
  resourceType   ResourceType

  /// リソースID（空文字列の場合は全リソースに適用）
  resourceId     String           @default("")

  /// 読み取り権限（閲覧）
  read    Boolean @default(false)

  /// 書き込み権限（作成・更新・削除）
  write   Boolean @default(false)

  /// 実行権限（MCPツール実行）
  execute Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, roleSlug, resourceType, resourceId])
}
```

**Unix型権限の詳細**:
- `read`: リソースの閲覧権限
- `write`: リソースの作成・更新・削除権限
- `execute`: MCPツールの実行権限
- `resourceId = ""`: 全リソースに適用
- `resourceId = "specific_id"`: 特定リソースのみに適用

### OrganizationMember（メンバーメタデータ）

```prisma
model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, userId])
}
```

**シンプル化のポイント**:
- `isAdmin` フィールドは削除（ロールベースに移行）
- メンバーシップのメタデータのみ保持
- 実際のロール情報はKeycloakで管理

### OrganizationInvitation（招待管理）

```prisma
model OrganizationInvitation {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  /// 招待先メールアドレス
  email          String

  /// 招待トークン
  token          String       @unique @default(cuid())

  /// 招待者のユーザーID
  invitedBy     String
  invitedByUser User     @relation(fields: [invitedBy], references: [id], onDelete: Cascade)

  /// 招待時に付与するロール（Keycloak管理）
  roles         String[] @default(["Member"])

  /// 招待の有効期限
  expires   DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, email])
  @@index([token])
}
```

**変更点**:
- `groupIds`, `isAdmin`, `roleIds` フィールドは削除
- `roles` フィールドを追加（Keycloakロール名の配列）

---

## Keycloakロール命名規則

### 基本ロール（システム定義）

```
org:{orgSlug}:owner              # 組織オーナー（全権限）
org:{orgSlug}:admin              # 組織管理者
org:{orgSlug}:member             # 組織メンバー（デフォルト）
```

### カスタムロール（組織が定義）

```
org:{orgSlug}:role:{roleSlug}
```

**例**:
```
org:my-company:role:data-engineer        # データエンジニア
org:my-company:role:ml-engineer          # MLエンジニア
org:my-company:role:analyst              # アナリスト
org:my-company:role:developer            # 開発者
```

### 命名規則の詳細

- `orgSlug`: 組織のslug（不変、URL識別子）
- `roleSlug`: ロールのslug（組織内でユニーク、不変）
- 形式: 小文字英数字とハイフンのみ（`[a-z0-9-]+`）
- 長さ: 1-50文字
- 予約語: `owner`, `admin`, `member`（基本ロールとの衝突を避ける）

### JWTに含まれるロール例

```json
{
  "sub": "user123",
  "email": "user@example.com",
  "tumiki": {
    "org_id": "org_abc123",
    "org_slug": "my-company",
    "org_slugs": ["my-company", "another-org"],
    "roles": [
      "Owner",
      "Member"
    ],
    "group_roles": ["my-company"]
  }
}
```

**重要**:
- Keycloakの `tumiki.roles` にはRealm Role名が含まれます
- グループメンバーシップは `tumiki.group_roles` に含まれます
- データベースのロールマッピングは `org:{orgSlug}:role:{roleSlug}` から導出されます

---

## Unix型権限の使い方

### 権限フラグの組み合わせ

| read | write | execute | 用途 |
|------|-------|---------|------|
| ✅   | ❌    | ❌      | 閲覧専用（Viewer） |
| ✅   | ❌    | ✅      | 実行のみ（Data Engineer） |
| ✅   | ✅    | ❌      | 編集のみ（Editor） |
| ✅   | ✅    | ✅      | 完全な制御（Developer） |

### 典型的なロール設定例

#### Viewerロール（閲覧のみ）

```typescript
await db.rolePermission.create({
  data: {
    organizationId: "org_abc123",
    roleSlug: "viewer",
    resourceType: "MCP_SERVER",
    resourceId: "",  // 全MCPサーバー
    read: true,
    write: false,
    execute: false,
  }
});
```

#### Data Engineerロール（閲覧 + 実行）

```typescript
await db.rolePermission.createMany({
  data: [
    {
      organizationId: "org_abc123",
      roleSlug: "data-engineer",
      resourceType: "MCP_SERVER",
      resourceId: "",
      read: true,
      write: false,
      execute: true,
    },
    {
      organizationId: "org_abc123",
      roleSlug: "data-engineer",
      resourceType: "MCP_SERVER_TEMPLATE",
      resourceId: "",
      read: true,
      write: false,
      execute: false,
    }
  ]
});
```

#### Developerロール（全権限）

```typescript
await db.rolePermission.create({
  data: {
    organizationId: "org_abc123",
    roleSlug: "developer",
    resourceType: "MCP_SERVER",
    resourceId: "",
    read: true,
    write: true,
    execute: true,
  }
});
```

### 特定リソースへの権限付与

```typescript
// 特定のMCPサーバーのみに実行権限を付与
await db.rolePermission.create({
  data: {
    organizationId: "org_abc123",
    roleSlug: "analyst",
    resourceType: "MCP_SERVER",
    resourceId: "mcp_server_notion",  // 特定のNotionサーバーのみ
    read: true,
    write: false,
    execute: true,
  }
});
```

---

## 権限チェックフロー

### 基本的な権限チェックロジック

```typescript
async function checkPermission(
  userId: string,
  organizationId: string,
  resourceType: ResourceType,
  resourceId: string,
  requiredPermissions: {
    read?: boolean;
    write?: boolean;
    execute?: boolean;
  }
): Promise<boolean> {
  // 1. ユーザーのKeycloakロールを取得（JWTから）
  const userKeycloakRoles = session.user.tumiki.roles;

  // 2. Keycloakロールから対応するアプリケーションロールを検索
  const keycloakRoleName = `org:${orgSlug}:role:${roleSlug}`;
  const matchingRoles = await db.organizationRole.findMany({
    where: {
      organizationId,
      slug: {
        in: userKeycloakRoles.map(extractRoleSlug)
      }
    },
    include: {
      permissions: {
        where: {
          resourceType,
          OR: [
            { resourceId: "" },        // 全リソース
            { resourceId: resourceId } // 特定リソース
          ]
        }
      }
    }
  });

  // 3. 権限フラグをチェック
  for (const role of matchingRoles) {
    for (const permission of role.permissions) {
      const hasRead = !requiredPermissions.read || permission.read;
      const hasWrite = !requiredPermissions.write || permission.write;
      const hasExecute = !requiredPermissions.execute || permission.execute;

      if (hasRead && hasWrite && hasExecute) {
        return true;
      }
    }
  }

  return false;
}
```

### 優先順位

1. **特定リソースの権限** → 高優先度
2. **全リソースの権限** → 低優先度

**例**:
- 全MCPサーバーに `read: true, execute: false`
- 特定のNotionサーバーに `read: true, execute: true`
- 結果: Notionサーバーのみ実行可能、他は閲覧のみ

---

## 実装パターン

### ロール作成

```typescript
// apps/manager/src/server/api/routers/v2/organizationRole/create.ts

export const createOrganizationRole = async ({
  organizationId,
  name,
  slug,
  description,
}: {
  organizationId: string;
  name: string;
  slug?: string;
  description?: string;
}) => {
  // 1. organizationを取得
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true }
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // 2. slugを生成または検証
  const roleSlug = slug || slugify(name);

  // 3. Keycloakロール名を生成
  const keycloakRoleName = `org:${organization.slug}:role:${roleSlug}`;

  // 4. Keycloakにロールを作成
  await keycloak.createRole({
    name: keycloakRoleName,
    description,
  });

  // 5. DBにアプリケーションロールを作成
  const role = await db.organizationRole.create({
    data: {
      organizationId,
      slug: roleSlug,
      name,
      description,
    }
  });

  return role;
};
```

### 権限追加

```typescript
// apps/manager/src/server/api/routers/v2/organizationRole/addPermission.ts

export const addPermission = async ({
  organizationId,
  roleSlug,
  resourceType,
  resourceId = "",
  read = false,
  write = false,
  execute = false,
}: {
  organizationId: string;
  roleSlug: string;
  resourceType: ResourceType;
  resourceId?: string;
  read?: boolean;
  write?: boolean;
  execute?: boolean;
}) => {
  return await db.rolePermission.upsert({
    where: {
      organizationId_roleSlug_resourceType_resourceId: {
        organizationId,
        roleSlug,
        resourceType,
        resourceId,
      }
    },
    update: {
      read,
      write,
      execute,
    },
    create: {
      organizationId,
      roleSlug,
      resourceType,
      resourceId,
      read,
      write,
      execute,
    }
  });
};
```

### ユーザーにロールを付与

```typescript
// Keycloakにロールを付与するだけ（DBでの操作は不要）
import { keycloak } from "@tumiki/keycloak";

await keycloak.assignRoleToUser(
  userId,
  "org:my-company:role:data-engineer"
);

// 次回ログイン時にJWTに自動的に含まれる
// 権限チェック時に自動的にマッチング
```

### tRPCミドルウェアでの権限チェック

```typescript
// apps/manager/src/lib/permissions/middleware.ts

export const requirePermission = (
  resourceType: ResourceType,
  requiredPermissions: {
    read?: boolean;
    write?: boolean;
    execute?: boolean;
  },
  getResourceId?: (input: unknown) => string
) => {
  return t.middleware(async ({ ctx, next, rawInput }) => {
    const userId = ctx.session.user.id;
    const organizationId = ctx.session.user.tumiki?.org_id;
    const resourceId = getResourceId?.(rawInput) ?? rawInput.id ?? "";

    const allowed = await checkPermission(
      userId,
      organizationId,
      resourceType,
      resourceId,
      requiredPermissions
    );

    if (!allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Permission denied"
      });
    }

    return next({ ctx });
  });
};

// 使用例
export const mcpServerRouter = createTRPCRouter({
  // 閲覧権限が必要
  get: protectedProcedure
    .use(requirePermission("MCP_SERVER", { read: true }))
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db.mcpServer.findUnique({
        where: { id: input.id }
      });
    }),

  // 書き込み権限が必要
  update: protectedProcedure
    .use(requirePermission("MCP_SERVER", { write: true }))
    .input(z.object({ id: z.string(), name: z.string() }))
    .mutation(async ({ input }) => {
      return await db.mcpServer.update({
        where: { id: input.id },
        data: { name: input.name }
      });
    }),

  // 実行権限が必要
  execute: protectedProcedure
    .use(requirePermission("MCP_SERVER", { execute: true }))
    .input(z.object({ id: z.string(), toolName: z.string() }))
    .mutation(async ({ input }) => {
      // MCPツール実行
    }),
});
```

### フロントエンドでの権限チェック

```typescript
// apps/manager/src/hooks/usePermission.ts

export const usePermission = (
  resourceType: ResourceType,
  resourceId: string | undefined,
  requiredPermissions: {
    read?: boolean;
    write?: boolean;
    execute?: boolean;
  }
) => {
  const { data: session } = useSession();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session || !resourceId) {
      setHasPermission(false);
      setIsLoading(false);
      return;
    }

    checkPermission(
      session.user.id,
      session.user.tumiki.org_id,
      resourceType,
      resourceId,
      requiredPermissions
    ).then(allowed => {
      setHasPermission(allowed);
      setIsLoading(false);
    });
  }, [session, resourceType, resourceId, requiredPermissions]);

  return { hasPermission, isLoading };
};

// コンポーネントでの使用例
const McpServerCard = ({ server }) => {
  const { hasPermission: canRead } = usePermission(
    "MCP_SERVER",
    server.id,
    { read: true }
  );
  const { hasPermission: canEdit } = usePermission(
    "MCP_SERVER",
    server.id,
    { write: true }
  );
  const { hasPermission: canExecute } = usePermission(
    "MCP_SERVER",
    server.id,
    { execute: true }
  );

  if (!canRead) {
    return null; // 閲覧権限がない場合は非表示
  }

  return (
    <Card>
      <h3>{server.name}</h3>
      {canEdit && <Button onClick={openEditDialog}>編集</Button>}
      {canExecute && <Button onClick={executeTool}>実行</Button>}
    </Card>
  );
};
```

---

## 運用ガイド

### 新しいロールの作成

**ステップ1: ロールを作成**

```typescript
const role = await createOrganizationRole({
  organizationId: "org_abc123",
  name: "Data Engineer",
  slug: "data-engineer", // オプション: 自動生成可能
  description: "データエンジニア向けの権限セット"
});
```

**ステップ2: 権限を追加**

```typescript
// MCPサーバーの閲覧と実行権限
await addPermission({
  organizationId: "org_abc123",
  roleSlug: "data-engineer",
  resourceType: "MCP_SERVER",
  resourceId: "",  // 全MCPサーバー
  read: true,
  write: false,
  execute: true,
});

// MCPサーバーテンプレートの閲覧権限
await addPermission({
  organizationId: "org_abc123",
  roleSlug: "data-engineer",
  resourceType: "MCP_SERVER_TEMPLATE",
  resourceId: "",
  read: true,
  write: false,
  execute: false,
});
```

**ステップ3: ユーザーにロールを付与**

```typescript
// Keycloakにロールを付与するだけ
await keycloak.assignRoleToUser(
  userId,
  "org:my-company:role:data-engineer"
);
```

### 人事異動（部署変更）

```typescript
// Keycloakでロールを変更するだけ（DBでの操作は不要）
await keycloak.removeRoleFromUser(userId, "org:my-company:role:data-team");
await keycloak.assignRoleToUser(userId, "org:my-company:role:ml-team");

// 次回ログイン時に自動的に新しい権限が適用される
```

### ロールの権限を変更

```typescript
// 既存の権限を更新
await db.rolePermission.update({
  where: {
    organizationId_roleSlug_resourceType_resourceId: {
      organizationId: "org_abc123",
      roleSlug: "data-engineer",
      resourceType: "MCP_SERVER",
      resourceId: "",
    }
  },
  data: {
    write: true,  // 書き込み権限を追加
  }
});

// 注意: 既存ユーザーの権限は即座に更新される
// キャッシュを使用している場合は無効化が必要
```

### 特定のMCPサーバーへの個別権限付与

```typescript
// Notionサーバーのみ実行可能にする
await addPermission({
  organizationId: "org_abc123",
  roleSlug: "analyst",
  resourceType: "MCP_SERVER",
  resourceId: "mcp_server_notion",  // 特定のサーバー
  read: true,
  write: false,
  execute: true,
});
```

### ロールの削除

```typescript
// ステップ1: DBからロールを削除（権限も自動削除）
await db.organizationRole.delete({
  where: {
    organizationId_slug: {
      organizationId: "org_abc123",
      slug: "data-engineer",
    }
  }
});

// ステップ2: Keycloakからロールを削除
await keycloak.deleteRole("org:my-company:role:data-engineer");
```

---

## トラブルシューティング

### 権限が反映されない

**症状**: ロールを付与したのに権限がない

**原因1: セッションが古い**

```typescript
// 解決策: セッションを強制リフレッシュ
import { useSession } from "next-auth/react";

const { data: session, update } = useSession();
await update(); // セッションを再取得
```

**原因2: Keycloakロールが正しく付与されていない**

```bash
# Keycloak管理画面でユーザーのロールを確認
https://keycloak.example.com/admin/master/console/#/tumiki/users/{userId}/role-mappings

# またはcurlで確認
curl -X GET "https://keycloak.example.com/admin/realms/tumiki/users/{userId}/role-mappings"
```

**原因3: ロールslugが間違っている**

```sql
-- DBでOrganizationRoleのslugを確認
SELECT
  "organizationId",
  slug,
  name
FROM "OrganizationRole"
WHERE "organizationId" = 'org_abc123';
```

**原因4: 権限が設定されていない**

```sql
-- ロールの権限を確認
SELECT
  r.name,
  r.slug,
  p."resourceType",
  p."resourceId",
  p.read,
  p.write,
  p.execute
FROM "OrganizationRole" r
LEFT JOIN "RolePermission" p ON p."roleSlug" = r.slug AND p."organizationId" = r."organizationId"
WHERE r."organizationId" = 'org_abc123'
  AND r.slug = 'data-engineer';
```

### ロール作成時にエラーが発生

**エラー: Unique constraint failed on the fields: `organizationId_slug`**

```typescript
// 原因: 同じslugのロールが既に存在
// 解決策1: 別のslugを指定
await createOrganizationRole({
  name: "Data Engineer",
  slug: "data-engineer-v2"
});

// 解決策2: 既存のロールを削除してから作成
await db.organizationRole.delete({
  where: {
    organizationId_slug: {
      organizationId: "org_abc123",
      slug: "data-engineer",
    }
  }
});
```

**エラー: Keycloak role creation failed**

```typescript
// 原因: Keycloakとの通信エラー
// 解決策: Keycloak環境変数を確認
console.log({
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ? '***' : undefined,
  issuer: process.env.KEYCLOAK_ISSUER,
});

// Keycloakサーバーが起動しているか確認
curl https://keycloak.example.com/realms/tumiki
```

### マイグレーションエラー

**エラー: Migration failed to apply**

```bash
# 原因: 既存データとの不整合
# 解決策1: ドライランで確認
pnpm db:migrate --create-only

# 解決策2: マイグレーション履歴を確認
docker exec -i db psql -U root -d tumiki -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

# 解決策3: 失敗したマイグレーションを削除
docker exec -i db psql -U root -d tumiki -c "DELETE FROM _prisma_migrations WHERE migration_name = '20251221135407_unix_permissions';"

# 解決策4: デプロイモードで適用
pnpm db:deploy
```

### JWTにロールが含まれない

**症状**: `tumiki.roles` が空またはnull

**原因: Protocol Mapperが設定されていない**

```bash
# Keycloak Admin Console で確認
# Clients → tumiki-manager → Client scopes → Mappers

# 必要なMapper:
# - Tumiki Organization Roles (tumiki.roles)
# - Tumiki Group Roles (tumiki.group_roles)
```

**解決策: Protocol Mapperを設定**

```bash
# Keycloakコンテナで実行
docker exec -it tumiki-keycloak bash
cd /opt/keycloak/init-scripts
./setup-tumiki.sh
```

### 権限チェックが遅い

**症状**: 権限チェックに時間がかかる

**原因: DBクエリが毎回実行されている**

**解決策: Redisキャッシュを導入**

```typescript
import { redis } from "~/lib/redis";

async function checkPermissionWithCache(
  userId: string,
  organizationId: string,
  resourceType: ResourceType,
  resourceId: string,
  requiredPermissions: { read?: boolean; write?: boolean; execute?: boolean }
): Promise<boolean> {
  const cacheKey = `perm:${userId}:${organizationId}:${resourceType}:${resourceId}:${JSON.stringify(requiredPermissions)}`;

  // キャッシュから取得を試みる
  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return JSON.parse(cached);
  }

  // DBで権限チェック
  const result = await checkPermission(
    userId,
    organizationId,
    resourceType,
    resourceId,
    requiredPermissions
  );

  // 結果をキャッシュ（5分間）
  await redis.setex(cacheKey, 300, JSON.stringify(result));

  return result;
}

// キャッシュ無効化
export async function invalidatePermissionCache(
  userId?: string,
  organizationId?: string,
  resourceType?: ResourceType,
  resourceId?: string
) {
  const pattern = [
    "perm",
    userId || "*",
    organizationId || "*",
    resourceType || "*",
    resourceId || "*",
    "*"
  ].join(":");

  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

---

## ベストプラクティス

### ✅ DO（推奨）

1. **ロールは職務・部署単位で作成**
   - 例: `data-engineer`, `ml-team`, `engineering-dept`
   - 理由: 人事異動時にロール変更だけで対応可能

2. **slugは不変に保つ**
   - ロール作成後はslugを変更しない
   - URLやKeycloakロール名が壊れるのを防ぐ

3. **read権限は常に最初に付与**
   - `write` や `execute` には `read` が暗黙的に必要
   - 明示的に `read: true` を設定する

4. **全リソース権限から始める**
   - まずは `resourceId: ""` で全リソースに権限を付与
   - 必要に応じて特定リソースに制限を追加

5. **定期的な権限監査**
   - 使われていないロールや権限を定期的にクリーンアップ
   - 最小権限の原則を守る

### ❌ DON'T（非推奨）

1. **ユーザーごとに個別ロールを作成しない**
   - ロールの数が爆発的に増える
   - 管理が困難になる

2. **Keycloakロールを直接変更しない**
   - 必ずアプリケーションのAPIを通して変更
   - データベースとの整合性を保つ

3. **権限チェックをスキップしない**
   - UIで隠すだけでなく、バックエンドでも必ずチェック
   - セキュリティの原則: 信頼せず、必ず検証

4. **複雑な権限設定を避ける**
   - 特定リソースへの個別権限は最小限に
   - シンプルな権限構造を保つ

5. **slug変更は避ける**
   - slugを変更すると既存のKeycloakロールとの紐付けが壊れる
   - どうしても必要な場合は新しいロールを作成して移行

---

## パフォーマンス最適化

### 権限チェック結果のキャッシュ

```typescript
// Redisでキャッシュ（5分間）
const cacheKey = `perm:${userId}:${orgId}:${resourceType}:${resourceId}:${JSON.stringify(requiredPermissions)}`;

// キャッシュから取得を試みる
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

// DBで権限チェック
const result = await checkPermission(...);

// 結果をキャッシュ
await redis.setex(cacheKey, 300, JSON.stringify(result));

return result;
```

### キャッシュ無効化

```typescript
// ロールの権限を変更したとき
await redis.del(`perm:*:${orgId}:*`);

// ユーザーのロールを変更したとき
await redis.del(`perm:${userId}:*`);

// リソース固有の権限を変更したとき
await redis.del(`perm:*:${orgId}:${resourceType}:${resourceId}:*`);
```

### データベースインデックスの活用

```sql
-- 既存のインデックス（自動生成）
CREATE UNIQUE INDEX "RolePermission_organizationId_roleSlug_resourceType_resourc_key"
ON "RolePermission"("organizationId", "roleSlug", "resourceType", "resourceId");

-- 権限チェッククエリ用の複合インデックス
CREATE INDEX "RolePermission_organizationId_resourceType_resourceId_idx"
ON "RolePermission"("organizationId", "resourceType", "resourceId");
```

---

## セキュリティ考慮事項

### JWTの有効期限

```typescript
// Keycloak設定（推奨値）
{
  "accessTokenLifespan": 900,        // 15分
  "ssoSessionIdleTimeout": 1800,     // 30分
  "ssoSessionMaxLifespan": 36000,    // 10時間
}
```

### 最小権限の原則

- 必要最小限の権限のみを付与
- デフォルトは全て拒否
- 明示的に許可された操作のみ実行可能

### 監査ログ

```typescript
// 権限変更の監査ログ
await db.auditLog.create({
  data: {
    userId,
    action: "PERMISSION_CHANGE",
    resourceType: "ROLE_PERMISSION",
    resourceId: permission.id,
    details: {
      roleSlug,
      oldPermissions: { read: false, write: false, execute: false },
      newPermissions: { read: true, write: false, execute: true },
    }
  }
});
```

---

## 関連ドキュメント

- [データベーススキーマ仕様](../db/prisma/README.md)
- [Keycloak統合ガイド](../integrations/keycloak-integration.md)
- [MCPセキュリティガイド](../security/MCP_SECURITY_GUIDE.md)

---

## バージョン履歴

| バージョン | 日付 | 変更内容 |
|----------|------|---------|
| 2.0.0 | 2025-12-21 | Unix型権限システムへの移行、4つのドキュメントを統合 |
| 1.0.0 | 2025-11-06 | 初版作成 |

---

**最終更新**: 2025-12-21
**作成者**: Tumikiチーム
