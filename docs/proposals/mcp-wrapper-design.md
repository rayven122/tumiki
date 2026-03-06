# mcp-wrapper アプリ設計書

**作成日**: 2026-03-06
**更新日**: 2026-03-06
**対象**: `apps/mcp-wrapper`
**アーキテクチャ**: DDD + CQRS + Vertical Slice（mcp-proxy と同じ）

---

## 1. 概要

### 1.1 目的

単一のHTTPサーバーで複数のstdio MCPサーバーを動的に起動・管理し、100+のMCPサーバーをサポートする。

### 1.2 スコープ

**対象: 環境変数ベースの MCP サーバーのみ**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    サポート対象の判定                                │
│                                                                     │
│  ✅ 対象（環境変数ベース）約 90%+                                   │
│  ├── API キーを環境変数で受け取る                                   │
│  ├── 例: DEEPL_API_KEY, BRAVE_API_KEY, GITHUB_TOKEN                │
│  └── npx -y <package> で起動可能                                   │
│                                                                     │
│  ❌ 対象外（ファイルベース/OAuth）約 10%未満                        │
│  ├── OAuth トークンをファイルに保存                                 │
│  ├── credentials.json などの設定ファイルが必要                      │
│  └── → 既存の SSE/HTTPS (Cloud Run) で対応                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**理由**: 同一 VM で複数組織のプロセスが動作する際、ファイルシステムの分離が必要になるため。環境変数ベースはメモリ分離（プロセス分離）で十分安全。

### 1.3 主要機能

| 機能 | 説明 |
|------|------|
| 動的プロセス起動 | リクエスト時にMCPサーバープロセスをオンデマンド起動 |
| プロセスプール | 最大N個のプロセスを管理、LRU eviction |
| ヘッダー→環境変数変換 | `headerEnvMappings` に基づきHTTPヘッダーを環境変数に変換 |
| JSON-RPC転送 | HTTP→stdio→HTTP の双方向変換 |
| 組織対応（将来） | 組織ごとのカスタム MCP サーバーをサポート |

### 1.4 アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────────┐
│                        リクエストフロー                              │
│                                                                     │
│  Claude Desktop / Client                                            │
│       │                                                             │
│       ▼                                                             │
│  mcp-proxy (認証・ルーティング) ← Sakura Cloud VM 1                 │
│       │                                                             │
│       │  HTTP (VPC内通信 ~1ms)                                      │
│       ▼                                                             │
│  mcp-wrapper (プロセス管理) ← Sakura Cloud VM 2                     │
│       │                                                             │
│       │  stdio                                                      │
│       ▼                                                             │
│  MCP サーバープロセス (npx -y <package>)                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

メリット:
- mcp-proxy は純粋な「プロキシ」として命名と責務が一致
- stdio プロセスを専用 VM に隔離可能
- CPU/メモリ負荷の分散
- VPC 内通信のオーバーヘッドは ~1ms で無視可能
```

### 1.5 カタログとの連携

mcp-wrapper は `@tumiki/db` を使用して DB を直接参照（REST API 不要）：

```
┌─────────────────────────────────────────────────────────────────────┐
│                        カタログ連携                                  │
│                                                                     │
│  mcp-wrapper                         PostgreSQL                     │
│       │                                │                            │
│       │  db.mcpCatalogEntry.findUnique │                            │
│       │  ({ where: { name: "deepl" }}) │                            │
│       │ ──────────────────────────────▶│                            │
│       │                                │                            │
│       │  {                             │                            │
│       │    name: "deepl",              │                            │
│       │    command: "npx",             │                            │
│       │    args: ["-y", "deepl-mcp"],  │                            │
│       │    headerEnvMappings: [        │                            │
│       │      { header: "X-DeepL-Key",  │                            │
│       │        env: "DEEPL_API_KEY" }  │                            │
│       │    ]                           │                            │
│       │  }                             │                            │
│       │ ◀──────────────────────────────│                            │
│       │                                │                            │
└───────┴────────────────────────────────┴────────────────────────────┘

