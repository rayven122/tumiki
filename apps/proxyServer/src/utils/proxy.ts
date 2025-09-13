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
import { type TransportType } from "@tumiki/db";
import { validateApiKey } from "../libs/validateApiKey.js";
import {
  setupGoogleCredentialsEnv,
  type GoogleCredentials,
} from "@tumiki/utils/server/security";

import type {
  ServerConfig,
  TransportConfig,
  TransportConfigStdio,
} from "../libs/types.js";
import { config } from "../libs/config.js";
import { recordError, measureExecutionTime } from "../libs/metrics.js";
import { logMcpRequest } from "../libs/requestLogger.js";
import { calculateDataSize } from "../libs/dataCompression.js";
import { createToolsCache, createDataCache } from "./cache/index.js";
import { mcpPool } from "./mcpPool.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ToolsCache シングルトンインスタンス
const toolsCache = createToolsCache();

// ConfigCache シングルトンインスタンス（サーバー設定キャッシュ）
const configCache = createDataCache<{ configs: ServerConfig[] }>("config");

// キャッシュ無効化関数をエクスポート
export const invalidateConfigCache = (userMcpServerInstanceId: string) => {
  // configCacheのキーは "config:${userMcpServerInstanceId}" の形式
  const cacheKey = configCache.generateKey(userMcpServerInstanceId);
  configCache.delete(cacheKey);
};

