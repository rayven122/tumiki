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
import { TransportType } from "@tumiki/db/prisma";
import { validateApiKey } from "../libs/validateApiKey.js";

import type { ServerConfig } from "../libs/types.js";
import { logger } from "../libs/logger.js";
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
      transport = new SSEClientTransport(new URL(server.transport.url));
    } else {
      transport = new StdioClientTransport({
        command: server.transport.command,
        args: server.transport.args,
        env: server.transport.env
          ? Object.fromEntries(
              Object.entries(server.transport.env).map(([key, value]) => [
                key,
                process.env[key] ?? String(value),
              ]),
            )
          : undefined,
      });
    }
  } catch (error) {
    logger.error("Failed to create transport", {
      transportType: server.transport.type ?? "stdio",
      serverName: server.name,
      error: error instanceof Error ? error.message : String(error),
    });
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
  logger.info("Connecting to server", { serverName: server.name });

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
      logger.info("Successfully connected to server", {
        serverName: server.name,
      });

      return {
        client,
        name: server.name,
        cleanup: async () => {
          await transport.close();
        },
        toolNames: server.toolNames,
      };
    } catch (error) {
      logger.error("Failed to connect to server", {
        serverName: server.name,
        error: error instanceof Error ? error.message : String(error),
        attempt: count + 1,
        maxAttempts: retries,
      });
      recordError("server_connection_failed");
      count++;
      retry = count < retries;
      if (retry) {
        try {
          await client.close();
          // transportも確実にクローズする
          await transport.close();
        } catch (closeError) {
          logger.error("Error closing client/transport during retry", {
            serverName: server.name,
            error:
              closeError instanceof Error
                ? closeError.message
                : String(closeError),
          });
        } finally {
          // デバッグログを削除（メモリ使用量削減）
          await sleep(waitFor);
        }
      } else {
        // リトライ終了時もtransportをクローズ
        try {
          await transport.close();
        } catch (closeError) {
          logger.error("Error closing transport after retry exhaustion", {
            serverName: server.name,
            error:
              closeError instanceof Error
                ? closeError.message
                : String(closeError),
          });
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
        logger.warn("Server connection skipped after all retries", {
          serverName: server.name,
          reason:
            result.status === "rejected"
              ? result.reason
              : "Connection returned null",
        });
      }
    }
  });

  logger.info("Parallel connection completed", {
    totalServers: servers.length,
    connectedServers: clients.length,
    failedServers: servers.length - clients.length,
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
    } catch (error) {
      logger.error("Failed to parse environment variables", {
        serverConfigName: serverConfig.name,
        error: error instanceof Error ? error.message : String(error),
      });
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
      return {
        name: serverConfig.name,
        toolNames,
        transport: {
          type: "stdio",
          command:
            serverConfig.mcpServer.command === "node"
              ? process.execPath
              : (serverConfig.mcpServer.command ?? ""),
          args,
          env: envObj,
        },
      };
    } else {
      return {
        name: serverConfig.name,
        toolNames,
        transport: {
          type: "sse",
          url: serverConfig.mcpServer.url ?? "",
          env: envObj,
        },
      };
    }
  });

  return serverConfigList;
};