メリット:
- REST API 不要（実装・保守コスト削減）
- 認証トークン管理不要
- ネットワーク通信不要（レイテンシ改善）
```

### 1.6 セキュリティモデル

```
┌─────────────────────────────────────────────────────────────────────┐
│                        セキュリティ                                  │
│                                                                     │
│  【メモリ分離】 ✅ 安全                                             │
│  ├── 各プロセスは独立した Node.js プロセス                          │
│  ├── メモリは完全に分離                                             │
│  └── 組織 A のデータに組織 B はアクセス不可                         │
│                                                                     │
│  【ファイルシステム】 ⚠️ 環境変数ベースのみ対象とすることで回避     │
│  ├── 環境変数ベース → ファイル書き込みなし → 安全                   │
│  └── ファイルベース → 対象外（Cloud Run で対応）                    │
│                                                                     │
│  【API キーの受け渡し】                                              │
│  ├── HTTP ヘッダーで受け取り                                        │
│  ├── 環境変数に変換してプロセスに注入                               │
│  └── ログには出力しない                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. アーキテクチャ

### 2.1 レイヤー構成（mcp-proxy と同じ）

```
domain/          純粋ドメイン（外部依存なし）
  ↑
shared/          横断的関心事（domain/ のみ依存可）
  ↑
infrastructure/  外部サービスアダプタ（domain/, shared/ に依存可）
  ↑
features/        Vertical Slice（全レイヤーに依存可、feature間依存禁止）
```

### 2.2 ディレクトリ構造

```
apps/mcp-wrapper/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                      # サーバー起動 + シャットダウン
│   ├── app.ts                        # Hono app 作成・ルートマウント
│   │
│   ├── domain/
│   │   ├── types/
│   │   │   └── mcpServer.ts          # McpServerConfig 型
│   │   ├── values/
│   │   │   └── processKey.ts         # ProcessKey 値オブジェクト
│   │   ├── errors/
│   │   │   ├── domainError.ts        # DomainError 基底
│   │   │   ├── serverNotFoundError.ts
│   │   │   └── processError.ts
│   │   └── services/
│   │       └── envMapper.ts          # ヘッダー→環境変数変換（純粋関数）
│   │
│   ├── features/
│   │   ├── health/
│   │   │   └── route.ts              # GET /health
│   │   ├── status/
│   │   │   └── route.ts              # GET /status
│   │   └── mcp/
│   │       ├── route.ts              # POST /mcp/:serverName
│   │       ├── mcpRequestHandler.ts
│   │       ├── commands/
│   │       │   └── forwardRequest/
│   │       │       ├── forwardRequestCommand.ts
│   │       │       └── __tests__/
│   │       └── queries/
│   │           └── getServerConfig/
│   │               ├── getServerConfigQuery.ts
│   │               └── __tests__/
│   │
│   ├── infrastructure/
│   │   ├── db/
│   │   │   └── repositories/
│   │   │       └── mcpServerTemplateRepository.ts
│   │   └── process/
│   │       ├── processPool.ts        # プロセスプール管理
│   │       ├── mcpProcess.ts         # MCPプロセス管理
│   │       └── __tests__/
│   │
│   └── shared/
│       ├── constants/
│       │   └── config.ts             # 設定定数
│       ├── errors/
│       │   └── errorHandler.ts       # エラーハンドリング
│       ├── logger/
│       │   └── index.ts
│       └── types/
│           └── honoEnv.ts            # HonoEnv 型
│
└── vitest.config.ts
```

---

## 3. Domain Layer

### 3.1 Types

`src/domain/types/mcpServer.ts`

```typescript
/**
 * MCPサーバー設定
 * McpServerTemplate から取得した実行に必要な情報
 */
export type McpServerConfig = {
  readonly id: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly envVarKeys: readonly string[];
};
```

### 3.2 Values

`src/domain/values/processKey.ts`