export type ConnectedClient = {
  client: Client;
  cleanup: () => Promise<void>;
  name: string;
  toolNames: string[];
  credentialsCleanup?: () => Promise<void>;
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
const createClient = async (
  server: ServerConfig,
): Promise<{
  client: Client | undefined;
  transport: Transport | undefined;
  credentialsCleanup?: () => Promise<void>;
}> => {
  let transport: Transport | null = null;
  let credentialsCleanup: (() => Promise<void>) | undefined;

  try {
    if (server.transport.type === "sse") {
      // Type narrowing: when type is "sse", url is guaranteed to be string
      const sseTransport = server.transport;
      if ("url" in sseTransport && typeof sseTransport.url === "string") {
        // SSE transportにヘッダーを設定（認証情報を含む）
        const headers: Record<string, string> = {};

        // 環境変数から認証情報を取得して設定
        if (sseTransport.env) {
          // x-api-keyヘッダーの設定（API_KEYやX_API_KEYなどの環境変数から）
          if (sseTransport.env.API_KEY) {
            headers["X-API-Key"] = sseTransport.env.API_KEY;
          } else if (sseTransport.env.X_API_KEY) {
            headers["X-API-Key"] = sseTransport.env.X_API_KEY;
          }

          // Authorizationヘッダーの設定（AUTHORIZATION_TOKENやBEARER_TOKENなどから）
          if (sseTransport.env.AUTHORIZATION_TOKEN) {
            headers.Authorization = `Bearer ${sseTransport.env.AUTHORIZATION_TOKEN}`;
          } else if (sseTransport.env.BEARER_TOKEN) {
            headers.Authorization = `Bearer ${sseTransport.env.BEARER_TOKEN}`;
          } else if (sseTransport.env.AUTHORIZATION) {
            headers.Authorization = sseTransport.env.AUTHORIZATION;
          }

          // その他のカスタムヘッダー（CUSTOM_HEADER_プレフィックスなど）
          for (const [key, value] of Object.entries(sseTransport.env)) {
            if (key.startsWith("HEADER_")) {
              const headerName = key.substring(7).replace(/_/g, "-");
              headers[headerName] = value;
            }
          }
        }

        // カスタムfetch実装を使用してヘッダーを設定
        const customFetch = async (url: string | URL, init: RequestInit) => {
          const finalInit = {
            ...init,
            headers: {
              ...init.headers,
              ...headers,
            },
          };
          return fetch(url, finalInit);
        };

        const sseOptions: unknown = {
          eventSourceInit: {
            // EventSourceInitはfetchプロパティをサポート
            fetch: Object.keys(headers).length > 0 ? customFetch : undefined,
          },
          requestInit: {
            headers: Object.keys(headers).length > 0 ? headers : undefined,
          },
        };

        transport = new SSEClientTransport(
          new URL(sseTransport.url),
          // @ts-expect-error - SSEClientTransportOptionsの型定義にfetchプロパティが含まれていないため
          sseOptions,
        );
      } else {
        throw new Error("SSE transport requires a valid URL");
      }
    } else {
      let finalEnv = server.transport.env
        ? Object.fromEntries(
            Object.entries(server.transport.env).map(([key, value]) => [
              key,
              String(value), // DBの値を優先（process.envは使用しない）
            ]),
          )
        : {};

      // Google認証情報の処理
      if (server.googleCredentials) {
        const { envVars, cleanup } = await setupGoogleCredentialsEnv(
          finalEnv,
          server.googleCredentials as GoogleCredentials,
        );
        finalEnv = envVars;
        credentialsCleanup = cleanup;
      }

      transport = new StdioClientTransport({
        command: server.transport.command,
        args: server.transport.args,
        env: finalEnv,
      });
    }
  } catch {
    recordError("transport_creation_failed");
    return { transport: undefined, client: undefined, credentialsCleanup };
  }

  const client = new Client({
    name: "mcp-proxy-client",
    version: "1.0.0",
  });

  return { client, transport, credentialsCleanup };
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
    const { client, transport, credentialsCleanup } =
      await createClient(server);
    if (!client || !transport) {
      // 認証情報ファイルのクリーンアップ
      if (credentialsCleanup) {
        await credentialsCleanup();
      }
      return null;
    }

    try {
      await client.connect(transport);

      return {
        client,
        name: server.name,
        cleanup: async () => {
          await transport.close();
          // 認証情報ファイルのクリーンアップ
          if (credentialsCleanup) {
            await credentialsCleanup();
          }
        },
        toolNames: server.toolNames,
        credentialsCleanup,
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
          // 認証情報ファイルのクリーンアップ
          if (credentialsCleanup) {
            await credentialsCleanup();
          }
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

// MCPサーバーインスタンスIDから設定を取得
export const getServerConfigsByInstanceId = async (
  userMcpServerInstanceId: string,
) => {
  // キャッシュキーを生成
  const cacheKey = configCache.generateKey(userMcpServerInstanceId);

  // キャッシュヒットチェック
  const cached = configCache.get(cacheKey);
  if (cached) {
    return cached.configs;
  }

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
    let googleCredentials: Record<string, unknown> | null = null;

    try {
      envObj = JSON.parse(serverConfig.envVars) as Record<string, string>;
    } catch {
      envObj = {};
    }

    // GOOGLE_APPLICATION_CREDENTIALS が含まれている場合、JSONとして解析
    if (envObj.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        googleCredentials = JSON.parse(
          envObj.GOOGLE_APPLICATION_CREDENTIALS,
        ) as Record<string, unknown>;
        // envObjから削除（ファイルパスは動的に生成されるため）
        delete envObj.GOOGLE_APPLICATION_CREDENTIALS;
      } catch (error) {
        throw new Error(
          `Invalid GOOGLE_APPLICATION_CREDENTIALS format for ${serverConfig.name}: Must be valid JSON. ${error instanceof Error ? error.message : String(error)}`,
        );
      }
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
      googleCredentials,
    };

    return config;
  });

  // キャッシュに保存
  configCache.set(cacheKey, { configs: serverConfigList });

  return serverConfigList;
};

// MCPサーバーインスタンスIDからMCPクライアントを取得（プール使用版）
export const getMcpClientsByInstanceId = async (
  userMcpServerInstanceId: string,
) => {
  const serverConfigs = await getServerConfigsByInstanceId(
    userMcpServerInstanceId,
  );

  // プールから接続を取得または作成（並列処理）
  const connectionPromises = serverConfigs.map(async (serverConfig) => {
    try {
      const client = await mcpPool.getConnection(
        userMcpServerInstanceId,
        serverConfig.name,
        serverConfig,
      );

      return {
        client,
        name: serverConfig.name,
        cleanup: async () => {
          // プールに返却
          mcpPool.releaseConnection(
            userMcpServerInstanceId,
            serverConfig.name,
            client,
          );
        },
        toolNames: serverConfig.toolNames,
      };
    } catch (error) {
      // 接続失敗はログして続行
      console.error(`Failed to connect to ${serverConfig.name}:`, error);
      recordError("server_connection_failed");
      return null;
    }
  });

  // Promise.allSettledで全ての接続を並列実行
  const connectionResults = await Promise.allSettled(connectionPromises);

  // 成功した接続のみをフィルタリング
  const connectedClients: ConnectedClient[] = connectionResults
    .filter(
      (result): result is PromiseFulfilledResult<ConnectedClient | null> =>
        result.status === "fulfilled" && result.value !== null,
    )
    .map((result) => result.value!);

  const cleanup = async () => {
    // 全ての接続をプールに返却
    for (const { name, client } of connectedClients) {
      mcpPool.releaseConnection(userMcpServerInstanceId, name, client);
    }
  };

  return { connectedClients, cleanup };
};

// APIキーからMCPクライアントを取得（後方互換性）
export const getMcpClients = async (apiKey: string) => {
  // APIキーからuserMcpServerInstanceIdを取得
  const validation = await validateApiKey(apiKey);
  if (!validation.valid || !validation.userMcpServerInstance) {
    throw new Error(`Invalid API key: ${validation.error || "Unknown error"}`);
  }

  // プール版の関数を使用
  return getMcpClientsByInstanceId(validation.userMcpServerInstance.id);
};

export const getServer = async (
  serverIdentifier: string,
  transportType: TransportType,
  isValidationMode = false,
) => {
  // 後方互換性: APIキー形式（tumiki_mcp_で始まる）かどうかをチェック
  let userMcpServerInstanceId: string;
  const apiKeyPrefix = process.env.API_KEY_PREFIX;
  if (apiKeyPrefix && serverIdentifier.startsWith(apiKeyPrefix)) {
    // APIキーの場合、validateApiKeyを使ってuserMcpServerInstanceIdを取得
    const validation = await validateApiKey(serverIdentifier);
    if (!validation.valid || !validation.userMcpServerInstance) {
      throw new Error(
        `Invalid API key: ${validation.error || "Unknown error"}`,
      );
    }
    userMcpServerInstanceId = validation.userMcpServerInstance.id;
  } else {
    // 直接userMcpServerInstanceIdとして扱う
    userMcpServerInstanceId = serverIdentifier;
  }
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
      });
      if (!userMcpServerInstance) {
        throw new Error("Server instance not found");
      }

      // 🆕 キャッシュチェック
      // サーバー設定を取得してキャッシュキーを生成
      const serverConfigs = await getServerConfigsByInstanceId(
        userMcpServerInstanceId,
      );
      const serverConfigHash =
        toolsCache.generateServerConfigHash(serverConfigs);
      const cacheKey = toolsCache.generateKey(
        userMcpServerInstanceId,
        serverConfigHash,
      );

      // キャッシュヒットチェック
      const cachedTools = toolsCache.getTools(cacheKey);
      if (cachedTools) {
        // 🎯 キャッシュヒット: 即座にレスポンス
        const durationMs = Date.now() - startTime;

        // キャッシュヒット時のログ記録
        if (userMcpServerInstance && !isValidationMode) {
          const inputBytes = calculateDataSize(request.params ?? {});
          const outputBytes = calculateDataSize(cachedTools);

          void logMcpRequest({
            organizationId: userMcpServerInstance.organizationId,
            mcpServerInstanceId: userMcpServerInstance.id,
            toolName: "tools/list",
            transportType: transportType,
            method: "tools/list",
            responseStatus: "200",
            durationMs,
            inputBytes,
            outputBytes,
            cached: true, // 🆕 キャッシュフラグ
          });
        }

        return { tools: cachedTools };
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

                // 全クライアントに並列でリクエストを送信
                const toolsPromises = connectedClients.map(
                  async (connectedClient) => {
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
                            return {
                              tool: {
                                ...tool,
                                description: `[${connectedClient.name}] ${tool.description}`,
                              },
                              client: connectedClient,
                            };
                          });
                        return toolsWithSource;
                      }
                      return [];
                    } catch {
                      recordError("tools_list_client_error");
                      return [];
                    }
                  },
                );

                // 全ての結果を待って統合
                const toolsResults = await Promise.allSettled(toolsPromises);

                for (const result of toolsResults) {
                  if (result.status === "fulfilled" && result.value) {
                    for (const { tool, client } of result.value) {
                      toolToClientMap.set(tool.name, client);
                      allTools.push(tool);
                    }
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

      // 🆕 キャッシュミス: 結果をキャッシュに保存
      toolsCache.setTools(cacheKey, result.tools, serverConfigHash);

      const durationMs = Date.now() - startTime;

      // 非同期でログ記録（レスポンス返却をブロックしない）
      if (userMcpServerInstance) {
        const inputBytes = calculateDataSize(request.params ?? {});
        const outputBytes = calculateDataSize(result.tools ?? []);

        // 成功時のログ記録（詳細データ付き）
        // ログ記録を非同期で実行（await しない）
        void logMcpRequest({
          organizationId: userMcpServerInstance?.organizationId,
          mcpServerInstanceId: userMcpServerInstance.id,
          toolName: "tools/list",
          transportType: transportType,
          method: "tools/list",
          responseStatus: "200",
          durationMs,
          inputBytes,
          outputBytes,
          cached: false, // 🆕 キャッシュミスフラグ
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
          organizationId: userMcpServerInstance?.organizationId,
          mcpServerInstanceId: userMcpServerInstance.id,
          toolName: "tools/list",
          transportType: transportType,
          method: "tools/list",
          responseStatus: "500",
          durationMs,
          errorMessage,
          errorCode: error instanceof Error ? error.name : "UnknownError",
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
          organizationId: userMcpServerInstance.organizationId,
          mcpServerInstanceId: userMcpServerInstance.id,
          toolName: name,
          transportType: transportType,
          method: "tools/call",
          responseStatus: "200",
          durationMs,
          inputBytes,
          outputBytes,
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
          organizationId: userMcpServerInstance?.organizationId,
          mcpServerInstanceId: userMcpServerInstance.id,
          toolName: name,
          transportType: transportType,
          method: "tools/call",
          responseStatus: "500",
          durationMs,
          errorMessage,
          errorCode: error instanceof Error ? error.name : "UnknownError",
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
