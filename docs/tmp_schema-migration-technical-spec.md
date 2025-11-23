# スキーマ移行 技術仕様書

> **作成日**: 2025-01-23
> **対象**: Prismaスキーマ v2.0 への移行

## 📋 目次

1. [データモデルの変更](#データモデルの変更)
2. [Prismaクエリパターンの変換](#prismaクエリパターンの変換)
3. [型定義の変更](#型定義の変更)
4. [リレーション構造の変更](#リレーション構造の変更)
5. [OAuth認証フローの変更](#oauth認証フローの変更)

---

## 1. データモデルの変更

### 1.1 テーブルマッピング

| 旧テーブル名            | 新テーブル名          | 変更内容                             |
| ----------------------- | --------------------- | ------------------------------------ |
| `McpServer`             | `McpServerTemplate`   | 名称変更、意味変更（テンプレート化） |
| `UserMcpServerInstance` | `McpServer`           | 名称変更（実体として統一）           |
| `UserMcpServerConfig`   | `McpConfig`           | 名称簡素化                           |
| `Tool`                  | `McpTool`             | 名称統一（Mcpプレフィックス追加）    |
| `UserToolGroup`         | **削除**              | ツールグループ概念の廃止             |
| `UserToolGroupTool`     | **削除**              | 中間テーブル不要（多対多へ）         |
| `OAuthClient`           | `McpOAuthClient`      | 名称統一、スキーマ統合               |
| `OAuthToken`            | `McpOAuthToken`       | 名称統一、スキーマ統合               |
| `OAuthSession`          | **削除**              | セッション管理の簡素化               |
| `McpApiKey`             | `McpApiKey`           | **変更なし** (リレーションのみ変更)  |
| `McpServerRequestLog`   | `McpServerRequestLog` | **変更なし** (フィールド追加)        |
| `McpServerRequestData`  | **削除**              | GCS統合へ移行（将来実装）            |

---

### 1.2 主要フィールドの変更

#### McpServerTemplate (旧 McpServer)

| フィールド       | 旧           | 新                      | 備考                           |
| ---------------- | ------------ | ----------------------- | ------------------------------ |
| `envVars`        | `String[]`   | `envVarKeys` (String[]) | 名称変更、値はMcpConfigで管理  |
| `serverType`     | `ServerType` | **削除**                | テンプレート/実体の区別で不要  |
| `isPublic`       | `Boolean`    | **削除**                | `visibility` フィールドで代替  |
| `useCloudRunIam` | -            | `Boolean`               | **追加** Cloud Run IAM認証対応 |

#### McpServer (旧 UserMcpServerInstance)

| フィールド    | 旧            | 新                   | 備考               |
| ------------- | ------------- | -------------------- | ------------------ |
| `toolGroupId` | `String` (FK) | **削除**             | ツールグループ廃止 |
| (新規)        | -             | `mcpServerTemplates` | 多対多リレーション |
| (新規)        | -             | `allowedTools`       | 多対多リレーション |

#### McpConfig (旧 UserMcpServerConfig)

| フィールド        | 旧            | 新                    | 備考                        |
| ----------------- | ------------- | --------------------- | --------------------------- |
| `name`            | `String`      | **削除**              | サーバー名はMcpServerで管理 |
| `description`     | `String`      | **削除**              | 同上                        |
| `mcpServerId`     | `String` (FK) | `mcpServerTemplateId` | 参照先変更                  |
| `oauthConnection` | `String?`     | **削除**              | OAuth管理の簡素化           |
| (新規)            | -             | `userId`              | ユーザー個別設定対応        |

#### McpApiKey

| フィールド                | 旧            | 新            | 備考         |
| ------------------------- | ------------- | ------------- | ------------ |
| `userMcpServerInstanceId` | `String` (FK) | `mcpServerId` | 参照先名変更 |
| `apiKeyHash`              | `String?`     | `String?`     | **変更なし** |

#### McpServerRequestLog

| フィールド            | 旧            | 新              | 備考            |
| --------------------- | ------------- | --------------- | --------------- |
| `mcpServerInstanceId` | `String` (FK) | `mcpServerId`   | 参照先名変更    |
| `responseStatus`      | `String`      | `httpStatus`    | 名称明確化      |
| `errorMessage`        | `String?`     | **削除**        | 詳細はGCSに保存 |
| `errorCode`           | `String?`     | **削除**        | 同上            |
| `inputBytes`          | `Int?`        | `Int`           | NOT NULL化      |
| `outputBytes`         | `Int?`        | `Int`           | NOT NULL化      |
| (新規)                | -             | `gcsObjectKey`  | GCS統合用       |
| (新規)                | -             | `gcsUploadedAt` | GCS統合用       |

---

## 2. Prismaクエリパターンの変換

### 2.1 MCPサーバー一覧取得

#### 旧クエリ (McpServer)

```typescript
const mcpServers = await db.mcpServer.findMany({
  where: {
    isPublic: true,
    visibility: "PUBLIC",
  },
  include: {
    tools: true,
  },
});
```

#### 新クエリ (McpServerTemplate)

```typescript
const mcpServerTemplates = await db.mcpServerTemplate.findMany({
  where: {
    visibility: "PUBLIC",
    organizationId: null, // グローバルテンプレートのみ
  },
  include: {
    tools: true,
  },
});
```

**変更点**:

- テーブル名: `mcpServer` → `mcpServerTemplate`
- `isPublic` フィールド削除
- `organizationId: null` で組織限定を除外

---

### 2.2 ユーザーのサーバーインスタンス一覧取得

#### 旧クエリ (UserMcpServerInstance)

```typescript
const instances = await db.userMcpServerInstance.findMany({
  where: {
    organizationId: currentOrgId,
    serverType: "OFFICIAL",
    deletedAt: null,
  },
  include: {
    apiKeys: true,
    toolGroup: {
      include: {
        _count: {
          select: { toolGroupTools: true },
        },
        toolGroupTools: {
          take: 1,
          include: {
            userMcpServerConfig: {
              include: {
                mcpServer: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});
```

#### 新クエリ (McpServer)

```typescript
const servers = await db.mcpServer.findMany({
  where: {
    organizationId: currentOrgId,
    serverType: "OFFICIAL",
    deletedAt: null,
  },
  include: {
    apiKeys: true,
    allowedTools: {
      select: {
        id: true,
        name: true,
        description: true,
      },
    },
    mcpServerTemplates: {
      select: {
        id: true,
        name: true,
        description: true,
        tags: true,
        iconPath: true,
      },
    },
  },
});
```

**変更点**:

- テーブル名: `userMcpServerInstance` → `mcpServer`
- ツールグループ構造を完全削除
- `allowedTools` (多対多) で直接ツールにアクセス
- `mcpServerTemplates` (多対多) でテンプレート情報取得

**データ加工の変更**:

```typescript
// 旧
const toolCount = server.toolGroup?._count?.toolGroupTools ?? 0;
const mcpServer =
  server.toolGroup?.toolGroupTools?.[0]?.userMcpServerConfig?.mcpServer;

// 新
const toolCount = server.allowedTools.length;
const templates = server.mcpServerTemplates;
```

---

### 2.3 サーバーインスタンスの作成

#### 旧クエリ (UserMcpServerInstance)

```typescript
// 1. UserMcpServerConfig 作成
const serverConfig = await tx.userMcpServerConfig.create({
  data: {
    organizationId,
    name: instanceName,
    description: "",
    mcpServerId: mcpServer.id,
    envVars: JSON.stringify(envVars),
  },
});

// 2. UserToolGroup 作成
const toolGroup = await tx.userToolGroup.create({
  data: {
    organizationId,
    name: instanceName,
    description: "",
    toolGroupTools: {
      createMany: {
        data: mcpServer.tools.map((tool) => ({
          toolId: tool.id,
          userMcpServerConfigId: serverConfig.id,
        })),
      },
    },
  },
});

// 3. UserMcpServerInstance 作成
const instance = await tx.userMcpServerInstance.create({
  data: {
    organizationId,
    name: instanceName,
    description: instanceDescription,
    serverStatus: isPending ? "PENDING" : "RUNNING",
    serverType: "OFFICIAL",
    toolGroupId: toolGroup.id,
    apiKeys: {
      create: {
        name: `${instanceName} API Key`,
        apiKey: fullKey,
        userId,
      },
    },
  },
});
```

#### 新クエリ (McpServer)

```typescript
// 1. McpConfig 作成
const config = await tx.mcpConfig.create({
  data: {
    organizationId,
    userId: isPending ? userId : null, // ユーザー個別 or 組織共通
    envVars: JSON.stringify(envVars),
    mcpServerTemplateId: mcpServerTemplate.id,
  },
});

// 2. McpServer 作成（多対多リレーション設定）
const server = await tx.mcpServer.create({
  data: {
    organizationId,
    name: instanceName,
    description: instanceDescription ?? "",
    serverStatus: isPending ? "PENDING" : "RUNNING",
    serverType: "OFFICIAL",
    // 多対多リレーション
    mcpServerTemplates: {
      connect: [{ id: mcpServerTemplate.id }],
    },
    allowedTools: {
      connect: mcpServerTemplate.tools.map((tool) => ({ id: tool.id })),
    },
    // APIキー
    apiKeys: isPending
      ? undefined
      : {
          create: {
            name: `${instanceName} API Key`,
            apiKey: fullKey,
            userId,
          },
        },
  },
});
```

**変更点**:

- 3ステップ → 2ステップに簡素化
- ツールグループの作成ステップが削除
- 多対多リレーションで直接接続
- `userId` による個別/共通設定の明確化

---

### 2.4 ツールの有効/無効切り替え

#### 旧クエリ (UserToolGroupTool)

```typescript
if (enabled) {
  // ツールを有効化
  await tx.userToolGroupTool.create({
    data: {
      toolGroupId,
      toolId,
      userMcpServerConfigId,
      sortOrder: 0,
    },
  });
} else {
  // ツールを無効化
  await tx.userToolGroupTool.deleteMany({
    where: {
      toolGroupId,
      toolId,
      userMcpServerConfigId,
    },
  });
}
```

#### 新クエリ (McpServer allowedTools)

```typescript
await tx.mcpServer.update({
  where: { id: serverId },
  data: {
    allowedTools: {
      [enabled ? "connect" : "disconnect"]: { id: toolId },
    },
  },
});
```

**変更点**:

- 中間テーブル操作 → Prismaの多対多操作に変更
- `connect` / `disconnect` で直感的に操作
- ソート順の管理が不要に（UI側で管理）

---

### 2.5 設定の更新

#### 旧クエリ (UserMcpServerConfig)

```typescript
await db.userMcpServerConfig.update({
  where: { id: configId },
  data: {
    envVars: JSON.stringify(envVars),
  },
});
```

#### 新クエリ (McpConfig)

```typescript
await db.mcpConfig.update({
  where: { id: configId },
  data: {
    envVars: JSON.stringify(envVars),
  },
});
```

**変更点**:

- テーブル名のみ変更
- ロジックは同一

---

### 2.6 リクエストログの取得

#### 旧クエリ

```typescript
const logs = await db.mcpServerRequestLog.findMany({
  where: { mcpServerInstanceId: instanceId },
  orderBy: { createdAt: "desc" },
  take: limit,
  skip: offset,
  include: {
    requestData: true, // 1:1リレーション
  },
});
```

#### 新クエリ

```typescript
const logs = await db.mcpServerRequestLog.findMany({
  where: { mcpServerId: serverId },
  orderBy: { createdAt: "desc" },
  take: limit,
  skip: offset,
  select: {
    id: true,
    mcpServerId: true,
    toolName: true,
    transportType: true,
    method: true,
    httpStatus: true, // 名称変更
    durationMs: true,
    inputBytes: true,
    outputBytes: true,
    organizationId: true,
    userAgent: true,
    gcsObjectKey: true, // GCS統合用
    gcsUploadedAt: true,
    createdAt: true,
  },
});
```

**変更点**:

- フィールド名: `mcpServerInstanceId` → `mcpServerId`
- フィールド名: `responseStatus` → `httpStatus`
- `requestData` リレーション削除（GCS統合へ）
- `errorMessage`, `errorCode` 削除（詳細はGCSに保存）

**詳細データ取得**:

```typescript
// 旧: McpServerRequestData テーブルから取得
const detail = await db.mcpServerRequestData.findUnique({
  where: { requestLogId: logId },
});
const inputData = JSON.parse(
  zlib.gunzipSync(detail.inputDataCompressed).toString(),
);

// 新: GCS から取得（将来実装）
const log = await db.mcpServerRequestLog.findUnique({
  where: { id: logId },
  select: { gcsObjectKey: true },
});
if (log.gcsObjectKey) {
  const inputData = await fetchFromGCS(log.gcsObjectKey);
}
```

---

## 3. 型定義の変更

### 3.1 ID型の変更 (apps/manager/src/schema/ids.ts)

#### 削除する型

```typescript
// 削除
export const UserMcpServerConfigIdSchema = z
  .string()
  .brand<"UserMcpServerConfigId">();
export type UserMcpServerConfigId = z.infer<typeof UserMcpServerConfigIdSchema>;

export const UserToolGroupIdSchema = z.string().brand<"UserToolGroupId">();
export type UserToolGroupId = z.infer<typeof UserToolGroupIdSchema>;

export const UserMcpServerInstanceIdSchema = z
  .string()
  .brand<"UserMcpServerInstanceId">();
export type UserMcpServerInstanceId = z.infer<
  typeof UserMcpServerInstanceIdSchema
>;
```

#### 追加する型

```typescript
// 追加
export const McpServerTemplateIdSchema = z
  .string()
  .brand<"McpServerTemplateId">();
export type McpServerTemplateId = z.infer<typeof McpServerTemplateIdSchema>;

export const McpConfigIdSchema = z.string().brand<"McpConfigId">();
export type McpConfigId = z.infer<typeof McpConfigIdSchema>;

export const McpToolIdSchema = z.string().brand<"McpToolId">();
export type McpToolId = z.infer<typeof McpToolIdSchema>;

export const McpOAuthClientIdSchema = z.string().brand<"McpOAuthClientId">();
export type McpOAuthClientId = z.infer<typeof McpOAuthClientIdSchema>;

export const McpOAuthTokenIdSchema = z.string().brand<"McpOAuthTokenId">();
export type McpOAuthTokenId = z.infer<typeof McpOAuthTokenIdSchema>;
```

#### 意味変更する型

```typescript
// McpServerIdSchema の意味変更
// 旧: McpServer (テンプレート) のID
// 新: McpServer (実体) のID

// ToolIdSchema の名称統一
export const ToolIdSchema = z.string().brand<"ToolId">(); // 旧
export const McpToolIdSchema = z.string().brand<"McpToolId">(); // 新
```

---

### 3.2 tRPC Input/Output スキーマの変更

#### FindServersOutput の変更

```typescript
// 旧
export const FindServersOutput = z.array(
  UserMcpServerInstanceSchema.merge(
    z.object({
      id: UserMcpServerInstanceIdSchema,
      apiKeys: McpApiKeySchema.array(),
      tools: z.array(z.object({})),
      toolGroups: z.array(z.never()).optional(),
      mcpServer: McpServerSchema.pick({
        id: true,
        name: true,
        description: true,
      }).nullable(),
    }),
  ),
);

// 新
export const FindServersOutput = z.array(
  McpServerSchema.merge(
    z.object({
      id: McpServerIdSchema,
      apiKeys: McpApiKeySchema.array(),
      allowedTools: z.array(
        McpToolSchema.pick({
          id: true,
          name: true,
          description: true,
        }),
      ),
      mcpServerTemplates: z.array(
        McpServerTemplateSchema.pick({
          id: true,
          name: true,
          description: true,
          tags: true,
          iconPath: true,
        }),
      ),
    }),
  ),
);
```

---

## 4. リレーション構造の変更

### 4.1 旧スキーマのリレーション構造

```
McpServer (テンプレート)
  └─ tools: Tool[]

UserMcpServerConfig
  ├─ mcpServer: McpServer
  └─ toolGroupTools: UserToolGroupTool[]

UserToolGroup
  └─ toolGroupTools: UserToolGroupTool[]

UserToolGroupTool (中間テーブル)
  ├─ userMcpServerConfig: UserMcpServerConfig
  ├─ toolGroup: UserToolGroup
  └─ tool: Tool

UserMcpServerInstance
  ├─ toolGroup: UserToolGroup (1:1)
  └─ apiKeys: McpApiKey[]
```

### 4.2 新スキーマのリレーション構造

```
McpServerTemplate
  ├─ tools: McpTool[] (1:多)
  └─ mcpOAuthClients: McpOAuthClient[] (1:多)

McpConfig
  └─ mcpServerTemplate: McpServerTemplate (多:1)

McpServer
  ├─ mcpServerTemplates: McpServerTemplate[] (多:多)
  ├─ allowedTools: McpTool[] (多:多)
  └─ apiKeys: McpApiKey[] (1:多)

McpOAuthClient
  ├─ mcpServerTemplate: McpServerTemplate (多:1)
  └─ mcpOAuthTokens: McpOAuthToken[] (1:多)

McpOAuthToken
  └─ oauthClient: McpOAuthClient (多:1)
```

**主な変更点**:

1. ツールグループの概念を完全削除
2. 多対多リレーションで直接接続
3. OAuth関連をMCPスキーマに統合

---

### 4.3 暗黙的多対多リレーションの使用

Prismaの暗黙的多対多リレーションを活用：

```prisma
// McpServer (新)
model McpServer {
  id                 String              @id @default(cuid())
  // ...
  mcpServerTemplates McpServerTemplate[] // 暗黙的多対多
  allowedTools       McpTool[]           // 暗黙的多対多
}

// McpServerTemplate (新)
model McpServerTemplate {
  id         String      @id @default(cuid())
  // ...
  tools      McpTool[]   // 1:多
  mcpServers McpServer[] // 暗黙的多対多
}

// McpTool (新)
model McpTool {
  id                    String              @id @default(cuid())
  // ...
  mcpServerTemplate     McpServerTemplate   @relation(fields: [mcpServerTemplateId], references: [id])
  mcpServerTemplateId   String
  mcpServers            McpServer[]         // 暗黙的多対多
}
```

**自動生成される中間テーブル**:

- `_McpServerToMcpServerTemplate`
- `_McpServerToMcpTool`

---

## 5. OAuth認証フローの変更

### 5.1 旧OAuth認証フロー

```
1. ユーザーがOAuth認証を開始
   ↓
2. OAuthSession 作成（セッションID、PKCE情報保存）
   ↓
3. Authorization Serverにリダイレクト
   ↓
4. ユーザーが認可
   ↓
5. Callback エンドポイントで code を受け取る
   ↓
6. OAuthSession をstateで検索・検証
   ↓
7. トークンエンドポイントでトークン取得
   ↓
8. OAuthToken 作成・保存
   ↓
9. OAuthSession を完了状態に更新
   ↓
10. UserMcpServerInstance の serverStatus を RUNNING に更新
```

### 5.2 新OAuth認証フロー

```
1. ユーザーがOAuth認証を開始
   ↓
2. Next.js session / Redis にセッション情報を保存
   (PKCE情報、state、organizationId、userId)
   ↓
3. Authorization Serverにリダイレクト
   ↓
4. ユーザーが認可
   ↓
5. Callback エンドポイントで code を受け取る
   ↓
6. session / Redis からセッション情報を取得・検証
   ↓
7. トークンエンドポイントでトークン取得
   ↓
8. McpOAuthToken 作成・保存
   ↓
9. McpServer の serverStatus を RUNNING に更新
   ↓
10. session / Redis のセッション情報を削除
```

**主な変更点**:

1. `OAuthSession` テーブルの削除
2. セッション管理を Next.js session または Redis に移行
3. `McpOAuthClient` / `McpOAuthToken` への統合

---

### 5.3 OAuth トークン管理の変更

#### 旧スキーマ

```typescript
// OAuthToken
{
  id: string;
  userMcpConfigId: string; // FK to UserMcpServerConfig
  oauthClientId: string; // FK to OAuthClient
  accessToken: string; // 暗号化
  refreshToken: string; // 暗号化
  expiresAt: DateTime;
  // ... その他多数のフィールド
}
```

#### 新スキーマ

```typescript
// McpOAuthToken
{
  id: string;
  oauthClientId: string; // FK to McpOAuthClient
  userId: string; // FK to User
  organizationId: string; // FK to Organization
  accessToken: string; // 暗号化
  refreshToken: string; // 暗号化
  expiresAt: DateTime;
  tokenPurpose: TokenPurpose;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

**変更点**:

- `userMcpConfigId` 削除
- `userId` と `organizationId` で直接管理
- 不要なフィールドの削減（PKCE情報など）
- `tokenPurpose` で用途を明確化

---

## 📝 補足事項

### GCS統合について

`McpServerRequestData` テーブルの削除に伴い、リクエスト詳細データはGoogle Cloud Storageに保存する設計：

```typescript
// 将来の実装イメージ
const gcsObjectKey = `logs/${year}/${month}/${day}/${orgId}/${serverId}/${requestLogId}.json.gz`;

// リクエストログ作成時にGCSへアップロード
await uploadToGCS(gcsObjectKey, {
  inputData: compressedInput,
  outputData: compressedOutput,
});

await db.mcpServerRequestLog.create({
  data: {
    // ... その他フィールド
    gcsObjectKey,
    gcsUploadedAt: new Date(),
  },
});
```

### データ移行スクリプトの必要性

本番環境適用時は、以下のデータ移行が必要：

1. `UserMcpServerInstance` → `McpServer`
2. `UserMcpServerConfig` → `McpConfig`
3. `UserToolGroupTool` → `_McpServerToMcpTool`
4. `OAuthClient` → `McpOAuthClient`
5. `OAuthToken` → `McpOAuthToken`
6. `McpServerRequestData` → GCS

別途、データ移行スクリプトの作成が必要。

---

## ✅ チェックリスト

実装時に確認すべき項目：

- [ ] すべてのテーブル名が更新されている
- [ ] すべてのフィールド名が更新されている
- [ ] ID型の変更がすべて反映されている
- [ ] ツールグループロジックが完全に削除されている
- [ ] 多対多リレーションが正しく使用されている
- [ ] OAuth認証フローが新構造に対応している
- [ ] リクエストログの取得ロジックが更新されている
- [ ] 型チェックが成功している
- [ ] ビルドが成功している

---

**最終更新日**: 2025-01-23