```typescript
import { createHash } from "node:crypto";

/**
 * プロセスキー値オブジェクト
 * serverName + 環境変数ハッシュで一意に識別
 */
export type ProcessKey = {
  readonly value: string;
  readonly serverName: string;
  readonly envHash: string;
};

/**
 * プロセスキーを生成
 */
export const createProcessKey = (
  serverName: string,
  env: Record<string, string>,
): ProcessKey => {
  const sortedEnv = Object.entries(env)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(";");

  const envHash = createHash("sha256")
    .update(sortedEnv)
    .digest("hex")
    .slice(0, 8);

  return {
    value: `${serverName}:${envHash}`,
    serverName,
    envHash,
  };
};
```

### 3.3 Errors

`src/domain/errors/domainError.ts`

```typescript
/**
 * ドメインエラー基底クラス
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
```

`src/domain/errors/serverNotFoundError.ts`

```typescript
import { DomainError } from "./domainError.js";

export class ServerNotFoundError extends DomainError {
  readonly code = "SERVER_NOT_FOUND";

  constructor(serverName: string) {
    super(`MCP server not found: ${serverName}`);
  }
}
```

`src/domain/errors/processError.ts`

```typescript
import { DomainError } from "./domainError.js";

export class ProcessStartError extends DomainError {
  readonly code = "PROCESS_START_ERROR";

  constructor(serverName: string, cause: string) {
    super(`Failed to start process for ${serverName}: ${cause}`);
  }
}

export class ProcessTimeoutError extends DomainError {
  readonly code = "PROCESS_TIMEOUT";

  constructor(serverName: string) {
    super(`Request timeout for ${serverName}`);
  }
}
```

### 3.4 Services

`src/domain/services/envMapper.ts`

```typescript
/**
 * HTTPヘッダーを環境変数に変換（純粋関数）
 *
 * envVarKeys に指定されたヘッダー名から値を取得し、
 * 同名の環境変数として返す
 *
 * @example
 * envVarKeys = ["X-DeepL-API-Key"]
 * headers = { "x-deepl-api-key": "xxx" }
 * => { "X-DeepL-API-Key": "xxx" }
 */
export const mapHeadersToEnv = (
  headers: Record<string, string | undefined>,
  envVarKeys: readonly string[],
): Record<string, string> => {
  const env: Record<string, string> = {};

  for (const key of envVarKeys) {
    // ヘッダー名は小文字で正規化されている
    const value = headers[key.toLowerCase()];
    if (value) {
      // 環境変数名はenvVarKeysそのまま使用
      env[key] = value;
    }
  }

  return env;
};
```

---

## 4. Infrastructure Layer

### 4.1 Repository

`src/infrastructure/db/repositories/mcpServerTemplateRepository.ts`

```typescript
import { db, TransportType } from "@tumiki/db/server";
import type { McpServerConfig } from "../../../domain/types/mcpServer.js";
import { logError, logWarn } from "../../../shared/logger/index.js";

// 公式テンプレートの組織ID
const OFFICIAL_ORGANIZATION_ID = "official";

/**
 * STDIO MCPサーバーテンプレートを名前で取得
 */
export const getStdioServerByName = async (
  normalizedName: string,
): Promise<McpServerConfig | null> => {
  try {
    const template = await db.mcpServerTemplate.findFirst({
      where: {
        normalizedName,
        transportType: TransportType.STDIO,
        organizationId: OFFICIAL_ORGANIZATION_ID,
      },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        command: true,
        args: true,
        envVarKeys: true,
      },
    });

    if (!template) {
      logWarn("STDIO server template not found", { normalizedName });
      return null;
    }

    if (!template.command) {
      logWarn("STDIO server has no command", { normalizedName });
      return null;
    }

    return {
      id: template.id,
      name: template.name,
      normalizedName: template.normalizedName,
      command: template.command,
      args: template.args,
      envVarKeys: template.envVarKeys,
    };
  } catch (error) {
    logError("Failed to get STDIO server template", error as Error, {
      normalizedName,
    });
    throw error;
  }
};
```

### 4.2 ProcessPool

`src/infrastructure/process/processPool.ts`

