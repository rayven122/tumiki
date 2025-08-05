import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  CallToolRequestSchema,
  CompatibilityCallToolResultSchema,
  ListToolsRequestSchema,
  ListToolsResultSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { db } from "@tumiki/db/tcp";
import { TransportType } from "@tumiki/db";
import { validateApiKey } from "../libs/validateApiKey.js";

import type {
  ServerConfig,
  TransportConfig,
  TransportConfigStdio,
} from "../libs/types.js";
import { config } from "../libs/config.js";
import { recordError, measureExecutionTime } from "../libs/metrics.js";
import { logMcpRequest } from "../libs/requestLogger.js";
import { calculateDataSize } from "../libs/dataCompression.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type ConnectedClient = {
  client: Client;
  cleanup: () => Promise<void>;
  name: string;
  toolNames: string[];
};

/**
 * SSE接続プール管理クラス
 */
export class SSEConnectionPool {
  private activeConnections = 0;
  private totalConnections = 0;

  addConnection(): void {
    this.activeConnections++;
    this.totalConnections++;
  }

  removeConnection(): void {
    if (this.activeConnections > 0) {
      this.activeConnections--;
    }
  }

  getPoolStats() {
    return {
      activeConnections: this.activeConnections,
      totalConnections: this.totalConnections,
    };
  }

  destroy(): void {
    this.activeConnections = 0;
    this.totalConnections = 0;
  }
}

// シングルトンインスタンス
let sseConnectionPool: SSEConnectionPool | null = null;

/**
 * SSE接続プールのシングルトンインスタンスを取得
 */
export const getSSEConnectionPool = (): SSEConnectionPool => {
  if (!sseConnectionPool) {
    sseConnectionPool = new SSEConnectionPool();
  }
  return sseConnectionPool;
};

/**
 * MCP サーバーに接続する(stdio か sse のどちらか)
 * @param server
 * @returns
 */
const createClient = (
  server: ServerConfig,
): { client: Client | undefined; transport: Transport | undefined } => {
  let transport: Transport | null = null;
  try {
    if (server.transport.type === "sse") {
      // Type narrowing: when type is "sse", url is guaranteed to be string
      const sseTransport = server.transport;
      if ("url" in sseTransport && typeof sseTransport.url === "string") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
        transport = new SSEClientTransport(new URL(sseTransport.url));
      } else {
        throw new Error("SSE transport requires a valid URL");
      }
    } else {
      const finalEnv = server.transport.env
        ? Object.fromEntries(
            Object.entries(server.transport.env).map(([key, value]) => [
              key,
              String(value), // DBの値を優先（process.envは使用しない）
            ]),
          )
        : undefined;

      transport = new StdioClientTransport({
        command: server.transport.command,
        args: server.transport.args,
        env: finalEnv,
      });
    }
  } catch {
    recordError("transport_creation_failed");
    return { transport: undefined, client: undefined };
  }

  const client = new Client({
    name: "mcp-proxy-client",
    version: "1.0.0",
  });

  return { client, transport };
};

/**
 * 単一のサーバーに接続する（リトライロジック付き）
 * @param server
 * @returns
 */
const connectToServer = async (
  server: ServerConfig,
): Promise<ConnectedClient | null> => {
  const waitFor = config.retry.delayMs;
  const retries = config.retry.maxAttempts;
  let count = 0;
  let retry = true;

  while (retry) {
    const { client, transport } = createClient(server);
    if (!client || !transport) {
      return null;
    }

    try {
      await client.connect(transport);

      return {
        client,
        name: server.name,
        cleanup: async () => {
          await transport.close();
        },
        toolNames: server.toolNames,
      };
    } catch {
      recordError("server_connection_failed");
      count++;
      retry = count < retries;
      if (retry) {
        try {
          await client.close();
          // transportも確実にクローズする
          await transport.close();
        } catch {
          // クリーンアップ失敗は無視
        } finally {
          // デバッグログを削除（メモリ使用量削減）
          await sleep(waitFor);
        }
      } else {
        // リトライ終了時もtransportをクローズ
        try {
          await transport.close();
        } catch {
          // クリーンアップ失敗は無視
        }
      }
    }
  }

  return null;
};

