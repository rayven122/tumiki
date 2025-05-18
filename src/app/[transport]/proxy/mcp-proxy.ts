import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { createClientMap, type ConnectedClient } from "./client";
import { type ServerConfig } from "./config";
import { db } from "@/server/db";

type ClientTool = {
  name: string;
  description: string;
  // JSON Schema
  inputSchema: object;
  connectedClient: ConnectedClient;
};

export const getClientTools = async (
  apiKeyId: string,
): Promise<{
  toolMap: Map<string, ClientTool>;
  cleanup: () => Promise<void>;
}> => {
  const apiKey = await db.apiKey.findUniqueOrThrow({
    where: {
      id: apiKeyId,
    },
    include: {
      toolGroups: {
        include: {
          toolGroupTools: {
            include: {
              tool: true,
              userMcpServer: {
                include: {
                  mcpServer: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const serverConfigsMap = new Map<string, ServerConfig>();

  apiKey.toolGroups.forEach((toolGroup) => {
    toolGroup.toolGroupTools.forEach((toolGroupTool) => {
      const userMcpServer = toolGroupTool.userMcpServer;
      const envObj = JSON.parse(userMcpServer.envVars) as Record<
        string,
        string
      >;
      const serverName = userMcpServer.name ?? userMcpServer.mcpServer.name;

      serverConfigsMap.set(userMcpServer.id, {
        name: serverName,
        transport: {
          type: "stdio",
          command:
            userMcpServer.mcpServer.command === "node"
              ? process.execPath
              : userMcpServer.mcpServer.command,
          args: userMcpServer.mcpServer.args,
          env: envObj,
        },
      } satisfies ServerConfig);
    });
  });

  const connectedClientMap = await createClientMap(serverConfigsMap);
  console.log(`[DEBUG] Connected to ${connectedClientMap.size} servers`);

  const cleanup = async () => {
    try {
      await Promise.all(
        Array.from(connectedClientMap.values()).map(({ cleanup }) => cleanup()),
      );
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  };

  // userMcpServerId, toolNames
  const userToolsMap = new Map<string, { toolId: string; name: string }[]>();

  apiKey.toolGroups.forEach((toolGroup) => {
    toolGroup.toolGroupTools.forEach(({ tool, userMcpServer }) => {
      const toolNames = userToolsMap.get(userMcpServer.id);
      userToolsMap.set(userMcpServer.id, [
        ...(toolNames ?? []),
        { toolId: tool.id, name: tool.name },
      ]);
    });
  });

  const toolMap = new Map<string, ClientTool>();

  for (const [
    userMcpServerId,
    connectedClient,
  ] of connectedClientMap.entries()) {
    const userTools = userToolsMap.get(userMcpServerId);

    try {
      const result = await connectedClient.client.request(
        {
          method: "tools/list",
          params: {},
        },
        ListToolsResultSchema,
      );

      if (result.tools) {
        for (const tool of result.tools) {
          const userTool = userTools?.find(({ name }) => name === tool.name);
          if (userTool) {
            toolMap.set(tool.name, {
              name: tool.name,
              description: `[${connectedClient.name}] ${tool.description ?? ""}`,
              inputSchema: tool.inputSchema,
              connectedClient,
            });
          }
        }
      }
    } catch (error) {
      console.error(
        `Error fetching tools from ${connectedClient.name}:`,
        error,
      );
    }
  }

  return { toolMap, cleanup };
};