```typescript
import { McpProcess } from "./mcpProcess.js";
import type { McpServerConfig } from "../../domain/types/mcpServer.js";
import { createProcessKey, type ProcessKey } from "../../domain/values/processKey.js";
import { logInfo, logWarn } from "../../shared/logger/index.js";
import { config } from "../../shared/constants/config.js";

export class ProcessPool {
  private processes = new Map<string, McpProcess>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * プロセスを取得または作成
   */
  async getOrCreate(
    serverConfig: McpServerConfig,
    env: Record<string, string>,
  ): Promise<McpProcess> {
    const processKey = createProcessKey(serverConfig.normalizedName, env);

    // 既存プロセスがあれば再利用
    const existing = this.processes.get(processKey.value);
    if (existing && existing.isAlive()) {
      existing.touch();
      return existing;
    }

    // プール満杯なら古いプロセスを削除
    if (this.processes.size >= config.maxProcesses) {
      await this.evictLRU();
    }

    // 新規プロセス起動
    logInfo("Starting new MCP process", {
      serverName: serverConfig.normalizedName,
      processKey: processKey.value,
    });

    const process = new McpProcess(serverConfig, env);
    await process.spawn();
    this.processes.set(processKey.value, process);

    return process;
  }

  /**
   * 最も古い未使用プロセスを削除（LRU）
   */
  private async evictLRU(): Promise<void> {
    let oldest: { key: string; process: McpProcess } | null = null;

    for (const [key, process] of this.processes) {
      if (!process.isBusy()) {
        if (!oldest || process.lastUsedAt < oldest.process.lastUsedAt) {
          oldest = { key, process };
        }
      }
    }

    if (oldest) {
      logInfo("Evicting LRU process", { key: oldest.key });
      await oldest.process.kill();
      this.processes.delete(oldest.key);
    }
  }

  /**
   * アイドルプロセスのクリーンアップ
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now();
      for (const [key, process] of this.processes) {
        if (
          now - process.lastUsedAt > config.idleTimeoutMs &&
          !process.isBusy()
        ) {
          logInfo("Cleaning up idle process", { key });
          await process.kill();
          this.processes.delete(key);
        }
      }
    }, 60 * 1000);
  }

  /**
   * プール状態を取得
   */
  getStatus(): {
    size: number;
    maxSize: number;
    processes: { name: string; status: string; lastUsedAt: number }[];
  } {
    return {
      size: this.processes.size,
      maxSize: config.maxProcesses,
      processes: Array.from(this.processes.values()).map((p) => ({
        name: p.serverName,
        status: p.getStatus(),
        lastUsedAt: p.lastUsedAt,
      })),
    };
  }

  /**
   * シャットダウン
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    const promises = Array.from(this.processes.values()).map((p) => p.kill());
    await Promise.all(promises);
    this.processes.clear();
  }
}

// シングルトン
export const processPool = new ProcessPool();
```

### 4.3 McpProcess

`src/infrastructure/process/mcpProcess.ts`

