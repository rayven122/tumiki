# Manager アプリケーション スキーマ移行タスク

> **作成日**: 2025-01-23
> **対象**: apps/manager/ の最新Prismaスキーマへの対応
> **関連PR**: #459 (スキーマリファクタリング)

## 📋 概要

PR #459 で実施されたデータベーススキーマの大規模リファクタリングに対応し、Manager アプリケーションのすべてのクエリ、型定義、UIコンポーネントを更新する。

### 主要な変更点

1. **テーブル名の統一的な命名規則への変更**
   - `McpServer` → `McpServerTemplate` (テンプレート)
   - `UserMcpServerInstance` → `McpServer` (実体)
   - `UserMcpServerConfig` → `McpConfig` (設定)
   - `Tool` → `McpTool`

2. **OAuth/APIキー管理の統合**
   - `oauth.prisma` 削除 → `McpOAuthClient`, `McpOAuthToken` に統合
   - `apiKey.prisma` 削除 → `McpApiKey` に統合
   - `OAuthSession` テーブルの削除

3. **リレーション構造の簡素化**
   - `UserToolGroup`, `UserToolGroupTool` テーブルの完全削除
   - 暗黙的多対多リレーションの活用 (`_McpServerToMcpTool`)

## 🎯 タスク分類

### Phase 1: 基盤レイヤーの更新

#### 1.1 ID型定義の更新 (`apps/manager/src/schema/ids.ts`)

**優先度**: 🔴 Critical
**推定工数**: 1-2時間

- [ ] 新しいID型の追加

  ```typescript
  // 追加
  export const McpServerTemplateIdSchema = z
    .string()
    .brand<"McpServerTemplateId">();
  export const McpConfigIdSchema = z.string().brand<"McpConfigId">();
  export const McpToolIdSchema = z.string().brand<"McpToolId">();
  export const McpOAuthClientIdSchema = z.string().brand<"McpOAuthClientId">();
  export const McpOAuthTokenIdSchema = z.string().brand<"McpOAuthTokenId">();
  ```

- [ ] 既存ID型の意味変更

  ```typescript
  // McpServerIdSchema の意味が変更
  // 旧: McpServer (テンプレート) のID
  // 新: McpServer (実体) のID (旧 UserMcpServerInstanceId)
  ```

- [ ] 削除するID型

  ```typescript
  // 削除
  - UserMcpServerConfigIdSchema → McpConfigIdSchema
  - UserToolGroupIdSchema (ツールグループ削除)
  - UserMcpServerInstanceIdSchema → McpServerIdSchema
  ```

- [ ] 全ファイルでのID型インポートの更新

**影響範囲**: 全tRPCルーター、全フロントエンドコンポーネント

---

### Phase 2: tRPC ルーターの更新

#### 2.1 mcpServerRouter → mcpServerTemplateRouter

**優先度**: 🔴 Critical
**推定工数**: 2-3時間
**ファイル**: `apps/manager/src/server/api/routers/mcpServer/`

- [ ] ルーター名の変更
  - `mcpServerRouter` → `mcpServerTemplateRouter`
  - ディレクトリ名: `mcpServer/` → `mcpServerTemplate/`

- [ ] `findAllWithTools.ts` の更新

  ```typescript
  // 旧
  const mcpServers = await db.mcpServer.findMany({
    where: {
      isPublic: true, // ← 削除されたフィールド
      visibility: "PUBLIC",
    },
    include: { tools: true },
  });

  // 新
  const mcpServerTemplates = await db.mcpServerTemplate.findMany({
    where: {
      visibility: "PUBLIC",
      organizationId: null, // グローバル共通テンプレートのみ
    },
    include: { tools: true },
  });
  ```

- [ ] `create.ts` の更新
  - テーブル名: `mcpServer` → `mcpServerTemplate`
  - フィールド: `envVars` → `envVarKeys`
  - フィールド: `serverType` 削除
  - フィールド: `useCloudRunIam` 追加

- [ ] Input/Output スキーマの更新
  ```typescript
  export const CreateMcpServerTemplateInput = z.object({
    name: nameValidationSchema,
    iconPath: z.string().optional(),
    transportType: z.nativeEnum(TransportType),
    command: z.string().optional(),
    args: z.array(z.string()).default([]),
    url: z.string().optional(),
    envVarKeys: z.array(z.string()).default([]), // envVars から変更
    authType: z.nativeEnum(AuthType).default("NONE"),
    oauthProvider: z.string().optional(),
    oauthScopes: z.array(z.string()).default([]),
    useCloudRunIam: z.boolean().default(false), // 追加
    visibility: z.nativeEnum(McpServerVisibility).default("PRIVATE"),
    organizationId: z.string().optional(),
  });
  ```

