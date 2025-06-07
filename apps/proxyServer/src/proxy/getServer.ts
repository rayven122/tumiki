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
    }
  );
  const toolToClientMap = new Map<string, ConnectedClient>();

  const { connectedClients, cleanup } = await getMcpClients(apiKeyId);
  // List Tools Handler
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const allTools: Tool[] = [];
    toolToClientMap.clear();
    for (const connectedClient of connectedClients) {
      try {
        const result = await connectedClient.client.request(
          {
            method: "tools/list",
            params: {
              _meta: request.params?._meta,
            },
          },
          ListToolsResultSchema
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
          error
        );
      }
    }

    return { tools: allTools };
  });

  // Call Tool Handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const clientForTool = toolToClientMap.get(name);

    if (!clientForTool) {
      console.error(`Unknown tool: ${name}`, toolToClientMap);
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      console.log("Forwarding tool call:", name);

      // Use the correct schema for tool calls
      return await clientForTool.client.request(
        {
          method: "tools/call",
          params: {
            name,
            arguments: args || {},
            _meta: {
              progressToken: request.params._meta?.progressToken,
            },
          },
        },
        CompatibilityCallToolResultSchema
      );
    } catch (error) {
      console.error(`Error calling tool through ${clientForTool.name}:`, error);
      throw error;
    }
  });

  return { server, cleanup };
};
