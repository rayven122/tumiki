---
description: 統合MCPエンドポイント機能の実装・管理ガイド。複数のMCPサーバーを単一エンドポイントで統合し、サーバー種類の自動判定、認証、ツール集約を実装する際の実践的リファレンス
---

# 統合MCPエンドポイント機能 - 実装リファレンス

**このスキルを使用する場面：**
- 統合MCPエンドポイント機能を実装・変更する場合
- サーバー種類判定ロジック（McpServer / UnifiedMcpServer）の理解が必要な場合
- 3階層ツール名フォーマットの処理が必要な場合
- JWT認証フローの設計・デバッグ時
- Redis キャッシング戦略の検討時
- PII/TOON ミドルウェアの条件付き適用が必要な場合

---

## アーキテクチャ概要

### 単一エンドポイント設計

統合MCPエンドポイントは単一のURL `POST /mcp/:serverId` で、通常MCPサーバーと統合MCPサーバーの両方に対応する。

```
POST /mcp/:serverId
      ↓
┌─────────────────────────────────────┐
│      authMiddleware                 │
│  (detectServerType で種類判定)      │
└─────────────────────────────────────┘
      ↓
  type = "mcp" ?
      ├── YES → 通常MCPサーバー処理
      │         - 組織メンバーシップチェック
      │         - PII/TOONミドルウェア適用
      │
      └── NO (type = "unified") → 統合MCPサーバー処理
                - 作成者チェック
                - PII/TOONは子サーバーごとに適用
```

### サーバー種類の自動判定

`detectServerType()` 関数がDBを検索して `serverId` の種類を判定する。

```typescript
// apps/mcp-proxy/src/middleware/auth/index.ts
export type ServerTypeResult =
  | { type: "mcp"; server: McpServerLookupResult }
  | { type: "unified"; server: UnifiedMcpServerInfo }
  | null;

export const detectServerType = async (
  serverId: string,
): Promise<ServerTypeResult> => {
  // まずMcpServerを検索
  const mcpServer = await getMcpServerOrganization(serverId);
  if (mcpServer) {
    return { type: "mcp", server: mcpServer };
  }

  // 見つからなければUnifiedMcpServerを検索
  const unifiedServer = await db.unifiedMcpServer.findUnique({
    where: { id: serverId },
    select: { id: true, name: true, organizationId: true, createdBy: true, deletedAt: true },
  });

  if (unifiedServer) {
    return { type: "unified", server: unifiedServer };
  }

  return null;
};
```

---

## データモデル

### UnifiedMcpServer

統合MCPサーバーの親エンティティ。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | String | CUID |
| name | String | 統合サーバー名 |
| description | String? | 説明 |
| organizationId | String | 所属組織 |
| createdBy | String | 作成者ID |
| deletedAt | DateTime? | 論理削除 |

### UnifiedMcpServerChild

子MCPサーバーとの関連。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | String | CUID |
| unifiedMcpServerId | String | 親ID |
| mcpServerId | String | 子MCPサーバーID |
| displayOrder | Int | 表示順 |

### AuthContext 拡張

```typescript
// 統合エンドポイント用フィールド
type AuthContext = {
  // ...既存フィールド
  isUnifiedEndpoint: boolean;       // 統合エンドポイントからか
  unifiedMcpServerId?: string;      // 統合サーバーID
};
```

---

## 認証フロー

### JWT認証 vs API Key認証

| 認証方式 | 通常MCP | 統合MCP |
|---------|---------|---------|
| JWT (Bearer eyJ...) | ○ | ○ |
| API Key (tumiki_...) | ○ | ✕ |

### 統合サーバーの認可ロジック

```typescript
// apps/mcp-proxy/src/middleware/auth/index.ts
const handleUnifiedServerAuth = async (...) => {
  // 1. 論理削除チェック
  if (server.deletedAt) {
    return c.json(createNotFoundError(...), 404);
  }

  // 2. 作成者チェック（createdBy == userId）
  if (server.createdBy !== userId) {
    return c.json(createPermissionDeniedError(
      "Only the creator can access this unified MCP server"
    ), 403);
  }

  // 3. 組織メンバーシップチェック（追加の安全チェック）
  const isMember = await checkOrganizationMembership(server.organizationId, userId);
  if (!isMember) {
    return c.json(createPermissionDeniedError(...), 403);
  }

  // 4. AuthContextに統合エンドポイントフラグを設定
  c.set("authContext", {
    ...baseContext,
    isUnifiedEndpoint: true,
    unifiedMcpServerId: server.id,
    piiMaskingMode: PiiMaskingMode.DISABLED,  // 子サーバーごとに適用
    toonConversionEnabled: false,
  });
};
```

---

## 3階層ツール名フォーマット

### フォーマット

```
{mcpServerId}__{instanceName}__{toolName}
```

例: `cm1abc2def3ghi__personal__list_repos`

### パース処理

