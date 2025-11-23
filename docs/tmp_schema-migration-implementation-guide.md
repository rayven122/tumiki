# スキーマ移行 実装ガイド

> **作成日**: 2025-01-23
> **対象**: Manager アプリケーションの段階的な移行実装

## 📋 目次

1. [推奨実装アプローチ](#推奨実装アプローチ)
2. [Phase別の実装手順](#phase別の実装手順)
3. [よくある問題と解決策](#よくある問題と解決策)
4. [テストとデバッグ](#テストとデバッグ)
5. [FAQ](#faq)

---

## 1. 推奨実装アプローチ

### 1.1 基本方針

✅ **DO (推奨)**

- ボトムアップで実装（基盤 → API → UI）
- 小さな単位でコミット（1ファイル or 関連ファイルセット）
- 各Phaseごとに型チェックを実行
- tRPCルーターは1エンドポイントずつ更新
- フロントエンドは機能単位で更新

❌ **DON'T (非推奨)**

- 複数Phaseを並行実装
- 大量のファイルを一括変更してコミット
- 型エラーを無視して先に進む
- テストを後回しにする

---

### 1.2 推奨実装順序

```
Phase 1: 基盤レイヤー (1-2時間)
  ↓
Phase 2: tRPCルーター (19-27時間)
  - 2.1 mcpServerRouter → mcpServerTemplateRouter (2-3h)
  - 2.2 userMcpServerInstanceRouter → mcpServerRouter (8-12h)
  - 2.3 userMcpServerConfigRouter → mcpConfigRouter (3-4h)
  - 2.4 mcpApiKeyRouter (2-3h)
  - 2.5 remoteMcpServerRouter (4-5h)
  ↓
Phase 3: 共通ユーティリティ (4-6時間)
  ↓
Phase 7: 型チェック・ビルド (3-6時間)
  ↓
Phase 4: OAuth API (3-4時間)
  ↓
Phase 5: フロントエンド (18-23時間)
  ↓
Phase 6: テスト (4-6時間)
```

**理由**:

- Phase 1-3 で API層を完成させる
- Phase 7 で型エラーを完全に解消してから UI実装へ
- Phase 4-5 は型が安定してから実装
- Phase 6 は最後に包括的にテスト

---

## 2. Phase別の実装手順

### Phase 1: 基盤レイヤーの更新

#### Step 1.1: ID型定義ファイルのバックアップ

```bash
cp apps/manager/src/schema/ids.ts apps/manager/src/schema/ids.ts.bak
```

#### Step 1.2: ID型の更新

**ファイル**: `apps/manager/src/schema/ids.ts`

```typescript
// 1. 新しいID型を追加
export const McpServerTemplateIdSchema = z
  .string()
  .brand<"McpServerTemplateId">();
export const McpConfigIdSchema = z.string().brand<"McpConfigId">();
export const McpToolIdSchema = z.string().brand<"McpToolId">();
export const McpOAuthClientIdSchema = z.string().brand<"McpOAuthClientId">();
export const McpOAuthTokenIdSchema = z.string().brand<"McpOAuthTokenId">();

export type McpServerTemplateId = z.infer<typeof McpServerTemplateIdSchema>;
export type McpConfigId = z.infer<typeof McpConfigIdSchema>;
export type McpToolId = z.infer<typeof McpToolIdSchema>;
export type McpOAuthClientId = z.infer<typeof McpOAuthClientIdSchema>;
export type McpOAuthTokenId = z.infer<typeof McpOAuthTokenIdSchema>;

// 2. 既存のID型にコメント追加（後で削除）
/**
 * @deprecated 新スキーマでは McpServerIdSchema に名称変更
 */
export const UserMcpServerInstanceIdSchema = z
  .string()
  .brand<"UserMcpServerInstanceId">();

/**
 * @deprecated 新スキーマでは McpConfigIdSchema に変更
 */
export const UserMcpServerConfigIdSchema = z
  .string()
  .brand<"UserMcpServerConfigId">();

/**
 * @deprecated ツールグループ廃止により削除予定
 */
export const UserToolGroupIdSchema = z.string().brand<"UserToolGroupId">();
```

#### Step 1.3: 型チェック実行

```bash
cd apps/manager
pnpm typecheck 2>&1 | tee typecheck-phase1.log
```

**期待結果**: 多数の型エラーが表示される（正常）

#### Step 1.4: コミット

```bash
git add apps/manager/src/schema/ids.ts
git commit -m "feat: add new ID types for schema migration"
```

---

### Phase 2: tRPCルーターの更新

#### Phase 2.1: mcpServerRouter → mcpServerTemplateRouter

##### Step 2.1.1: ディレクトリ名変更

```bash
cd apps/manager/src/server/api/routers
mv mcpServer mcpServerTemplate
```

##### Step 2.1.2: findAllWithTools.ts の更新

**ファイル**: `apps/manager/src/server/api/routers/mcpServerTemplate/findAllWithTools.ts`

```typescript
import "server-only";
import { db } from "@tumiki/db/server";

export const findAllWithTools = async () => {
  const mcpServerTemplates = await db.mcpServerTemplate.findMany({
    where: {
      visibility: "PUBLIC",
      organizationId: null, // グローバルテンプレートのみ
    },
    include: {
      tools: true,
    },
  });
  return mcpServerTemplates;
};
```

##### Step 2.1.3: index.ts の更新

**ファイル**: `apps/manager/src/server/api/routers/mcpServerTemplate/index.ts`

```typescript
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { findAllWithTools } from "./findAllWithTools";
import { createMcpServerTemplate } from "./create";
import z from "zod";
import {
  McpServerVisibility,
  TransportType,
  AuthType,
} from "@tumiki/db/server";
import { nameValidationSchema } from "@/schema/validation";

export const CreateMcpServerTemplateInput = z.object({
  name: nameValidationSchema,
  iconPath: z.string().optional(),
  transportType: z.nativeEnum(TransportType),
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  url: z.string().optional(),
  envVarKeys: z.array(z.string()).default([]), // envVars → envVarKeys
  authType: z.nativeEnum(AuthType).default("NONE"),
  oauthProvider: z.string().optional(),
  oauthScopes: z.array(z.string()).default([]),
  useCloudRunIam: z.boolean().default(false), // 追加
  visibility: z.nativeEnum(McpServerVisibility).default("PRIVATE"),
  organizationId: z.string().optional(),
});

export const mcpServerTemplateRouter = createTRPCRouter({
  findAll: protectedProcedure.query(findAllWithTools),
  create: protectedProcedure
    .input(CreateMcpServerTemplateInput)
    .mutation(createMcpServerTemplate),
});
```

##### Step 2.1.4: create.ts の更新

**ファイル**: `apps/manager/src/server/api/routers/mcpServerTemplate/create.ts`

テーブル名を `mcpServer` → `mcpServerTemplate` に変更。

##### Step 2.1.5: ルーターの登録更新

**ファイル**: `apps/manager/src/server/api/root.ts`

```typescript
import { mcpServerTemplateRouter } from "./routers/mcpServerTemplate"; // 変更

export const appRouter = createTRPCRouter({
  // ...
  mcpServerTemplate: mcpServerTemplateRouter, // 変更
  // ...
});
```

##### Step 2.1.6: 型チェックとコミット

```bash
pnpm typecheck 2>&1 | tee typecheck-phase2-1.log
git add .
git commit -m "refactor: rename mcpServerRouter to mcpServerTemplateRouter"
```

---

#### Phase 2.2: userMcpServerInstanceRouter → mcpServerRouter

**⚠️ 最も複雑で時間がかかるPhase**

##### Step 2.2.1: ディレクトリ名変更

```bash
cd apps/manager/src/server/api/routers
mv userMcpServerInstance mcpServer
```

##### Step 2.2.2: index.ts の大規模更新

**ファイル**: `apps/manager/src/server/api/routers/mcpServer/index.ts`

主な変更:

- インポート更新: `UserMcpServerInstanceIdSchema` → `McpServerIdSchema`
- `UserToolGroupIdSchema` の削除
- `UserMcpServerConfigIdSchema` → `McpConfigIdSchema`
- スキーマ定義の更新

```typescript
import {
  McpServerIdSchema, // 変更
  McpToolIdSchema, // 変更
  McpConfigIdSchema, // 変更
} from "@/schema/ids";

export const FindServersOutput = z.array(
  McpServerSchema.merge(
    // UserMcpServerInstanceSchema → McpServerSchema
    z.object({
      id: McpServerIdSchema,
      apiKeys: McpApiKeySchema.array(),
      allowedTools: z.array(
        // tools → allowedTools
        McpToolSchema.pick({
          id: true,
          name: true,
          description: true,
        }),
      ),
      mcpServerTemplates: z.array(
        // 追加
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

##### Step 2.2.3: findOfficialServers.ts の完全書き換え

**ファイル**: `apps/manager/src/server/api/routers/mcpServer/findOfficialServers.ts`

```typescript
import { ServerType } from "@tumiki/db/prisma";
import type { ProtectedContext } from "../../trpc";

type FindOfficialServersInput = {
  ctx: ProtectedContext;
};

export const findOfficialServers = async ({
  ctx,
}: FindOfficialServersInput) => {
  const servers = await ctx.db.mcpServer.findMany({
    where: {
      serverType: ServerType.OFFICIAL,
      organizationId: ctx.currentOrganizationId,
      deletedAt: null,
    },
    orderBy: {
      displayOrder: "asc",
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
          url: true,
        },
      },
    },
  });

  return servers;
};
```

##### Step 2.2.4: toggleTool.ts の完全書き換え

**ファイル**: `apps/manager/src/server/api/routers/mcpServer/toggleTool.ts`

```typescript
import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { ToggleToolInput } from ".";

type ToggleToolInputType = {
  ctx: ProtectedContext;
  input: z.infer<typeof ToggleToolInput>;
};

export const toggleTool = async ({ ctx, input }: ToggleToolInputType) => {
  const { instanceId, toolId, enabled } = input;

  await ctx.db.mcpServer.update({
    where: { id: instanceId },
    data: {
      allowedTools: {
        [enabled ? "connect" : "disconnect"]: { id: toolId },
      },
    },
  });

  return { success: true };
};
```

##### Step 2.2.5: 各エンドポイントファイルの順次更新

1. `findById.ts`
2. `addOfficialServer.ts`（Phase 3で実装）
3. `addCustomServer.ts`
4. `updateServerInstance.ts`
5. `deleteServerInstance.ts`
6. `findRequestLogs.ts`
7. `getRequestStats.ts`
8. その他...

各ファイル更新後に型チェック実行を推奨。

##### Step 2.2.6: ルーター登録の更新

**ファイル**: `apps/manager/src/server/api/root.ts`

```typescript
import { mcpServerRouter } from "./routers/mcpServer"; // userMcpServerInstance から変更

export const appRouter = createTRPCRouter({
  // ...
  mcpServer: mcpServerRouter, // userMcpServerInstance から変更
  // ...
});
```

##### Step 2.2.7: 型チェックとコミット

```bash
pnpm typecheck 2>&1 | tee typecheck-phase2-2.log
git add .
git commit -m "refactor: migrate userMcpServerInstanceRouter to mcpServerRouter"
```

---

### Phase 3: 共通ユーティリティの更新

#### Step 3.1: createUserServerComponents.ts の削除

```bash
rm apps/manager/src/server/api/routers/_shared/createUserServerComponents.ts
```

#### Step 3.2: 新しいヘルパー関数の作成

**ファイル**: `apps/manager/src/server/api/routers/_shared/createMcpServer.ts`

```typescript
import type { db } from "@tumiki/db/server";
import { ServerStatus, ServerType } from "@tumiki/db/prisma";
import { generateApiKey } from "@/utils/server";

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

type CreateMcpServerInput = {
  tx: TransactionClient;
  mcpServerTemplateIds: string[];
  allowedToolIds: string[];
  envVars: Record<string, string>;
  instanceName: string;
  instanceDescription?: string;
  organizationId: string;
  userId: string;
  isPending?: boolean;
};

type CreateMcpServerOutput = {
  config: { id: string };
  instance: { id: string };
};

export const createMcpServer = async (
  input: CreateMcpServerInput,
): Promise<CreateMcpServerOutput> => {
  const {
    tx,
    mcpServerTemplateIds,
    allowedToolIds,
    envVars,
    instanceName,
    instanceDescription = "",
    organizationId,
    userId,
    isPending = false,
  } = input;

  // 1. McpConfig 作成
  const config = await tx.mcpConfig.create({
    data: {
      organizationId,
      userId: isPending ? userId : null,
      envVars: JSON.stringify(envVars),
      mcpServerTemplateId: mcpServerTemplateIds[0],
    },
  });

  // 2. McpServer 作成（多対多リレーション設定）
  const fullKey = isPending ? undefined : generateApiKey();

  const instance = await tx.mcpServer.create({
    data: {
      organizationId,
      name: instanceName,
      description: instanceDescription,
      serverStatus: isPending ? ServerStatus.PENDING : ServerStatus.RUNNING,
      serverType: ServerType.OFFICIAL,
      mcpServerTemplates: {
        connect: mcpServerTemplateIds.map((id) => ({ id })),
      },
      allowedTools: {
        connect: allowedToolIds.map((id) => ({ id })),
      },
      apiKeys:
        isPending || !fullKey
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

  return { config, instance };
};
```

#### Step 3.3: addOfficialServer.ts の更新

**ファイル**: `apps/manager/src/server/api/routers/mcpServer/addOfficialServer.ts`

```typescript
import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { AddOfficialServerInput } from ".";
import { createMcpServer } from "../_shared/createMcpServer";

type AddOfficialServerInputType = {
  ctx: ProtectedContext;
  input: z.infer<typeof AddOfficialServerInput>;
};

export const addOfficialServer = async ({
  ctx,
  input,
}: AddOfficialServerInputType) => {
  const mcpServerTemplate = await ctx.db.mcpServerTemplate.findUnique({
    where: { id: input.mcpServerId },
    include: { tools: true },
  });

  if (!mcpServerTemplate) {
    throw new Error("MCPサーバーテンプレートが見つかりません");
  }

  if (mcpServerTemplate.transportType === "STDIO") {
    throw new Error("STDIOタイプはサポートされていません");
  }

  const envVars = Object.keys(input.envVars);
  const isEnvVarsMatch = envVars.every((envVar) =>
    mcpServerTemplate.envVarKeys.includes(envVar),
  );

  if (!isEnvVarsMatch && !input.isPending) {
    throw new Error("環境変数が一致しません");
  }

  const data = await ctx.db.$transaction(async (tx) => {
    return await createMcpServer({
      tx,
      mcpServerTemplateIds: [mcpServerTemplate.id],
      allowedToolIds: mcpServerTemplate.tools.map((t) => t.id),
      envVars: input.envVars,
      instanceName: input.name,
      instanceDescription: input.description ?? "",
      organizationId: ctx.currentOrganizationId,
      userId: ctx.session.user.id,
      isPending: input.isPending,
    });
  });

  const skipValidation =
    mcpServerTemplate.authType === "NONE" &&
    mcpServerTemplate.envVarKeys.length === 0;

  return {
    id: data.instance.id,
    mcpConfigId: data.config.id,
    skipValidation,
  };
};
```

#### Step 3.4: 型チェックとコミット

```bash
pnpm typecheck
git add .
git commit -m "refactor: replace createUserServerComponents with createMcpServer"
```

---

### Phase 7: 型チェックとビルド (先行実施)

#### Step 7.1: 全型エラーの修正

```bash
pnpm typecheck > typecheck-errors.log 2>&1
```

エラーログを確認し、以下の順で修正:

1. **ID型の不一致**
   - `UserMcpServerInstanceIdSchema` → `McpServerIdSchema`
   - `UserMcpServerConfigIdSchema` → `McpConfigIdSchema`
   - `UserToolGroupIdSchema` 削除

2. **プロパティの不一致**
   - `toolGroup` → 削除
   - `tools` → `allowedTools`
   - `mcpServer` → `mcpServerTemplates`

3. **リレーションの不一致**
   - include句の更新

#### Step 7.2: ビルドエラーの修正

```bash
pnpm build > build-errors.log 2>&1
```

#### Step 7.3: コミット

```bash
git add .
git commit -m "fix: resolve all type and build errors"
```

---

### Phase 4-6: 残りのPhase

同様のアプローチで実装。詳細は省略。

---

## 3. よくある問題と解決策

### 問題 1: 型エラー `Property 'toolGroup' does not exist`

**原因**: ツールグループが削除されたが、コードで参照している

**解決策**:

```typescript
// 旧
const toolCount = server.toolGroup?._count?.toolGroupTools ?? 0;

// 新
const toolCount = server.allowedTools.length;
```

---

### 問題 2: Prismaクエリエラー `Unknown field toolGroup`

**原因**: include句に削除されたフィールドを指定している

**解決策**:

```typescript
// 旧
include: {
  toolGroup: { ... }
}

// 新
include: {
  allowedTools: { ... },
  mcpServerTemplates: { ... }
}
```

---

### 問題 3: 多対多リレーションの更新方法

**問題**: ツールの有効/無効を切り替える方法がわからない

**解決策**:

```typescript
// 有効化
await db.mcpServer.update({
  where: { id: serverId },
  data: {
    allowedTools: {
      connect: { id: toolId },
    },
  },
});

// 無効化
await db.mcpServer.update({
  where: { id: serverId },
  data: {
    allowedTools: {
      disconnect: { id: toolId },
    },
  },
});
```

---

### 問題 4: `@tumiki/db` パッケージの型が古い

**原因**: パッケージがビルドされていない

**解決策**:

```bash
cd packages/db
pnpm build
cd ../../apps/manager
pnpm typecheck
```

---

## 4. テストとデバッグ

### 4.1 型チェックの段階的実行

```bash
# 特定ディレクトリのみ
pnpm tsc --noEmit apps/manager/src/server/api/routers/mcpServer/**/*.ts

# 全体
pnpm typecheck
```

### 4.2 tRPCエンドポイントの動作確認

開発サーバーを起動して、ブラウザでテスト:

```bash
pnpm dev
```

ブラウザで `http://localhost:3000` にアクセスし、各機能を手動テスト。

### 4.3 Prismaクエリのデバッグ

```typescript
// ログ有効化
const result = await db.mcpServer.findMany({
  // ...
});
console.log(JSON.stringify(result, null, 2));
```

---

## 5. FAQ

### Q1: Phase 2.2 が最も時間がかかる理由は？

**A**: 以下の理由で複雑:

- 最も多くのエンドポイント（18ファイル）
- ツールグループロジックの完全削除が必要
- 多対多リレーションへの移行
- リクエストログ機能の更新

### Q2: データ移行はどのタイミングで実施する？

**A**: コード実装が完全に完了してから。本番環境適用前に、別途データ移行スクリプトを作成して実行。

### Q3: 旧スキーマとの互換性を保つ方法は？

**A**: フィーチャーフラグを使用:

```typescript
const useNewSchema = process.env.USE_NEW_SCHEMA === "true";

if (useNewSchema) {
  // 新スキーマのロジック
} else {
  // 旧スキーマのロジック
}
```

### Q4: OAuthSessionテーブルが削除されたが、代替案は？

**A**: Next.js sessionまたはRedisを使用:

```typescript
// Next.js session
import { getServerSession } from "next-auth/next";

// または Redis
import { redis } from "@/lib/redis";
await redis.set(`oauth:${sessionId}`, JSON.stringify(data), "EX", 600);
```

### Q5: GCS統合はいつ実装する？

**A**: 別Issue/PRで実装。現時点では `gcsObjectKey` フィールドは null のまま。

---

## ✅ 実装完了チェックリスト

### Phase 1

- [ ] ID型の追加
- [ ] 既存ID型のdeprecatedマーク
- [ ] 型チェック実行
- [ ] コミット

### Phase 2

- [ ] mcpServerTemplateRouter 完成
- [ ] mcpServerRouter 完成
- [ ] mcpConfigRouter 完成
- [ ] mcpApiKeyRouter 更新
- [ ] remoteMcpServerRouter 更新
- [ ] 各Phaseごとにコミット

### Phase 3

- [ ] createMcpServer 関数作成
- [ ] createUserServerComponents 削除
- [ ] addOfficialServer 更新
- [ ] remoteMcpServer/create 更新

### Phase 7

- [ ] すべての型エラー解消
- [ ] ビルド成功

### Phase 4

- [ ] OAuth callback 更新
- [ ] OAuth API 更新

### Phase 5

- [ ] フロントエンド16ファイル更新

### Phase 6

- [ ] テスト更新

---

**最終更新日**: 2025-01-23
