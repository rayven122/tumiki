---
apps:
  - mcp-proxy
severity: medium
difficulty: low
---

# タイムアウト設定の未使用

## 概要

`constants/config.ts` で定義されているタイムアウト定数が実際のMCP接続処理で使用されておらず、無限待機の可能性がある。

## 重大度

中

## 影響範囲

- `apps/mcp-proxy/src/constants/config.ts`
- `apps/mcp-proxy/src/services/mcpConnection.ts`
- `apps/mcp-proxy/src/handlers/mcpHandler.ts`

## 詳細

### 現状

`config.ts:25-36` でタイムアウト設定が定義されている:

```typescript
export const TIMEOUT_CONFIG = {
  /**
   * MCP接続タイムアウト（ミリ秒）
   */
  MCP_CONNECTION_MS: 10000, // 10秒

  /**
   * Graceful Shutdownタイムアウト（ミリ秒）
   * Cloud Runの10秒猶予期間内に収める
   */
  GRACEFUL_SHUTDOWN_MS: 9000, // 9秒
} as const;
```

しかし、`mcpConnection.ts` の接続処理ではこのタイムアウトが使用されていない:

```typescript
export const connectToMcpServer = async (/* ... */): Promise<Client> => {
  // ...
  const client = new Client(/* ... */);

  await client.connect(transport); // タイムアウトなし

  return client;
};
```

### 問題点

1. **接続タイムアウトの欠如**
   - MCPサーバーへの接続が無限に待機する可能性
   - 応答しないサーバーへの接続でリクエストがスタック

2. **ツール実行タイムアウトの欠如**
   - `callTool` の実行時間に制限がない
   - 長時間実行されるツールでリクエストがタイムアウトしない

3. **Cloud Run との不整合**
   - Cloud Run のリクエストタイムアウト（デフォルト300秒）とMCP操作のタイムアウトが独立
   - Cloud Run がリクエストを強制終了しても、MCPクライアントのリソースが解放されない可能性

4. **定数の存在意義**
   - 定義されているが使用されていない定数は、将来の開発者を混乱させる
   - ドキュメントとしての価値がない

### 影響

- **可用性**: 応答しないMCPサーバーによるサービス全体の遅延
- **リソース消費**: タイムアウトしない接続によるリソース占有
- **ユーザー体験**: 長時間の待機によるフラストレーション

## 推奨される対策

1. **接続タイムアウトの実装**

```typescript
import { TIMEOUT_CONFIG } from "../constants/config.js";

export const connectToMcpServer = async (/* ... */): Promise<Client> => {
  // ...
  const client = new Client(/* ... */);

  // タイムアウト付き接続
  const connectionPromise = client.connect(transport);
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            `Connection timeout after ${TIMEOUT_CONFIG.MCP_CONNECTION_MS}ms`,
          ),
        ),
      TIMEOUT_CONFIG.MCP_CONNECTION_MS,
    );
  });

  try {
    await Promise.race([connectionPromise, timeoutPromise]);
  } catch (error) {
    // タイムアウト時にクリーンアップ
    await client.close().catch(() => {});
    throw error;
  }

  return client;
};
```

2. **ツール実行タイムアウトの追加**

```typescript
// constants/config.ts
export const TIMEOUT_CONFIG = {
  MCP_CONNECTION_MS: 10000, // 10秒
  MCP_TOOL_EXECUTION_MS: 60000, // 60秒
  GRACEFUL_SHUTDOWN_MS: 9000, // 9秒
} as const;

// 使用例
const executeWithTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string,
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`${operationName} timeout after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });

  return Promise.race([operation(), timeoutPromise]);
};

// ツール実行
const result = await executeWithTimeout(
  () => client.callTool(toolName, args),
  TIMEOUT_CONFIG.MCP_TOOL_EXECUTION_MS,
  `Tool execution: ${toolName}`,
);
```

3. **AbortController の使用**

```typescript
export const connectToMcpServer = async (
  /* ... */,
  signal?: AbortSignal
): Promise<Client> => {
  // AbortSignal 対応のトランスポート
  transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: {
      headers,
      signal, // AbortSignal を渡す
    },
  });

  // ...
};

// 呼び出し側
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_CONFIG.MCP_CONNECTION_MS);

try {
  const client = await connectToMcpServer(/* ... */, controller.signal);
  clearTimeout(timeoutId);
  return client;
} catch (error) {
  clearTimeout(timeoutId);
  throw error;
}
```

4. **設定の整合性チェック**

```typescript
// 起動時の設定検証
const validateConfig = () => {
  const cloudRunTimeout = Number(process.env.CLOUD_RUN_TIMEOUT_MS) || 300000;

  if (TIMEOUT_CONFIG.MCP_CONNECTION_MS >= cloudRunTimeout) {
    logWarning("MCP connection timeout exceeds Cloud Run timeout", {
      mcpTimeout: TIMEOUT_CONFIG.MCP_CONNECTION_MS,
      cloudRunTimeout,
    });
  }
};
```

## 関連ファイル

- `apps/mcp-proxy/src/constants/config.ts`
- `apps/mcp-proxy/src/services/mcpConnection.ts`
- `apps/mcp-proxy/src/handlers/mcpHandler.ts`
- `apps/mcp-proxy/src/services/toolExecutor.ts`