export const getMcpClients = async (apiKey: string) => {
  const serverConfigs = await getServerConfigs(apiKey);

  const connectedClients = await createClients(serverConfigs);
  // デバッグログを削除（メモリ使用量削減）

  const cleanup = async () => {
    try {
      // デバッグログを削除（メモリ使用量削減）
      await Promise.all(connectedClients.map(({ cleanup }) => cleanup()));
    } catch (error) {
      logger.error("Error during cleanup", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return { connectedClients, cleanup };
};

export const getServer = async (
  apiKey: string,
  transportType: TransportType,
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

    logger.info("Listing tools - establishing fresh connections");
    const requestTimeout = config.timeouts.request;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Tools list request timeout")),
        requestTimeout,
      );
    });

    let clientsCleanup: (() => Promise<void>) | undefined;
    let validation: Awaited<ReturnType<typeof validateApiKey>> | undefined;

    try {
      // API キー検証を先に実行してユーザー情報を取得
      validation = await validateApiKey(apiKey);
      if (!validation.valid || !validation.userMcpServerInstance) {
        throw new Error(`Invalid API key: ${validation.error}`);
      }

      const result = await measureExecutionTime(
        () =>
          Promise.race([
            (async () => {
              const { connectedClients, cleanup } = await getMcpClients(apiKey);
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
                  } catch (error) {
                    logger.error("Error fetching tools from client", {
                      clientName: connectedClient.name,
                      error:
                        error instanceof Error ? error.message : String(error),
                    });
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
      if (validation.userMcpServerInstance) {
        const inputBytes = calculateDataSize(request.params ?? {});
        const outputBytes = calculateDataSize(result.tools ?? []);

        // 成功時のログ記録
        // ログ記録を非同期で実行（await しない）
        logMcpRequest({
          userId: undefined,
          mcpServerInstanceId: validation.userMcpServerInstance.id,
          toolName: "tools/list",
          transportType: transportType,
          method: "tools/list",
          responseStatus: "200",
          durationMs,
          inputBytes,
          outputBytes,
          organizationId:
            validation.userMcpServerInstance.organizationId ?? undefined,
        }).catch((error) => {
          // ログ記録失敗をログに残すが、リクエスト処理は継続
          logger.error("Failed to log tools/list request", {
            error: error instanceof Error ? error.message : String(error),
            userId: validation?.userMcpServerInstance?.userId,
          });
        });
      }

      // ツール一覧完了ログを削除（メモリ使用量削減）
      // レスポンスデータを準備
      return { tools: result.tools };
    } catch (error) {
      if (clientsCleanup) {
        try {
          await clientsCleanup();
        } catch (cleanupError) {
          logger.error("Error during cleanup after failure", {
            error:
              cleanupError instanceof Error
                ? cleanupError.message
                : String(cleanupError),
          });
        }
      }

      // エラー時のログ記録
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (validation?.userMcpServerInstance) {
        // エラー時も非同期でログ記録
        logMcpRequest({
          userId: undefined,
          mcpServerInstanceId: validation.userMcpServerInstance.id,
          toolName: "tools/list",
          transportType: transportType,
          method: "tools/list",
          responseStatus: "500",
          durationMs,
          errorMessage,
          errorCode: error instanceof Error ? error.name : "UnknownError",
          organizationId:
            validation.userMcpServerInstance.organizationId ?? undefined,
        }).catch((logError) => {
          logger.error("Failed to log tools/list error", {
            logError:
              logError instanceof Error ? logError.message : String(logError),
            originalError: errorMessage,
          });
        });
      }

      logger.error("Tools list request failed", {
        error: errorMessage,
        durationMs,
      });
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
    let validation: Awaited<ReturnType<typeof validateApiKey>> | undefined;

    try {
      // API キー検証を先に実行してユーザー情報を取得
      validation = await validateApiKey(apiKey);
      if (!validation.valid || !validation.userMcpServerInstance) {
        throw new Error(`Invalid API key: ${validation.error}`);
      }

      const result = await measureExecutionTime(
        () =>
          Promise.race([
            (async () => {
              const { connectedClients, cleanup } = await getMcpClients(apiKey);
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
                  logger.error("Unknown tool requested", { toolName: name });
                  throw new Error(`Unknown tool: ${name}`);
                }

                logger.info("Forwarding tool call to client", {
                  toolName: name,
                  clientName: clientForTool.name,
                });

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

      // 非同期でログ記録（レスポンス返却をブロックしない）
      if (validation.userMcpServerInstance) {
        const inputBytes = calculateDataSize(request.params ?? {});
        const outputBytes = calculateDataSize(result.result ?? {});

        // 成功時のログ記録
        // ログ記録を非同期で実行（await しない）
        logMcpRequest({
          userId: undefined,
          mcpServerInstanceId: validation.userMcpServerInstance.id,
          toolName: name,
          transportType: transportType,
          method: "tools/call",
          responseStatus: "200",
          durationMs,
          inputBytes,
          outputBytes,
          organizationId:
            validation.userMcpServerInstance.organizationId ?? undefined,
        }).catch((error) => {
          // ログ記録失敗をログに残すが、リクエスト処理は継続
          logger.error("Failed to log tools/call request", {
            error: error instanceof Error ? error.message : String(error),
            toolName: name,
            userId: validation?.userMcpServerInstance?.userId,
          });
        });
      }

      // ツール呼び出し完了ログを削除（メモリ使用量削減）
      return result.result;
    } catch (error) {
      if (clientsCleanup) {
        try {
          await clientsCleanup();
        } catch (cleanupError) {
          logger.error("Error during cleanup after failure", {
            error:
              cleanupError instanceof Error
                ? cleanupError.message
                : String(cleanupError),
          });
        }
      }

      // エラー時のログ記録
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (validation?.userMcpServerInstance) {
        // エラー時も非同期でログ記録
        logMcpRequest({
          userId: undefined,
          mcpServerInstanceId: validation.userMcpServerInstance.id,
          toolName: name,
          transportType: transportType,
          method: "tools/call",
          responseStatus: "500",
          durationMs,
          errorMessage,
          errorCode: error instanceof Error ? error.name : "UnknownError",
          organizationId:
            validation.userMcpServerInstance.organizationId ?? undefined,
        }).catch((logError) => {
          logger.error("Failed to log tools/call error", {
            logError:
              logError instanceof Error ? logError.message : String(logError),
            originalError: errorMessage,
            toolName: name,
          });
        });
      }

      logger.error("Tool call failed", {
        toolName: name,
        error: errorMessage,
        durationMs,
      });
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
