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
    console.log("Listing tools - establishing fresh connections");
    const requestTimeout = 30 * 1000; // 30秒
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Tools list request timeout")), requestTimeout);
    });

    try {
      const result = await Promise.race([
        (async () => {
          const { connectedClients, cleanup: clientsCleanup } = await getMcpClients(apiKeyId);

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
                    .filter((tool) => connectedClient.toolNames.includes(tool.name))
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
                console.error(
                  `Error fetching tools from ${connectedClient.name}:`,
                  error,
                );
              }
            }

            return { tools: allTools, cleanup: clientsCleanup };
          } catch (error) {
            await clientsCleanup();
            throw error;
          }
        })(),
        timeoutPromise,
      ]);

      await result.cleanup();
      console.log("Tools list request completed - connections closed");
      return { tools: result.tools };
    } catch (error) {
      console.error("Tools list request failed:", error);
      throw error;
    }
  });

  // Call Tool Handler with timeout handling
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.log(`Tool call: ${name} - establishing fresh connections`);
    
    const requestTimeout = 30 * 1000; // 30秒
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Tool call ${name} timeout`)), requestTimeout);
    });

    try {
      const result = await Promise.race([
        (async () => {
          const { connectedClients, cleanup: clientsCleanup } = await getMcpClients(apiKeyId);

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
              console.error(`Unknown tool: ${name}`);
              throw new Error(`Unknown tool: ${name}`);
            }

            console.log(`Forwarding tool call: ${name} to ${clientForTool.name}`);

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

            return { result, cleanup: clientsCleanup };
          } catch (error) {
            await clientsCleanup();
            throw error;
          }
        })(),
        timeoutPromise,
      ]);

      await result.cleanup();
      console.log(`Tool call ${name} completed - connections closed`);
      return result.result;
    } catch (error) {
      console.error(`Error calling tool ${name}:`, error);
      throw error;
    }
  });

  return { server };
};
