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
import { validateApiKey } from "../lib/validateApiKey.js";

import type { ServerConfig } from "../lib/types.js";
import { logger } from "../lib/logger.js";
import { config } from "../lib/config.js";
import { recordError, measureExecutionTime } from "../lib/metrics.js";

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
 * 複数のサーバーに接続する
 * 接続に失敗したら、2.5秒待ってから再接続を試みる
 * 3回失敗したら、エラーをスローする
 * @param servers
 * @returns
 */
export const createClients = async (
  servers: ServerConfig[],
): Promise<ConnectedClient[]> => {
  const clients: ConnectedClient[] = [];

  for (const server of servers) {
    logger.info("Connecting to server", { serverName: server.name });

    const waitFor = config.retry.delayMs;
    const retries = config.retry.maxAttempts;
    let count = 0;
    let retry = true;

    while (retry) {
      const { client, transport } = createClient(server);
      if (!client || !transport) {
        break;
      }

      try {
        await client.connect(transport);
        logger.info("Successfully connected to server", {
          serverName: server.name,
        });

        clients.push({
          client,
          name: server.name,
          cleanup: async () => {
            await transport.close();
          },
          toolNames: server.toolNames,
        });

        break;
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
            logger.debug("Retrying connection", {
              serverName: server.name,
              delayMs: waitFor,
              attempt: count,
              maxAttempts: retries,
            });
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
  }

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
          args: serverConfig.mcpServer.args,
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
  logger.debug("Connected to servers", {
    clientCount: connectedClients.length,
    serverNames: connectedClients.map((client) => client.name),
  });

  const cleanup = async () => {
    try {
      logger.debug("Cleaning up servers", {
        clientCount: connectedClients.length,
      });
      await Promise.all(connectedClients.map(({ cleanup }) => cleanup()));
    } catch (error) {
      logger.error("Error during cleanup", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return { connectedClients, cleanup };
};

export const getServer = async (apiKey: string) => {
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
    logger.info("Listing tools - establishing fresh connections");
    const requestTimeout = config.timeouts.request;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Tools list request timeout")),
        requestTimeout,
      );
    });

    let clientsCleanup: (() => Promise<void>) | undefined;
    try {
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
      logger.info("Tools list request completed", {
        toolsCount: result.tools.length,
      });
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
      logger.error("Tools list request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      recordError("tools_list_failure");
      throw error;
    }
  });

  // Call Tool Handler with timeout handling
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info("Tool call - establishing fresh connections", {
      toolName: name,
    });

    const requestTimeout = config.timeouts.request;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Tool call ${name} timeout`)),
        requestTimeout,
      );
    });

    let clientsCleanup: (() => Promise<void>) | undefined;
    try {
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
      logger.info("Tool call completed", {
        toolName: name,
      });
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
      logger.error("Tool call failed", {
        toolName: name,
        error: error instanceof Error ? error.message : String(error),
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