/**
 * 複数のサーバーに並列で接続する
 * 接続に失敗したら、2.5秒待ってから再接続を試みる
 * 3回失敗したら、そのサーバーはスキップする
 * @param servers
 * @returns
 */
export const createClients = async (
  servers: ServerConfig[],
): Promise<ConnectedClient[]> => {
  // 全てのサーバーに対して並列で接続を試みる
  const connectionPromises = servers.map((server) => connectToServer(server));

  // Promise.allSettledを使用して、全ての接続試行の結果を取得
  const results = await Promise.allSettled(connectionPromises);

  // 成功した接続のみをフィルタリング
  const clients: ConnectedClient[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value !== null) {
      clients.push(result.value);
    } else {
      const server = servers[index];
      if (server) {
      }
    }
  });

  return clients;
};

const getServerConfigs = async (apiKey: string) => {
  // APIキー検証
  const validation = await validateApiKey(apiKey);

  if (!validation.valid) {
    throw new Error(`Invalid API key: ${validation.error}`);
  }

  const { userMcpServerInstance: serverInstance } = validation;

  if (!serverInstance) {
    throw new Error("Server instance not found");
  }

  const serverConfigIds = serverInstance.toolGroup.toolGroupTools.map(
    ({ userMcpServerConfigId }) => userMcpServerConfigId,
  );

  const serverConfigs = await db.userMcpServerConfig.findMany({
    where: {
      id: {
        in: serverConfigIds,
      },
    },
    omit: {
      envVars: false,
    },
    include: {
      mcpServer: true,
    },
  });

  const serverConfigList: ServerConfig[] = serverConfigs.map((serverConfig) => {
    const toolNames = serverInstance.toolGroup.toolGroupTools
      .filter(
        ({ userMcpServerConfigId }) =>
          userMcpServerConfigId === serverConfig.id,
      )
      .map(({ tool }) => tool.name);

    let envObj: Record<string, string>;
    try {
      envObj = JSON.parse(serverConfig.envVars) as Record<string, string>;
    } catch {
      throw new Error(
        `Invalid environment variables configuration for ${serverConfig.name}`,
      );
    }

    // args 内部に、envObj の key の値と一致するものは、値を置き換える
    // 例: --api-key=API_KEY の場合、envObj["API_KEY"] の値に置き換える
    // ただし、envObj に存在しない場合はそのまま使用する
    const args = serverConfig.mcpServer.args.map((arg) => {
      for (const [key, value] of Object.entries(envObj)) {
        // 置き換え対象のキーが arg に含まれているかチェック
        if (arg.includes(key)) {
          const newArg = arg.replace(key, value);
          return newArg;
        }
      }
      return arg;
    });

    if (serverConfig.mcpServer.transportType === TransportType.STDIO) {
      const transportConfig = {
        name: serverConfig.name,
        toolNames,
        transport: {
          type: "stdio" as const,
          command:
            serverConfig.mcpServer.command === "node"
              ? process.execPath
              : (serverConfig.mcpServer.command ?? ""),
          args,
          env: envObj,
        },
      };

      return transportConfig;
    } else {
      if (!serverConfig.mcpServer.url) {
        throw new Error(
          `SSE transport URL is required for ${serverConfig.name}`,
        );
      }

      const transportConfig = {
        name: serverConfig.name,
        toolNames,
        transport: {
          type: "sse" as const,
          url: serverConfig.mcpServer.url,
        },
      };

      return transportConfig;
    }
  });

  return serverConfigList;
};