```typescript
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { McpServerConfig } from "../../domain/types/mcpServer.js";
import { ProcessStartError, ProcessTimeoutError } from "../../domain/errors/processError.js";
import { logInfo, logError } from "../../shared/logger/index.js";
import { config } from "../../shared/constants/config.js";

type ProcessStatus = "starting" | "ready" | "busy" | "stopping" | "stopped";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id?: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

type PendingRequest = {
  resolve: (response: JsonRpcResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

export class McpProcess {
  readonly serverName: string;
  private serverConfig: McpServerConfig;
  private env: Record<string, string>;
  private process: ChildProcess | null = null;
  private status: ProcessStatus = "stopped";
  private pendingRequests = new Map<string | number, PendingRequest>();
  private buffer = "";

  lastUsedAt: number = Date.now();

  constructor(serverConfig: McpServerConfig, env: Record<string, string>) {
    this.serverName = serverConfig.normalizedName;
    this.serverConfig = serverConfig;
    this.env = env;
  }

  /**
   * プロセスを起動
   */
  async spawn(): Promise<void> {
    this.status = "starting";

    const { command, args } = this.serverConfig;

    this.process = spawn(command, [...args], {
      env: { ...process.env, ...this.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    // stdout からJSON-RPCレスポンスを読み取り
    this.process.stdout?.on("data", (data: Buffer) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    // エラーハンドリング
    this.process.stderr?.on("data", (data: Buffer) => {
      logError(`[${this.serverName}] stderr`, new Error(data.toString()));
    });

    this.process.on("exit", (code) => {
      this.status = "stopped";
      // 未解決のリクエストをreject
      for (const { reject, timeout } of this.pendingRequests.values()) {
        clearTimeout(timeout);
        reject(new Error(`Process exited with code ${code}`));
      }
      this.pendingRequests.clear();
    });

    this.process.on("error", (err) => {
      this.status = "stopped";
      throw new ProcessStartError(this.serverName, err.message);
    });

    // initialize リクエストで準備完了を確認
    await this.initialize();
    this.status = "ready";
    logInfo("MCP process ready", { serverName: this.serverName });
  }

  /**
   * MCPサーバーを初期化
   */
  private async initialize(): Promise<void> {
    const initRequest: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: randomUUID(),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "tumiki-mcp-wrapper", version: "1.0.0" },
      },
    };

    await this.sendRequest(initRequest);

    // initialized 通知を送信
    this.writeToStdin({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
  }

  /**
   * JSON-RPCリクエストを送信
   */
  async sendRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!this.process || this.status === "stopped") {
      throw new Error("Process not running");
    }

    this.touch();

    const id = request.id ?? randomUUID();
    const requestWithId = { ...request, id };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new ProcessTimeoutError(this.serverName));
      }, config.requestTimeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.writeToStdin(requestWithId);
    });
  }

  /**
   * stdoutバッファを処理
   */
  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const response = JSON.parse(line) as JsonRpcResponse;
        if (response.id !== undefined) {
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(response.id);
            pending.resolve(response);
          }
        }
      } catch {
        logError(`[${this.serverName}] Invalid JSON`, new Error(line));
      }
    }
  }

  /**
   * stdinに書き込み
   */
  private writeToStdin(data: unknown): void {
    this.process?.stdin?.write(JSON.stringify(data) + "\n");
  }

  /**
   * 最終使用時刻を更新
   */
  touch(): void {
    this.lastUsedAt = Date.now();
  }

  isAlive(): boolean {
    return this.status === "ready" || this.status === "busy";
  }

  isBusy(): boolean {
    return this.pendingRequests.size > 0;
  }

  getStatus(): ProcessStatus {
    return this.status;
  }

  /**
   * プロセスを終了
   */
  async kill(): Promise<void> {
    if (this.process && this.status !== "stopped") {
      this.status = "stopping";
      this.process.kill("SIGTERM");

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.process?.kill("SIGKILL");
          resolve();
        }, 3000);

        this.process?.on("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.status = "stopped";
    }
  }
}
```

---

## 5. Features Layer

### 5.1 MCP Feature

#### Query: getServerConfig

`src/features/mcp/queries/getServerConfig/getServerConfigQuery.ts`

```typescript
import type { McpServerConfig } from "../../../../domain/types/mcpServer.js";
import { ServerNotFoundError } from "../../../../domain/errors/serverNotFoundError.js";
import { getStdioServerByName } from "../../../../infrastructure/db/repositories/mcpServerTemplateRepository.js";

export type GetServerConfigQuery = {
  readonly serverName: string;
};

/**
 * MCPサーバー設定を取得
 */
export const getServerConfigQuery = async (
  query: GetServerConfigQuery,
): Promise<McpServerConfig> => {
  const config = await getStdioServerByName(query.serverName);

  if (!config) {
    throw new ServerNotFoundError(query.serverName);
  }

  return config;
};
```

#### Command: forwardRequest

`src/features/mcp/commands/forwardRequest/forwardRequestCommand.ts`