**影響するフロントエンド**:

- `apps/manager/src/app/(auth)/mcp/(mcpTabs)/@tabs/servers/add/ServerList.tsx`
- `apps/manager/src/app/(auth)/mcp/(mcpTabs)/@tabs/servers/AvailableServersList.tsx`

---

#### 2.2 userMcpServerInstanceRouter → mcpServerRouter

**優先度**: 🔴 Critical
**推定工数**: 8-12時間
**ファイル**: `apps/manager/src/server/api/routers/userMcpServerInstance/`

- [ ] ルーター名とディレクトリ名の変更
  - `userMcpServerInstanceRouter` → `mcpServerRouter`
  - `userMcpServerInstance/` → `mcpServer/`

- [ ] `findOfficialServers.ts` の完全書き換え

  ```typescript
  // 旧構造
  userMcpServerInstance {
    toolGroup {
      toolGroupTools {
        userMcpServerConfig {
          mcpServer { ... }
        }
      }
    }
  }

  // 新構造
  mcpServer {
    mcpServerTemplates { ... },
    allowedTools { ... }
  }
  ```

- [ ] `findCustomServers.ts` の更新
  - 同様にツールグループ構造の削除

- [ ] `addOfficialServer.ts` の完全書き換え
  - `createUserServerComponents` 関数呼び出しの削除
  - 新しいロジック:
    1. McpConfig 作成（envVars保存）
    2. McpServer 作成（allowedTools 多対多設定）
    3. McpApiKey 作成（必要に応じて）

- [ ] `addCustomServer.ts` の更新
  - ツールグループロジックの削除

- [ ] `findById.ts` の更新
  - include 句の完全書き換え

- [ ] `updateServerInstance.ts` の更新
  - ツールグループ更新ロジックの削除

- [ ] `toggleTool.ts` の完全書き換え

  ```typescript
  // 旧: UserToolGroupTool の更新
  // 新: mcpServer.allowedTools の多対多関係更新
  await tx.mcpServer.update({
    where: { id: instanceId },
    data: {
      allowedTools: {
        [enabled ? "connect" : "disconnect"]: { id: toolId },
      },
    },
  });
  ```

- [ ] リクエストログ関連の更新
  - `findRequestLogs.ts`: テーブル名変更
  - `getRequestStats.ts`: フィールド名変更 (`responseStatus` → `httpStatus`)
  - `getRequestDataDetail.ts`: `McpServerRequestData` テーブルの削除対応

- [ ] Input/Output スキーマの更新
  ```typescript
  // すべてのスキーマで UserMcpServerInstanceIdSchema → McpServerIdSchema
  export const FindServersOutput = z.array(
    McpServerSchema.merge(
      z.object({
        id: McpServerIdSchema, // 変更
        apiKeys: McpApiKeySchema.array(),
        allowedTools: McpToolSchema.array(), // 変更
        mcpServerTemplates: z.array(...), // 変更
      }),
    ),
  );
  ```

**影響するフロントエンド** (16ファイル):

- ServerCardList.tsx (2件)
- ServerDetailPage/\* (5件)
- UserMcpServerCard/\* (4件)
- その他 (5件)

---

#### 2.3 userMcpServerConfigRouter → mcpConfigRouter

**優先度**: 🟡 High
**推定工数**: 3-4時間
**ファイル**: `apps/manager/src/server/api/routers/userMcpServerConfig/`

- [ ] ルーター名とディレクトリ名の変更
  - `userMcpServerConfigRouter` → `mcpConfigRouter`
  - `userMcpServerConfig/` → `mcpConfig/`

- [ ] `findServersWithTools.ts` の更新

  ```typescript
  // 旧
  const configs = await db.userMcpServerConfig.findMany({
    include: {
      tools: true,
      mcpServer: true,
    },
  });

  // 新
  const configs = await db.mcpConfig.findMany({
    where: {
      organizationId: ctx.currentOrganizationId,
      // userId: null で組織共通、userId 指定でユーザー個別
    },
    include: {
      mcpServerTemplate: true,
    },
  });
  ```

- [ ] `updateServerConfig.ts` の更新
  - テーブル名: `userMcpServerConfig` → `mcpConfig`
  - リレーション: `mcpServer` → `mcpServerTemplate`