// MCPサーバーインスタンスIDから設定を取得
const getServerConfigsByInstanceId = async (
  userMcpServerInstanceId: string,
) => {
  // MCPサーバーインスタンスを取得
  const serverInstance = await db.userMcpServerInstance.findUnique({
    where: {
      id: userMcpServerInstanceId,
      deletedAt: null,
    },
    include: {
      toolGroup: {
        include: {
          toolGroupTools: {
            include: {
              tool: true,
            },
          },
        },
      },
    },
  });

  if (!serverInstance) {
    throw new Error("Server instance not found");
  }

  const serverConfigIds = serverInstance.toolGroup.toolGroupTools.map(
    ({ userMcpServerConfigId }) => userMcpServerConfigId,
  );

  const serverConfigs = await db.userMcpServerConfig.findMany({
    where: {
      id: {
        in: serverConfigIds,
      },
    },
    omit: {
      envVars: false,
    },
    include: {
      mcpServer: true,
    },
  });

  const serverConfigList: ServerConfig[] = serverConfigs.map((serverConfig) => {
    const toolNames = serverInstance.toolGroup.toolGroupTools
      .filter(
        ({ userMcpServerConfigId }) =>
          userMcpServerConfigId === serverConfig.id,
      )
      .map(({ tool }) => tool.name);

    let envObj: Record<string, string>;
    try {
      envObj = JSON.parse(serverConfig.envVars) as Record<string, string>;
    } catch {
      envObj = {};
    }

    const transportConfig: TransportConfig = {
      type: "stdio",
      command: serverConfig.mcpServer.command || "",
      args: serverConfig.mcpServer.args ?? [],
      env: {
        ...process.env,
        ...envObj,
      } as Record<string, string>,
    } satisfies TransportConfigStdio;

    if (
      transportConfig.type === "stdio" &&
      transportConfig.args &&
      transportConfig.args.length > 0
    ) {
      transportConfig.args = JSON.parse(
        JSON.stringify(transportConfig.args),
      ) as string[];
    }

    const config: ServerConfig = {
      name: serverConfig.name,
      toolNames,
      transport: transportConfig,
    };

    return config;
  });

  return serverConfigList;
};

// MCPサーバーインスタンスIDからMCPクライアントを取得
export const getMcpClientsByInstanceId = async (
  userMcpServerInstanceId: string,
) => {
  const serverConfigs = await getServerConfigsByInstanceId(
    userMcpServerInstanceId,
  );

  const connectedClients = await createClients(serverConfigs);
  // デバッグログを削除（メモリ使用量削減）

  const cleanup = async () => {
    try {
      // デバッグログを削除（メモリ使用量削減）
      await Promise.all(connectedClients.map(({ cleanup }) => cleanup()));
    } catch {
      // クリーンアップ失敗は無視
    }
  };

  return { connectedClients, cleanup };
};

// APIキーからMCPクライアントを取得（後方互換性）
export const getMcpClients = async (apiKey: string) => {
  const serverConfigs = await getServerConfigs(apiKey);

  const connectedClients = await createClients(serverConfigs);
  // デバッグログを削除（メモリ使用量削減）

  const cleanup = async () => {
    try {
      // デバッグログを削除（メモリ使用量削減）
      await Promise.all(connectedClients.map(({ cleanup }) => cleanup()));
    } catch {
      // クリーンアップ失敗は無視
    }
  };

  return { connectedClients, cleanup };
};