```typescript
// apps/mcp-proxy/src/services/unifiedMcp/toolNameParser.ts
export type ParsedToolName = {
  mcpServerId: string;      // MCPサーバーID
  instanceName: string;     // テンプレートインスタンスの正規化名
  toolName: string;         // ツール名（MCPツールの元の名前）
};

export const parseUnifiedToolName = (fullToolName: string): ParsedToolName => {
  const parts = fullToolName.split("__");

  if (parts.length !== 3) {
    throw new Error(`Invalid unified tool name format: "${fullToolName}"`);
  }

  const [mcpServerId, instanceName, toolName] = parts;
  return { mcpServerId, instanceName, toolName };
};
```

### フォーマット処理

```typescript
export const formatUnifiedToolName = (
  mcpServerId: string,
  instanceName: string,
  toolName: string,
): string => {
  return `${mcpServerId}__${instanceName}__${toolName}`;
};
```

---

## 条件付きミドルウェア

統合エンドポイントではPII/TOONミドルウェアを親レベルでスキップし、`tools/call` 時に子サーバーの設定を動的に適用する。

```typescript
// apps/mcp-proxy/src/routes/mcp.ts
const conditionalPiiMaskingMiddleware = async (c, next) => {
  const authContext = c.get("authContext");

  // 統合エンドポイントの場合はスキップ
  if (authContext?.isUnifiedEndpoint) {
    await next();
    return;
  }

  // 通常エンドポイントの場合はPIIマスキングを適用
  return piiMaskingMiddleware(c, next);
};

// ルート定義
mcpRoute.post(
  "/mcp/:serverId",
  mcpRequestLoggingMiddleware,
  authMiddleware,
  conditionalPiiMaskingMiddleware,  // 条件付き
  conditionalToonMiddleware,        // 条件付き
  mcpHandler,
);
```

---

## ツール集約 (tools/list)

### Fail-fast戦略

子サーバーに `STOPPED` または `ERROR` 状態のサーバーがあれば即座にエラーを返す。

```typescript
// apps/mcp-proxy/src/services/unifiedMcp/toolsAggregator.ts
export const aggregateTools = async (
  unifiedMcpServerId: string,
): Promise<AggregatedTool[]> => {
  // 1. キャッシュをチェック
  const cached = await getUnifiedToolsFromCache(unifiedMcpServerId);
  if (cached !== null) return cached;

  // 2. DBから子サーバーを取得
  const unifiedServer = await db.unifiedMcpServer.findUnique({...});

  // 3. 論理削除された子サーバーを除外
  const activeChildServers = unifiedServer.childServers
    .map((child) => child.mcpServer)
    .filter((server) => server.deletedAt === null);

  // 4. Fail-fast: STOPPED/ERRORのサーバーがあればエラー
  const problemServers = activeChildServers.filter(
    (server) =>
      server.serverStatus === ServerStatus.STOPPED ||
      server.serverStatus === ServerStatus.ERROR,
  );

  if (problemServers.length > 0) {
    throw new Error(
      `Cannot aggregate tools: some child servers are not running`
    );
  }

  // 5. ツールを集約（3階層フォーマット）
  const aggregatedTools: AggregatedTool[] = [];
  for (const server of activeChildServers) {
    for (const instance of server.templateInstances) {
      for (const tool of instance.allowedTools) {
        aggregatedTools.push({
          name: formatUnifiedToolName(server.id, instance.normalizedName, tool.name),
          description: tool.description,
          inputSchema: tool.inputSchema,
          mcpServerId: server.id,
          instanceName: instance.normalizedName,
        });
      }
    }
  }

  // 6. キャッシュに保存
  await setUnifiedToolsCache(unifiedMcpServerId, aggregatedTools);

  return aggregatedTools;
};
```

---

## ツール実行 (tools/call)

### 接続時判断

`tools/call` 時に子サーバーの状態をチェックし、子サーバーのPII/TOON設定を動的に適用する。

```typescript
// apps/mcp-proxy/src/services/unifiedMcp/toolExecutor.ts
export const executeUnifiedTool = async (
  unifiedMcpServerId: string,
  organizationId: string,
  fullToolName: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> => {
  // 1. 3階層ツール名をパース
  const { mcpServerId, instanceName, toolName } = parseUnifiedToolName(fullToolName);

  // 2. テンプレートインスタンスを取得
  const templateInstance = await db.mcpServerTemplateInstance.findUniqueOrThrow({
    where: {
      mcpServerId_normalizedName: { mcpServerId, normalizedName: instanceName },
    },
    include: {
      mcpServer: {
        select: {
          piiMaskingMode: true,
          piiInfoTypes: true,
          toonConversionEnabled: true,
        },
      },
      mcpServerTemplate: { include: { mcpTools: true } },
    },
  });

  // 3. 実行コンテキストに子サーバーのPII/TOON設定を適用
  updateExecutionContext({
    method: "tools/call",
    piiMaskingMode: templateInstance.mcpServer.piiMaskingMode,
    piiInfoTypes: templateInstance.mcpServer.piiInfoTypes,
    toonConversionEnabled: templateInstance.mcpServer.toonConversionEnabled,
    actualMcpServerId: mcpServerId,
  });

  // 4. MCP サーバーに接続・実行
  const client = await connectToMcpServer(template, userId, templateInstance.id, mcpConfig);
  const result = await client.callTool({ name: toolName, arguments: args });
  await client.close();

  return result;
};
```