- [ ] Input/Output スキーマの更新

  ```typescript
  export const UpdateServerConfigInput = z.object({
    id: McpConfigIdSchema, // 変更
    envVars: z.record(z.string(), z.string()),
  });

  export const FindAllWithToolsOutput = z.array(
    McpConfigSchema.omit({ envVars: true }).merge(
      z.object({
        id: McpConfigIdSchema, // 変更
        mcpServerTemplate: McpServerTemplateSchema.merge(...), // 変更
      }),
    ),
  );
  ```

**影響するフロントエンド**:

- `UserMcpServerConfigModal.tsx`

---

#### 2.4 mcpApiKeyRouter の更新

**優先度**: 🟡 High
**推定工数**: 2-3時間
**ファイル**: `apps/manager/src/server/api/routers/mcpApiKey/`

- [ ] `createApiKey.ts` の更新

  ```typescript
  // フィールド名変更
  userMcpServerInstanceId → mcpServerId
  ```

- [ ] `listApiKeys.ts` の更新

  ```typescript
  // リレーション変更
  include: {
    userMcpServerInstance → mcpServer
  }
  ```

- [ ] `validateApiKey.ts` の更新
  - 同様のリレーション変更

- [ ] `updateApiKey.ts`, `deleteApiKey.ts` の確認
  - テーブル名は同じだが、リレーションの確認が必要

**影響するフロントエンド**:

- `ApiKeysTab.tsx`
- `DeleteApiKeyDialog.tsx`

---

#### 2.5 remoteMcpServerRouter の更新

**優先度**: 🟡 High
**推定工数**: 4-5時間
**ファイル**: `apps/manager/src/server/api/routers/remoteMcpServer/`

- [ ] `create.ts` の更新
  - `createUserServerComponents` の削除
  - 新しいMcpServer作成ロジックへの書き換え

- [ ] `initiateOAuth.ts` の更新
  - `userMcpConfigId` → `mcpConfigId`
  - `OAuthSession` テーブルの削除対応

- [ ] `updateCredentials.ts` の更新
  - `userMcpConfigId` → `mcpConfigId`

- [ ] `testConnection.ts` の更新
  - 同上

- [ ] Input スキーマの更新

  ```typescript
  export const InitiateOAuthInput = z.object({
    mcpServerTemplateId: z.string(), // mcpServerId から変更
    mcpConfigId: z.string(), // userMcpConfigId から変更
    scopes: z.array(z.string()).optional(),
  });

  export const UpdateCredentialsInput = z.object({
    mcpConfigId: z.string(), // 変更
    credentials: z.object({ ... }),
  });
  ```

**影響するフロントエンド**:

- `CustomMcpServerModal.tsx`

---

### Phase 3: 共通ユーティリティの更新

#### 3.1 createUserServerComponents の削除と代替実装

**優先度**: 🔴 Critical
**推定工数**: 4-6時間
**ファイル**: `apps/manager/src/server/api/routers/_shared/`

- [ ] `createUserServerComponents.ts` の完全削除または書き換え

- [ ] 新しいヘルパー関数の作成

  ```typescript
  /**
   * MCPサーバーインスタンスを作成（新スキーマ版）
   */
  export const createMcpServer = async (input: {
    tx: TransactionClient;
    mcpServerTemplateIds: string[];
    allowedToolIds: string[];
    envVars: Record<string, string>;
    instanceName: string;
    instanceDescription?: string;
    organizationId: string;
    userId: string;
    isPending?: boolean;
  }): Promise<{
    config: { id: string };
    instance: { id: string };
  }> => {
    // 1. McpConfig 作成
    const config = await tx.mcpConfig.create({
      data: {
        organizationId: input.organizationId,
        userId: input.isPending ? input.userId : null,
        envVars: JSON.stringify(input.envVars),
        mcpServerTemplateId: input.mcpServerTemplateIds[0], // 主要テンプレート
      },
    });

    // 2. McpServer 作成（多対多リレーション設定）
    const instance = await tx.mcpServer.create({
      data: {
        organizationId: input.organizationId,
        name: input.instanceName,
        description: input.instanceDescription ?? "",
        serverStatus: input.isPending ? "PENDING" : "RUNNING",
        serverType: "OFFICIAL",
        mcpServerTemplates: {
          connect: input.mcpServerTemplateIds.map((id) => ({ id })),
        },
        allowedTools: {
          connect: input.allowedToolIds.map((id) => ({ id })),
        },
      },
    });

    // 3. McpApiKey 作成（必要に応じて）
    if (!input.isPending) {
      const fullKey = generateApiKey();
      await tx.mcpApiKey.create({
        data: {
          name: `${input.instanceName} API Key`,
          apiKey: fullKey,
          userId: input.userId,
          mcpServerId: instance.id,
        },
      });
    }

    return { config, instance };
  };
  ```