```typescript
import { processPool } from "../../../../infrastructure/process/processPool.js";
import { mapHeadersToEnv } from "../../../../domain/services/envMapper.js";
import type { McpServerConfig } from "../../../../domain/types/mcpServer.js";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id?: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export type ForwardRequestCommand = {
  readonly serverConfig: McpServerConfig;
  readonly headers: Record<string, string | undefined>;
  readonly request: JsonRpcRequest;
};

/**
 * JSON-RPCリクエストをMCPプロセスに転送
 */
export const forwardRequestCommand = async (
  command: ForwardRequestCommand,
): Promise<JsonRpcResponse> => {
  const { serverConfig, headers, request } = command;

  // ヘッダーを環境変数に変換
  const env = mapHeadersToEnv(headers, serverConfig.envVarKeys);

  // プロセスを取得または起動
  const mcpProcess = await processPool.getOrCreate(serverConfig, env);

  // リクエストを転送
  const response = await mcpProcess.sendRequest(request);

  return response;
};
```

#### Route

`src/features/mcp/route.ts`

```typescript
import { Hono } from "hono";
import { mcpRequestHandler } from "./mcpRequestHandler.js";

export const mcpRoute = new Hono();

mcpRoute.post("/:serverName", mcpRequestHandler);
```

#### Handler

`src/features/mcp/mcpRequestHandler.ts`

```typescript
import type { Context } from "hono";
import { getServerConfigQuery } from "./queries/getServerConfig/getServerConfigQuery.js";
import { forwardRequestCommand } from "./commands/forwardRequest/forwardRequestCommand.js";
import { ServerNotFoundError } from "../../domain/errors/serverNotFoundError.js";
import { DomainError } from "../../domain/errors/domainError.js";
import { logInfo, logError } from "../../shared/logger/index.js";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: unknown;
};

export const mcpRequestHandler = async (c: Context): Promise<Response> => {
  const serverName = c.req.param("serverName");

  logInfo("MCP request received", { serverName });

  try {
    const request = await c.req.json<JsonRpcRequest>();

    // 1. サーバー設定を取得
    const serverConfig = await getServerConfigQuery({ serverName });

    // 2. リクエストを転送
    const response = await forwardRequestCommand({
      serverConfig,
      headers: Object.fromEntries(
        Array.from(c.req.raw.headers.entries()),
      ),
      request,
    });

    return c.json(response);
  } catch (error) {
    if (error instanceof ServerNotFoundError) {
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32001, message: error.message },
        },
        404,
      );
    }

    if (error instanceof DomainError) {
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32000, message: error.message },
        },
        500,
      );
    }

    logError("Unexpected error in MCP handler", error as Error, { serverName });
    throw error;
  }
};
```

### 5.2 Health Feature

`src/features/health/route.ts`

```typescript
import { Hono } from "hono";

export const healthRoute = new Hono();

healthRoute.get("/", (c) => {
  return c.json({ status: "ok" });
});
```

### 5.3 Status Feature

`src/features/status/route.ts`

```typescript
import { Hono } from "hono";
import { processPool } from "../../infrastructure/process/processPool.js";

export const statusRoute = new Hono();

statusRoute.get("/", (c) => {
  return c.json(processPool.getStatus());
});
```

---

## 6. Shared Layer

### 6.1 Config

`src/shared/constants/config.ts`

```typescript
export const config = {
  port: parseInt(process.env.PORT ?? "8080", 10),
  maxProcesses: parseInt(process.env.MAX_PROCESSES ?? "20", 10),
  idleTimeoutMs: parseInt(process.env.IDLE_TIMEOUT_MS ?? "300000", 10),
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS ?? "60000", 10),
} as const;
```

### 6.2 Logger

`src/shared/logger/index.ts`

```typescript
export const logInfo = (message: string, meta?: Record<string, unknown>) => {
  console.log(JSON.stringify({ level: "info", message, ...meta, time: new Date().toISOString() }));
};

export const logWarn = (message: string, meta?: Record<string, unknown>) => {
  console.warn(JSON.stringify({ level: "warn", message, ...meta, time: new Date().toISOString() }));
};

export const logError = (message: string, error: Error, meta?: Record<string, unknown>) => {
  console.error(JSON.stringify({
    level: "error",
    message,
    error: error.message,
    stack: error.stack,
    ...meta,
    time: new Date().toISOString(),
  }));
};
```

