---
apps:
  - mcp-proxy
severity: medium
difficulty: medium
---

# リトライ機構の欠如

## 概要

MCPサーバーへの接続やツール実行において、一時的なネットワークエラーやサーバーエラーが発生した場合にリトライする機構がなく、即座に失敗する。

## 重大度

中

## 影響範囲

- `apps/mcp-proxy/src/services/mcpConnection.ts`
- `apps/mcp-proxy/src/services/toolExecutor.ts`
- `apps/mcp-proxy/src/libs/auth/keycloak.ts`

## 詳細

### 現状

`mcpConnection.ts:103-112` で、エラー発生時は即座に例外をスロー:

```typescript
} catch (error) {
  logError("Failed to connect to MCP server", error as Error, {
    templateName: name,
    transportType,
  });
  throw new Error(
    `Failed to connect to MCP server ${name}: ${error instanceof Error ? error.message : "Unknown error"}`,
  );
}
```

`keycloak.ts` でのメタデータ取得も同様にリトライなし:

```typescript
const discoverMetadata = async (): Promise<openidClient.ServerMetadata> => {
  // ...
  const config = await openidClient.discovery(
    new URL(keycloakIssuerUrl),
    "__metadata_only__",
    // ...
  );
  // エラー時のリトライなし
};
```

### 問題点

1. **一時的なエラーでの失敗**
   - ネットワークの瞬断
   - MCPサーバーの一時的な過負荷
   - DNS解決の一時的な失敗
   - TLS ハンドシェイクのタイムアウト

2. **外部サービス依存のリスク**
   - Keycloak への接続失敗
   - Cloud Run MCPサーバーのコールドスタート
   - 外部APIの一時的な503エラー

3. **ユーザー体験の低下**
   - 単発のエラーでリクエスト全体が失敗
   - ユーザーが手動でリトライする必要

4. **カスケード障害のリスク**
   - 一つのMCPサーバーの遅延が全体に波及

### 影響

- **可用性**: 一時的なエラーでサービスが利用不能
- **信頼性**: 断続的な障害による信頼性低下
- **ユーザー体験**: エラー頻度の増加

## 推奨される対策

1. **指数バックオフリトライの実装**

```typescript
// libs/retry.ts
type RetryOptions = {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (error: unknown) => boolean;
};

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableErrors: isRetryableError,
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> => {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxRetries || !opts.retryableErrors?.(error)) {
        throw error;
      }

      logInfo(`Retry attempt ${attempt + 1}/${opts.maxRetries}`, {
        delay,
        error: error instanceof Error ? error.message : String(error),
      });

      await sleep(delay);
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
};

const isRetryableError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("503") ||
      message.includes("502") ||
      message.includes("504")
    );
  }
  return false;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
```

2. **MCP接続でのリトライ適用**

```typescript
import { withRetry } from "../libs/retry.js";

export const connectToMcpServer = async (/* ... */): Promise<Client> => {
  return withRetry(
    async () => {
      const client = new Client(/* ... */);
      await client.connect(transport);
      return client;
    },
    {
      maxRetries: 3,
      initialDelayMs: 500,
      retryableErrors: (error) => {
        // 接続エラーのみリトライ
        return isNetworkError(error);
      },
    },
  );
};
```

3. **Keycloakメタデータ取得のリトライ**

```typescript
const discoverMetadata = async (): Promise<openidClient.ServerMetadata> => {
  return withRetry(
    async () => {
      const config = await openidClient.discovery(/* ... */);
      return config.serverMetadata();
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000, // Keycloakはより長めのディレイ
    },
  );
};
```

4. **サーキットブレーカーパターン**

```typescript
// libs/circuitBreaker.ts
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeMs: number = 30000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.resetTimeMs) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
    }
  }
}
```

5. **リトライ可能エラーの明確化**

```typescript
// errors/retryable.ts
export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "RetryableError";
  }
}

export class NonRetryableError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "NonRetryableError";
  }
}
```

## 関連ファイル

- `apps/mcp-proxy/src/services/mcpConnection.ts`
- `apps/mcp-proxy/src/services/toolExecutor.ts`
- `apps/mcp-proxy/src/libs/auth/keycloak.ts`
- `apps/mcp-proxy/src/libs/auth/jwt-verifier.ts`
