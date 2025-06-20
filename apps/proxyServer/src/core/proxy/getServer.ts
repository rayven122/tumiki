import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  CompatibilityCallToolResultSchema,
  ListToolsRequestSchema,
  ListToolsResultSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { getMcpClients } from "./getMcpClients.js";
import type { ConnectedClient } from "./client.js";
import { logger } from "../../infrastructure/utils/logger.js";
import { config } from "../../infrastructure/config/index.js";
import {
  recordError,
  measureExecutionTime,
} from "../../infrastructure/monitoring/metrics.js";

export const getServer = async (apiKeyId: string) => {
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
    logger.info("Listing tools - establishing fresh connections", {
      apiKeyId,
    });
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
              const { connectedClients, cleanup } =
                await getMcpClients(apiKeyId);
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
        apiKeyId,
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
        apiKeyId,
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
      apiKeyId,
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
              const { connectedClients, cleanup } =
                await getMcpClients(apiKeyId);
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
        apiKeyId,
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
        apiKeyId,
      });
      recordError(`tool_call_failure_${name}`);
      throw error;
    }
  });

  return { server };
};