**影響範囲**:

- `addOfficialServer.ts`
- `remoteMcpServer/create.ts`

---

### Phase 4: OAuth API エンドポイントの更新

#### 4.1 OAuth Callback の更新

**優先度**: 🟡 High
**推定工数**: 3-4時間
**ファイル**: `apps/manager/src/app/api/oauth/callback/route.ts`

- [ ] OAuthSession テーブルの削除に対応
  - セッション管理を別の方法で実装（例: Redis, Next.js session）
  - または、簡易的にメモリ内で管理

- [ ] リレーションの更新

  ```typescript
  // 旧
  mcpServer.oauthClient;

  // 新
  mcpServerTemplate.mcpOAuthClients;
  ```

- [ ] ツールグループ作成ロジックの削除
  ```typescript
  // 旧: createUserServerComponents を使用
  // 新: createMcpServer を使用
  ```

**関連ファイル**:

- `apps/manager/src/app/api/oauth/authorize/route.ts`
- `apps/manager/src/app/api/oauth/refresh/[tokenId]/route.ts`
- `apps/manager/src/app/api/oauth/revoke/[tokenId]/route.ts`

---

### Phase 5: フロントエンドコンポーネントの更新

#### 5.1 Custom Servers 関連 (3ファイル)

**優先度**: 🟡 High
**推定工数**: 4-5時間

- [ ] `CreateCustomServerDialog.tsx`

  ```typescript
  // tRPC呼び出しの更新
  api.userMcpServerInstance.addCustomServer
  → api.mcpServer.addCustomServer

  // 型の更新
  UserMcpServerInstanceIdSchema → McpServerIdSchema
  ```

- [ ] `ServerCardList.tsx`
  - 同様のtRPC呼び出し更新
  - toolGroup プロパティの削除
  - allowedTools プロパティの使用

- [ ] `dialogs/ServerToolSelector.tsx`
  - ツールグループロジックの削除
  - 直接的なツール選択ロジックへの変更

---

#### 5.2 Server Detail Page 関連 (5ファイル)

**優先度**: 🟡 High
**推定工数**: 5-6時間

- [ ] `ServerDetailPage/index.tsx`

  ```typescript
  // データフェッチの更新
  const { data: server } = api.mcpServer.findById.useQuery({ id });

  // データ構造の変更
  server.toolGroup → 削除
  server.allowedTools → 使用
  server.mcpServerTemplates → 使用
  ```

- [ ] `EditServerDialog.tsx`
  - ツールグループ編集ロジックの削除
  - allowedTools の直接編集

- [ ] `DeleteServerDialog.tsx`
  - API呼び出しの更新

- [ ] `OverviewTab/index.tsx`
  - データ表示ロジックの更新

- [ ] `RequestDataDetailModal.tsx`
  - McpServerRequestData テーブル削除への対応
  - GCS統合フィールドの追加対応（将来実装）

---

#### 5.3 User MCP Server Card 関連 (4ファイル)

**優先度**: 🟡 High
**推定工数**: 3-4時間

- [ ] `UserMcpServerCard/index.tsx`
  - プロパティの更新
  - tRPC呼び出しの更新

- [ ] `DeleteConfirmModal.tsx`
  - API呼び出しの更新

- [ ] `NameEditModal.tsx`
  - 同上

- [ ] `StatusEditModal.tsx`
  - 同上

---

#### 5.4 Servers Tab 関連 (4ファイル)

**優先度**: 🟡 High
**推定工数**: 4-5時間

- [ ] `AvailableServersList.tsx`

  ```typescript
  // API呼び出しの更新
  api.mcpServer.findAll
  → api.mcpServerTemplate.findAll
  ```

- [ ] `CustomMcpServerModal.tsx`
  - remoteMcpServer API の更新に対応

- [ ] `ServerList.tsx`
  - テンプレート一覧表示の更新

- [ ] `ServerCardList.tsx`
  - データ表示ロジックの更新

---

#### 5.5 その他コンポーネント (2ファイル)