---

## Redis キャッシング

### 設定

| 項目 | 値 |
|------|-----|
| TTL | 5分（300秒） |
| キーフォーマット | `unified:tools:{unifiedId}` |

### 実装

```typescript
// apps/mcp-proxy/src/libs/cache/unifiedToolsCache.ts
const CACHE_TTL_SECONDS = 300;
const CACHE_KEY_PREFIX = "unified:tools:";

export const getUnifiedToolsFromCache = async (
  unifiedId: string,
): Promise<AggregatedTool[] | null> => {
  const cacheKey = `${CACHE_KEY_PREFIX}${unifiedId}`;
  const redis = await getRedisClient();
  if (!redis) return null;

  const cached = await redis.get(cacheKey);
  if (!cached) return null;

  const parsed = JSON.parse(cached) as CachedUnifiedTools;
  return parsed.tools;
};

export const setUnifiedToolsCache = async (
  unifiedId: string,
  tools: AggregatedTool[],
): Promise<void> => {
  const cacheKey = `${CACHE_KEY_PREFIX}${unifiedId}`;
  const redis = await getRedisClient();
  if (!redis) return;

  const cacheData: CachedUnifiedTools = {
    tools,
    cachedAt: new Date().toISOString(),
  };

  await redis.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(cacheData));
};

export const invalidateUnifiedToolsCache = async (unifiedId: string): Promise<void> => {
  // 子サーバー構成変更時にキャッシュを無効化
  await redis.del(`${CACHE_KEY_PREFIX}${unifiedId}`);
};
```

---

## 主要ファイル一覧

| ファイル | 内容 |
|----------|------|
| `middleware/auth/index.ts` | `detectServerType()`, 統合認証ロジック |
| `handlers/mcpHandler.ts` | 統合サーバー処理分岐 |
| `routes/mcp.ts` | 条件付きミドルウェア、ルート定義 |
| `services/unifiedMcp/toolsAggregator.ts` | ツール集約、Fail-fast |
| `services/unifiedMcp/toolNameParser.ts` | 3階層フォーマット処理 |
| `services/unifiedMcp/toolExecutor.ts` | ツール実行、PII/TOON動的適用 |
| `services/unifiedMcp/types.ts` | 型定義 |
| `libs/cache/unifiedToolsCache.ts` | Redis キャッシング |

---

## 実装チェックリスト

### 認証・認可

- [ ] `detectServerType()` でサーバー種類を正しく判定しているか
- [ ] 統合サーバーは作成者のみアクセス可能か
- [ ] 組織メンバーシップチェックを実施しているか
- [ ] 論理削除されたサーバーを適切に拒否しているか

### ツール集約 (tools/list)

- [ ] Fail-fast: STOPPED/ERRORサーバーでエラーを返しているか
- [ ] 3階層フォーマットでツール名を生成しているか
- [ ] Redisキャッシュを活用しているか（TTL 5分）
- [ ] 論理削除された子サーバーを除外しているか

### ツール実行 (tools/call)

- [ ] 3階層ツール名を正しくパースしているか
- [ ] 子サーバーのPII/TOON設定を動的に適用しているか
- [ ] 組織IDの検証を行っているか
- [ ] 実行コンテキストに `actualMcpServerId` を記録しているか

### ミドルウェア

- [ ] 統合エンドポイントでPII/TOONミドルウェアをスキップしているか
- [ ] `authContext.isUnifiedEndpoint` フラグを正しく設定しているか

### エラーハンドリング

- [ ] 適切なHTTPステータスコードを返しているか（401, 403, 404）
- [ ] エラーメッセージが適切か
- [ ] ログにエラー情報を記録しているか

---

## トラブルシューティング

### 「Server not found」エラー

1. `serverId` がMcpServerとUnifiedMcpServerのどちらにも存在しない
2. 対処: DBでIDの存在を確認

### 「Only the creator can access」エラー

1. 統合サーバーに作成者以外がアクセスしている
2. 対処: JWTのユーザーIDと `createdBy` を比較

### 「Cannot aggregate tools: some child servers are not running」

1. 子サーバーがSTOPPEDまたはERROR状態
2. 対処: 子サーバーの状態を確認し、起動または削除

### キャッシュが更新されない

1. Redisへの接続が失敗している可能性
2. 対処: Redisの接続状態を確認、`invalidateUnifiedToolsCache()` を手動実行

---

## 活用のポイント

このスキルを活用することで、以下の効果が期待できます：

- **開発効率の向上**: 統合MCPエンドポイントの設計パターンを理解し、迅速に実装
- **デバッグの迅速化**: 認証フローやツール名フォーマットの仕組みを把握し、問題を特定
- **保守性の向上**: 主要ファイルとその役割を把握し、変更の影響範囲を把握
- **品質の確保**: 実装チェックリストで必要な検証を漏れなく実施

統合MCPエンドポイント機能の実装・変更時は、このスキルの情報とチェックリストを参照してください。