export const getServer = async (
  userMcpServerInstanceId: string,
  transportType: TransportType,
  isValidationMode = false,
) => {
  const server = new Server(
    {
      name: "mcp-proxy",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // List Tools Handler with timeout handling
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const startTime = Date.now();

    const requestTimeout = config.timeouts.request;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Tools list request timeout")),
        requestTimeout,
      );
    });

    let clientsCleanup: (() => Promise<void>) | undefined;
    let userMcpServerInstance:
      | Awaited<ReturnType<typeof db.userMcpServerInstance.findUnique>>
      | undefined;

    try {
      // MCPサーバーインスタンスを取得
      userMcpServerInstance = await db.userMcpServerInstance.findUnique({
        where: {
          id: userMcpServerInstanceId,
          deletedAt: null,
        },
        include: {
          user: true,
        },
      });
      if (!userMcpServerInstance) {
        throw new Error("Server instance not found");
      }

      const result = await measureExecutionTime(
        () =>
          Promise.race([
            (async () => {
              const { connectedClients, cleanup } =
                await getMcpClientsByInstanceId(userMcpServerInstanceId);
              clientsCleanup = cleanup;

              try {
                const allTools: Tool[] = [];
                const toolToClientMap = new Map<string, ConnectedClient>();

                for (const connectedClient of connectedClients) {
                  try {
                    const result = await connectedClient.client.request(
                      {
                        method: "tools/list",
                        params: {
                          _meta: request.params?._meta,
                        },
                      },
                      ListToolsResultSchema,
                    );

                    if (result.tools) {
                      const toolsWithSource = result.tools
                        .filter((tool) =>
                          connectedClient.toolNames.includes(tool.name),
                        )
                        .map((tool) => {
                          toolToClientMap.set(tool.name, connectedClient);
                          return {
                            ...tool,
                            description: `[${connectedClient.name}] ${tool.description}`,
                          };
                        });
                      allTools.push(...toolsWithSource);
                    }
                  } catch {
                    recordError("tools_list_client_error");
                  }
                }

                return { tools: allTools, cleanup };
              } catch (error) {
                await cleanup();
                throw error;
              }
            })(),
            timeoutPromise,
          ]),
        "tools_list",
      );

      await result.cleanup();

      const durationMs = Date.now() - startTime;

      // 非同期でログ記録（レスポンス返却をブロックしない）
      if (userMcpServerInstance) {
        const inputBytes = calculateDataSize(request.params ?? {});
        const outputBytes = calculateDataSize(result.tools ?? []);

        // 成功時のログ記録（詳細データ付き）
        // ログ記録を非同期で実行（await しない）
        void logMcpRequest({
          userId: userMcpServerInstance?.userId,
          mcpServerInstanceId: userMcpServerInstance.id,
          toolName: "tools/list",
          transportType: transportType,
          method: "tools/list",
          responseStatus: "200",
          durationMs,
          inputBytes,
          outputBytes,
          organizationId: userMcpServerInstance.organizationId ?? undefined,
          // 詳細ログ記録を追加
          requestData: JSON.stringify(request),
          responseData: JSON.stringify({ tools: result.tools }),
        });
      }

      // ツール一覧完了ログを削除（メモリ使用量削減）
      // レスポンスデータを準備
      return { tools: result.tools };
    } catch (error) {
      if (clientsCleanup) {
        try {
          await clientsCleanup();
        } catch {
          // クリーンアップ失敗は無視
        }
      }

      // エラー時のログ記録
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (userMcpServerInstance && !isValidationMode) {
        // 検証モードでない場合のみ、エラー時も非同期でログ記録
        void logMcpRequest({
          userId: userMcpServerInstance?.userId,
          mcpServerInstanceId: userMcpServerInstance.id,
          toolName: "tools/list",
          transportType: transportType,
          method: "tools/list",
          responseStatus: "500",
          durationMs,
          errorMessage,
          errorCode: error instanceof Error ? error.name : "UnknownError",
          organizationId: userMcpServerInstance.organizationId ?? undefined,
        });
      }

      recordError("tools_list_failure");
      throw error;
    }
  });

  // Call Tool Handler with timeout handling
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const startTime = Date.now();

    // ツール呼び出し開始ログを削除（メモリ使用量削減）

    const requestTimeout = config.timeouts.request;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Tool call ${name} timeout`)),
        requestTimeout,
      );
    });

    let clientsCleanup: (() => Promise<void>) | undefined;
    let userMcpServerInstance:
      | Awaited<ReturnType<typeof db.userMcpServerInstance.findUnique>>
      | undefined;

    try {
      // MCPサーバーインスタンスを取得
      userMcpServerInstance = await db.userMcpServerInstance.findUnique({
        where: {
          id: userMcpServerInstanceId,
          deletedAt: null,
        },
        include: {
          user: true,
        },
      });
      if (!userMcpServerInstance) {
        throw new Error("Server instance not found");
      }

      const result = await measureExecutionTime(
        () =>
          Promise.race([
            (async () => {
              const { connectedClients, cleanup } =
                await getMcpClientsByInstanceId(userMcpServerInstanceId);
              clientsCleanup = cleanup;

              try {
                // ツール名から対応するクライアントを見つける
                let clientForTool: ConnectedClient | undefined;

                for (const connectedClient of connectedClients) {
                  if (connectedClient.toolNames.includes(name)) {
                    clientForTool = connectedClient;
                    break;
                  }
                }

                if (!clientForTool) {
                  throw new Error(`Unknown tool: ${name}`);
                }

                // Use the correct schema for tool calls
                const result = await clientForTool.client.request(
                  {
                    method: "tools/call",
                    params: {
                      name,
                      arguments: args ?? {},
                      _meta: {
                        progressToken: request.params._meta?.progressToken,
                      },
                    },
                  },
                  CompatibilityCallToolResultSchema,
                );

                return { result, cleanup };
              } catch (error) {
                await cleanup();
                throw error;
              }
            })(),
            timeoutPromise,
          ]),
        `tool_call_${name}`,
      );

      await result.cleanup();

      const durationMs = Date.now() - startTime;

      // 検証モードでない場合のみログ記録
      if (userMcpServerInstance && !isValidationMode) {
        const inputBytes = calculateDataSize(request.params ?? {});
        const outputBytes = calculateDataSize(result.result ?? {});

        // 成功時のログ記録（詳細データ付き）
        // ログ記録を非同期で実行（await しない）
        void logMcpRequest({
          userId: userMcpServerInstance?.userId,
          mcpServerInstanceId: userMcpServerInstance.id,
          toolName: name,
          transportType: transportType,
          method: "tools/call",
          responseStatus: "200",
          durationMs,
          inputBytes,
          outputBytes,
          organizationId: userMcpServerInstance.organizationId ?? undefined,
          // 詳細ログ記録を追加
          requestData: JSON.stringify(request),
          responseData: JSON.stringify(result.result),
        });
      }

      // ツール呼び出し完了ログを削除（メモリ使用量削減）
      return result.result;
    } catch (error) {
      if (clientsCleanup) {
        try {
          await clientsCleanup();
        } catch {
          // クリーンアップ失敗は無視
        }
      }

      // エラー時のログ記録
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (userMcpServerInstance && !isValidationMode) {
        // 検証モードでない場合のみ、エラー時も非同期でログ記録
        void logMcpRequest({
          userId: userMcpServerInstance?.userId,
          mcpServerInstanceId: userMcpServerInstance.id,
          toolName: name,
          transportType: transportType,
          method: "tools/call",
          responseStatus: "500",
          durationMs,
          errorMessage,
          errorCode: error instanceof Error ? error.name : "UnknownError",
          organizationId: userMcpServerInstance.organizationId ?? undefined,
        });
      }

      recordError(`tool_call_failure_${name}`);
      throw error;
    }
  });

  return { server };
};

// プロセス終了時のクリーンアップ
process.on("SIGTERM", () => {
  try {
    const pool = getSSEConnectionPool();
    if (pool) {
      pool.destroy();
    }
  } catch (error) {
    console.error("Error destroying SSE pool:", error);
  }
});

// メモリリーク防止のためのプロセスイベント監視
process.on("warning", (warning) => {
  if (warning.name === "MaxListenersExceededWarning") {
    console.warn(
      "[Process Warning] MaxListenersExceededWarning:",
      warning.message,
    );
  } else {
    console.warn("[Process Warning]", warning);
  }
});

// 定期的なメモリ使用量ログ
setInterval(
  () => {
    const usage = process.memoryUsage();
    const stats = {
      rss: Math.round(usage.rss / 1024 / 1024) + "MB",
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + "MB",
      external: Math.round(usage.external / 1024 / 1024) + "MB",
    };

    // メモリ使用量が高い場合のみログ出力
    if (usage.heapUsed > 100 * 1024 * 1024) {
      // 100MB超過時
      console.log("[Memory Usage]", stats);
    }
  },
  5 * 60 * 1000,
); // 5分ごと
