---
apps:
  - mcp-proxy
severity: low
difficulty: high
---

# コネクションプーリングの欠如

## 概要

MCPサーバーへの接続がリクエストごとに新規作成されており、接続のオーバーヘッドが発生している。

## 重大度

低

## 影響範囲

- `apps/mcp-proxy/src/services/mcpConnection.ts`
- `apps/mcp-proxy/src/handlers/mcpHandler.ts`

## 詳細

### 現状

`mcpConnection.ts:17-112` では、毎回新しいクライアントを作成:

```typescript
export const connectToMcpServer = async (
  mcpServerTemplate: McpServerTemplate,
  userId: string,
  mcpServerTemplateInstanceId: string,
  mcpConfig: McpConfig | null,
): Promise<Client> => {
  // 毎回新しいトランスポートを作成
  let transport;
  switch (transportType) {
    case "SSE":
      transport = new SSEClientTransport(new URL(url));
      break;
    case "STREAMABLE_HTTPS":
      transport = new StreamableHTTPClientTransport(new URL(url), {
        /* ... */
      });
      break;
    // ...
  }

  // 毎回新しいクライアントを作成
  const client = new Client(/* ... */);
  await client.connect(transport);

  return client;
};
```

### 問題点

1. **接続オーバーヘッド**
   - TCP接続の確立（3ウェイハンドシェイク）
   - TLSハンドシェイク（HTTPS の場合）
   - HTTP/2 接続の確立
   - MCP プロトコルの初期化

2. **Cloud Run 環境との相性**
   - Cloud Run はステートレス環境
   - しかし、リクエスト間で接続を再利用できる期間はある
   - 同一ユーザーの連続リクエストで接続が無駄に作り直される

3. **リソース消費**
   - 大量の同時接続によるファイルディスクリプタ消費
   - メモリ消費の増加

4. **レイテンシの増加**
   - 接続確立に数百ミリ秒かかる場合がある
   - 特にCloud Run MCPサーバーのコールドスタート時

### 影響

- **パフォーマンス**: リクエストごとの接続オーバーヘッド
- **レイテンシ**: 初回接続時の遅延
- **スケーラビリティ**: 同時接続数の増加

## 推奨される対策

### 注意事項

Cloud Run のステートレス環境では、伝統的なコネクションプールは効果が限定的です。
以下の対策は、環境の特性を考慮して選択してください。

1. **リクエストスコープの接続再利用**

```typescript
// middleware/mcpConnectionScope.ts
import type { Context, Next } from "hono";

const connectionCache = new Map<string, { client: Client; lastUsed: number }>();

export const mcpConnectionScope = async (c: Context, next: Next) => {
  // リクエスト内での接続を管理
  const connections = new Map<string, Client>();
  c.set("mcpConnections", connections);

  try {
    await next();
  } finally {
    // リクエスト終了時にすべての接続をクローズ
    for (const client of connections.values()) {
      await client.close().catch(() => {});
    }
  }
};

export const getOrCreateConnection = async (
  c: Context,
  templateId: string,
  createFn: () => Promise<Client>,
): Promise<Client> => {
  const connections = c.get("mcpConnections") as Map<string, Client>;

  if (connections.has(templateId)) {
    return connections.get(templateId)!;
  }

  const client = await createFn();
  connections.set(templateId, client);
  return client;
};
```

2. **グローバル接続プール（注意が必要）**

```typescript
// libs/mcp/connectionPool.ts
type PooledConnection = {
  client: Client;
  templateId: string;
  userId: string;
  createdAt: number;
  lastUsedAt: number;
  inUse: boolean;
};

class McpConnectionPool {
  private connections = new Map<string, PooledConnection>();
  private readonly maxIdleTimeMs = 60000; // 1分
  private readonly maxPoolSize = 50;

  async acquire(
    templateId: string,
    userId: string,
    createFn: () => Promise<Client>,
  ): Promise<Client> {
    const key = `${templateId}:${userId}`;

    // 既存の接続を探す
    const existing = this.connections.get(key);
    if (existing && !existing.inUse) {
      existing.inUse = true;
      existing.lastUsedAt = Date.now();
      return existing.client;
    }

    // 新しい接続を作成
    const client = await createFn();
    this.connections.set(key, {
      client,
      templateId,
      userId,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      inUse: true,
    });

    // プールサイズを管理
    this.cleanup();

    return client;
  }

  release(templateId: string, userId: string): void {
    const key = `${templateId}:${userId}`;
    const conn = this.connections.get(key);
    if (conn) {
      conn.inUse = false;
      conn.lastUsedAt = Date.now();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, conn] of this.connections) {
      if (!conn.inUse && now - conn.lastUsedAt > this.maxIdleTimeMs) {
        conn.client.close().catch(() => {});
        this.connections.delete(key);
      }
    }
  }
}

export const connectionPool = new McpConnectionPool();
```

3. **HTTP Keep-Alive の活用**

```typescript
// Streamable HTTPS では HTTP/2 の接続再利用を活用
transport = new StreamableHTTPClientTransport(new URL(url), {
  requestInit: {
    headers,
    // HTTP Agent with keep-alive
    agent: new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 60000,
      maxSockets: 10,
    }),
  },
});
```

4. **接続のウォームアップ**

```typescript
// 起動時によく使われるMCPサーバーへの接続を事前確立
const warmupConnections = async () => {
  const frequentServers = await getFrequentlyUsedServers();
  for (const server of frequentServers) {
    try {
      const client = await connectToMcpServer(server, "warmup", "warmup", null);
      // プールに追加
      connectionPool.add(server.id, client);
    } catch (error) {
      logWarning("Warmup connection failed", { serverId: server.id });
    }
  }
};
```

5. **メトリクス収集**

```typescript
// 接続の統計を収集して最適化の判断材料に
const connectionMetrics = {
  created: 0,
  reused: 0,
  avgConnectionTimeMs: 0,
};

// 定期的にログ出力
setInterval(() => {
  logInfo("Connection pool metrics", connectionMetrics);
}, 60000);
```

## 関連ファイル

- `apps/mcp-proxy/src/services/mcpConnection.ts`
- `apps/mcp-proxy/src/handlers/mcpHandler.ts`
- `apps/mcp-proxy/src/services/toolExecutor.ts`