---

## 7. App & Entry Point

### 7.1 app.ts

```typescript
import { Hono } from "hono";
import { healthRoute } from "./features/health/route.js";
import { statusRoute } from "./features/status/route.js";
import { mcpRoute } from "./features/mcp/route.js";

export const createApp = () => {
  const app = new Hono();

  app.route("/health", healthRoute);
  app.route("/status", statusRoute);
  app.route("/mcp", mcpRoute);

  return app;
};
```

### 7.2 index.ts

```typescript
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { processPool } from "./infrastructure/process/processPool.js";
import { config } from "./shared/constants/config.js";
import { logInfo } from "./shared/logger/index.js";

const app = createApp();

const server = serve({
  fetch: app.fetch,
  port: config.port,
});

logInfo("mcp-wrapper started", { port: config.port });

// Graceful shutdown
const shutdown = async () => {
  logInfo("Shutting down...");
  await processPool.shutdown();
  server.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

---

## 8. 実装タスク

### Phase 1: プロジェクトセットアップ（1日）

- [ ] `apps/mcp-wrapper` ディレクトリ作成
- [ ] `package.json`, `tsconfig.json` 設定
- [ ] ESLint 設定（レイヤー依存ルール）
- [ ] `shared/` 層実装（config, logger）

### Phase 2: Domain層（1日）

- [ ] `domain/types/mcpServer.ts`
- [ ] `domain/values/processKey.ts`
- [ ] `domain/errors/`
- [ ] `domain/services/envMapper.ts`
- [ ] ユニットテスト

### Phase 3: Infrastructure層（3日）

- [ ] `infrastructure/db/repositories/mcpServerTemplateRepository.ts`
- [ ] `infrastructure/process/mcpProcess.ts`
- [ ] `infrastructure/process/processPool.ts`
- [ ] ユニットテスト

### Phase 4: Features層 + 統合（2日）

- [ ] `features/health/route.ts`
- [ ] `features/status/route.ts`
- [ ] `features/mcp/` 全体
- [ ] `app.ts`, `index.ts`
- [ ] 統合テスト

---

## 9. 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `PORT` | HTTPサーバーポート | `8080` |
| `MAX_PROCESSES` | 最大プロセス数 | `20` |
| `IDLE_TIMEOUT_MS` | アイドルタイムアウト(ms) | `300000` |
| `REQUEST_TIMEOUT_MS` | リクエストタイムアウト(ms) | `60000` |
| `DATABASE_URL` | DB接続文字列 | - |

---

## 10. API仕様

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/health` | GET | ヘルスチェック |
| `/status` | GET | プロセスプール状態 |
| `/mcp/:serverName` | POST | MCPリクエスト転送 |

---

## 11. カタログエントリ設計

### 11.1 サポート対象の判定基準

MCP サーバーをカタログに登録する際の判定基準：

| 条件 | 登録可否 |
|------|---------|
| API キーを環境変数で受け取る | ✅ 登録可能 |
| `npx -y <package>` で起動可能 | ✅ 登録可能 |
| OAuth トークンをファイルに保存 | ❌ 登録不可 |
| credentials.json 等が必要 | ❌ 登録不可 |
| ローカルファイルアクセスが必要 | ❌ 登録不可 |

### 11.2 カタログエントリ例

```json
[
  {
    "name": "deepl",
    "displayName": "DeepL Translator",
    "command": "npx",
    "args": ["-y", "deepl-mcp-server"],
    "headerEnvMappings": [
      { "header": "X-DeepL-API-Key", "env": "DEEPL_API_KEY" }
    ],
    "tags": ["translation", "language"]
  },
  {
    "name": "brave-search",
    "displayName": "Brave Search",
    "command": "npx",
    "args": ["-y", "@anthropics/mcp-server-brave-search"],
    "headerEnvMappings": [
      { "header": "X-Brave-API-Key", "env": "BRAVE_API_KEY" }
    ],
    "tags": ["search", "web"]
  },
  {
    "name": "github",
    "displayName": "GitHub",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "headerEnvMappings": [
      { "header": "X-GitHub-Token", "env": "GITHUB_PERSONAL_ACCESS_TOKEN" }
    ],
    "tags": ["git", "development"]
  },
  {
    "name": "postgres",
    "displayName": "PostgreSQL",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres"],
    "headerEnvMappings": [
      { "header": "X-Database-URL", "env": "DATABASE_URL" }
    ],
    "tags": ["database", "sql"]
  }
]
```

