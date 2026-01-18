---
apps:
  - mcp-proxy
severity: medium
difficulty: medium
---

# MCPクライアント接続のリソースリーク

## 概要

MCPクライアント接続のエラー発生時に `client.close()` が呼ばれず、リソースリークが発生する可能性。

## 重大度

中

## 影響範囲

- `apps/mcp-proxy/src/services/mcpConnection.ts`
- `apps/mcp-proxy/src/handlers/mcpHandler.ts`
- `apps/mcp-proxy/src/services/toolExecutor.ts`

## 詳細

### 現状

`mcpConnection.ts:17-112` で、MCPクライアントの接続処理を実装:

```typescript
export const connectToMcpServer = async (
  mcpServerTemplate: McpServerTemplate,
  userId: string,
  mcpServerTemplateInstanceId: string,
  mcpConfig: McpConfig | null,
): Promise<Client> => {
  // ...
  try {
    // トランスポート作成
    let transport;
    // ...

    // クライアントを作成して接続
    const client = new Client(
      {
        name: `tumiki-mcp-proxy-${name}`,
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    await client.connect(transport);
    // ...
    return client;
  } catch (error) {
    logError("Failed to connect to MCP server", error as Error, {
      templateName: name,
      transportType,
    });
    throw new Error(
      `Failed to connect to MCP server ${name}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    // ここで client.close() が呼ばれていない
  }
};
```

### 問題点

1. **接続エラー時のリソースリーク**
   - `client.connect(transport)` 後にエラーが発生した場合、クライアントがクローズされない
   - トランスポートのリソース（ソケット、HTTP接続など）が解放されない

2. **呼び出し側でのエラーハンドリング不足**
   - `mcpHandler.ts` や `toolExecutor.ts` でエラー発生時にクライアントをクローズする処理が不明確

3. **Cloud Run環境での影響**
   - ステートレス環境では各リクエストで新しい接続を作成
   - リソースリークが蓄積するとメモリ不足やファイルディスクリプタ枯渇の可能性
   - コンテナのスケールアウト時にリソース消費が増加

4. **長時間実行中の接続**
   - MCP SDKの接続が予期せず切断された場合の再接続処理がない

### 影響

- **リソース枯渇**: メモリ、ファイルディスクリプタ、ソケットのリーク
- **パフォーマンス低下**: リソース不足によるリクエスト処理の遅延
- **信頼性低下**: リソース枯渇によるサービス障害

## 推奨される対策

1. **try-finally パターンの使用**

```typescript
export const connectToMcpServer = async (
  mcpServerTemplate: McpServerTemplate,
  userId: string,
  mcpServerTemplateInstanceId: string,
  mcpConfig: McpConfig | null,
): Promise<Client> => {
  const { transportType, name, authType } = mcpServerTemplate;

  let client: Client | null = null;
  let transport: Transport | null = null;

  try {
    // トランスポート作成
    transport = createTransport(mcpServerTemplate, headers);

    // クライアント作成
    client = new Client(
      {
        /* ... */
      },
      {
        /* ... */
      },
    );

    await client.connect(transport);

    return client;
  } catch (error) {
    // エラー時にリソースをクリーンアップ
    if (client) {
      await client.close().catch((closeError) => {
        logError("Failed to close client during error handling", closeError);
      });
    }
    throw new Error(`Failed to connect to MCP server ${name}: ${error}`);
  }
};
```

2. **接続ラッパーの作成**

```typescript
// libs/mcp/connectionWrapper.ts
export class ManagedMcpConnection {
  private client: Client | null = null;

  async connect(template: McpServerTemplate /* ... */): Promise<void> {
    // ...
  }

  async execute<T>(operation: (client: Client) => Promise<T>): Promise<T> {
    if (!this.client) {
      throw new Error("Not connected");
    }
    try {
      return await operation(this.client);
    } finally {
      await this.close();
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close().catch(/* log and ignore */);
      this.client = null;
    }
  }
}
```

3. **使い捨て接続パターン**

```typescript
// handlers/mcpHandler.ts
export const handleMcpRequest = async (/* ... */) => {
  const client = await connectToMcpServer(/* ... */);
  try {
    const result = await client.callTool(toolName, args);
    return result;
  } finally {
    await client.close().catch((error) => {
      logError("Failed to close MCP client", error);
    });
  }
};
```

4. **接続タイムアウトの実装**（#009参照）

```typescript
const connectionPromise = client.connect(transport);
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(
    () => reject(new Error("Connection timeout")),
    TIMEOUT_CONFIG.MCP_CONNECTION_MS,
  );
});

await Promise.race([connectionPromise, timeoutPromise]);
```

5. **ヘルスチェックと自動再接続**

```typescript
// 接続状態の監視
client.on("disconnect", async () => {
  logInfo("MCP connection lost, reconnecting...");
  await reconnect();
});
```

## 関連ファイル

- `apps/mcp-proxy/src/services/mcpConnection.ts`
- `apps/mcp-proxy/src/handlers/mcpHandler.ts`
- `apps/mcp-proxy/src/services/toolExecutor.ts`
- `apps/mcp-proxy/src/services/unifiedMcp/toolExecutor.ts`