**優先度**: 🟢 Medium
**推定工数**: 2-3時間

- [ ] `UserMcpServerConfigModal.tsx`
  - mcpConfigRouter への対応

- [ ] `ToolBadgeList.tsx`, `ToolBadge.tsx`, `ApiKeysTab.tsx`
  - データ構造の変更に対応

---

### Phase 6: テストの更新

#### 6.1 ユニットテストの更新

**優先度**: 🟢 Medium
**推定工数**: 4-6時間

- [ ] tRPCルーターのテストファイル確認と更新
  - 該当するテストファイルが存在する場合のみ

- [ ] モックデータの更新
  - テーブル名、フィールド名の変更に対応

---

### Phase 7: 型チェックとビルド

#### 7.1 型エラーの修正

**優先度**: 🔴 Critical
**推定工数**: 2-4時間

- [ ] `pnpm typecheck` の実行
- [ ] すべての型エラーの修正
- [ ] `@tumiki/db` パッケージのビルド確認

#### 7.2 ビルドエラーの修正

**優先度**: 🔴 Critical
**推定工数**: 1-2時間

- [ ] `pnpm build` の実行
- [ ] すべてのビルドエラーの修正

---

## 📊 推定工数サマリー

| Phase                       | タスク数 | 推定工数      | 優先度      |
| --------------------------- | -------- | ------------- | ----------- |
| Phase 1: 基盤レイヤー       | 1        | 1-2時間       | 🔴 Critical |
| Phase 2: tRPCルーター       | 5        | 19-27時間     | 🔴 Critical |
| Phase 3: 共通ユーティリティ | 1        | 4-6時間       | 🔴 Critical |
| Phase 4: OAuth API          | 1        | 3-4時間       | 🟡 High     |
| Phase 5: フロントエンド     | 18       | 18-23時間     | 🟡 High     |
| Phase 6: テスト             | 1        | 4-6時間       | 🟢 Medium   |
| Phase 7: 型チェック・ビルド | 2        | 3-6時間       | 🔴 Critical |
| **合計**                    | **29**   | **52-74時間** | -           |

**推奨実施順序**: Phase 1 → 2 → 3 → 7 → 4 → 5 → 6

---

## 🚨 リスクと注意点

### 高リスク項目

1. **ツールグループ構造の完全削除**
   - 現在の実装に深く組み込まれている
   - 代替ロジックの設計が必要
   - UI/UXへの影響が大きい

2. **OAuthSession テーブルの削除**
   - OAuth フロー全体の見直しが必要
   - セッション管理の代替実装が必要

3. **McpServerRequestData テーブルの削除**
   - リクエスト詳細データの保存先変更（GCS統合）
   - 既存のリクエストログ機能への影響

### 中リスク項目

1. **ID型の大規模変更**
   - 全ファイルへの波及
   - 型エラーの大量発生が予想される

2. **多対多リレーションへの移行**
   - Prisma の暗黙的多対多の理解が必要
   - クエリパターンの変更

---

## 📝 実装ガイドライン

### 1. 段階的な実装

各Phaseを順番に実施し、Phase完了ごとに以下を確認：

- [ ] `pnpm typecheck` が成功
- [ ] `pnpm lint:fix` でリントエラーなし
- [ ] `pnpm format:fix` でフォーマット完了

### 2. データ移行の考慮

本番環境に適用する際は、別途データ移行スクリプトが必要：

- 既存の `UserMcpServerInstance` データを `McpServer` に移行
- 既存の `UserMcpServerConfig` データを `McpConfig` に移行
- ツールグループデータを多対多リレーションに変換

### 3. 後方互換性

データ移行期間中は、以下を考慮：

- 旧APIエンドポイントの一時的な維持
- フィーチャーフラグによる段階的な切り替え

---

## ✅ 完了条件

- [ ] すべてのPhaseのタスクが完了
- [ ] `pnpm typecheck` が成功
- [ ] `pnpm lint:fix` が成功
- [ ] `pnpm format:fix` が成功
- [ ] `pnpm build` が成功
- [ ] `pnpm test` が成功（該当テストがある場合）
- [ ] 主要な機能が動作することを手動確認
- [ ] PR作成とレビュー完了

---

## 📚 参考資料

- [Prisma Schema README](../packages/db/prisma/README.md)
- [PR #459: MCPスキーマリファクタリング](https://github.com/rayven122/tumiki/pull/459)
- [CLAUDE.md プロジェクトガイドライン](../CLAUDE.md)