### 11.3 サポート可能な MCP サーバー一覧（環境変数ベース）

| パッケージ | 環境変数 | カテゴリ |
|-----------|---------|---------|
| `deepl-mcp-server` | `DEEPL_API_KEY` | 翻訳 |
| `@anthropics/mcp-server-brave-search` | `BRAVE_API_KEY` | 検索 |
| `@modelcontextprotocol/server-github` | `GITHUB_PERSONAL_ACCESS_TOKEN` | 開発 |
| `@modelcontextprotocol/server-postgres` | `DATABASE_URL` | データベース |
| `@modelcontextprotocol/server-redis` | `REDIS_URL` | データベース |
| `@modelcontextprotocol/server-slack` | `SLACK_BOT_TOKEN` | コミュニケーション |
| `openai-mcp-server` | `OPENAI_API_KEY` | AI |
| `@anthropics/mcp-server-fetch` | (なし) | ユーティリティ |
| `@modelcontextprotocol/server-memory` | (なし) | ユーティリティ |
| `@modelcontextprotocol/server-puppeteer` | (なし) | ブラウザ |

---

## 12. 組織対応（将来拡張）

### 12.1 概要

将来的に組織ごとのカスタム MCP サーバーをサポート：

```
┌─────────────────────────────────────────────────────────────────────┐
│                    組織カスタム MCP サーバー                         │
│                                                                     │
│  リクエスト:                                                         │
│  POST /mcp/my-custom-server                                         │
│  Headers:                                                           │
│    X-Organization-Id: org_abc123                                    │
│    X-API-Key: user-key-xxx                                          │
│                                                                     │
│  検索順序:                                                           │
│  1. 組織のカスタムテンプレート (organizationId = org_abc123)        │
│  2. 公式テンプレート (organizationId = 'official')                  │
│                                                                     │
│  → 組織カスタムが公式を上書き可能                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 12.2 必要な変更（将来実装時）

```typescript
// 1. リポジトリの拡張
export const getStdioServerByName = async (
  normalizedName: string,
  organizationId?: string,  // ← 追加
): Promise<McpServerConfig | null> => {
  // 組織のカスタムテンプレートを優先検索
  if (organizationId) {
    const orgTemplate = await findByNameAndOrg(normalizedName, organizationId);
    if (orgTemplate) return orgTemplate;
  }
  // 公式テンプレートにフォールバック
  return findByNameAndOrg(normalizedName, OFFICIAL_ORGANIZATION_ID);
};

// 2. ProcessKey に組織 ID を含める
const processKey = createProcessKey(
  serverConfig.normalizedName,
  organizationId,  // ← 追加
  env,
);
// → "org_A:deepl:abc123"（組織ごとに別プロセス）

// 3. mcp-proxy が X-Organization-Id ヘッダーを付与
// mcp-proxy 側の変更が必要
```

### 12.3 セキュリティ考慮事項

| 項目 | 現在の設計 | 組織対応時 |
|------|-----------|-----------|
| メモリ分離 | ✅ プロセス分離 | ✅ 組織ごとに別プロセス |
| ファイル分離 | N/A（環境変数ベースのみ） | N/A（環境変数ベースのみ） |
| API キー漏洩 | ✅ ログ出力しない | ✅ 同様 |

---

## 13. 参照ドキュメント

| ドキュメント | 場所 |
|-------------|------|
| カタログ API 設計書 | `docs/proposals/catalog-api-design.md` |
| 引き継ぎ資料 | `docs/proposals/universal-mcp-wrapper-handoff.md` |
| mcp-proxy アーキテクチャ | `tumiki-mcp-proxy-architecture` スキル |
