import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { createClients } from "./client";
import { type ServerConfig } from "./config";
import { db } from "@/server/db";
import { cache } from "react";

// const MAX_RETRIES = 3;
// const RETRY_DELAY = 1000; // 1秒

// const retryWithBackoff = async <T>(
//   fn: () => Promise<T>,
//   retries = MAX_RETRIES,
// ): Promise<T> => {
//   try {
//     return await fn();
//   } catch (error) {
//     if (retries === 0) throw error;
//     await new Promise((resolve) =>
//       setTimeout(resolve, RETRY_DELAY * (MAX_RETRIES - retries + 1)),
//     );
//     return retryWithBackoff(fn, retries - 1);
//   }
// };

export const getClientTools = cache(async (apiKeyId: string) => {
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

  const toolNames = apiKey.toolGroups.flatMap(({ toolGroupTools }) =>
    toolGroupTools.map(({ tool }) => tool.name),
  );

  const serverConfigsMap = new Map<string, ServerConfig>();

  apiKey.toolGroups.forEach((toolGroup) => {
    toolGroup.toolGroupTools.forEach((toolGroupTool) => {
      const envObj = JSON.parse(toolGroupTool.userMcpServer.envVars) as Record<
        string,
        string
      >;
      const serverName =
        toolGroupTool.userMcpServer.name ??
        toolGroupTool.userMcpServer.mcpServer.name;

      serverConfigsMap.set(serverName, {
        name: serverName,
        transport: {
          type: "stdio",
          command:
            toolGroupTool.userMcpServer.mcpServer.command === "node"
              ? process.execPath
              : toolGroupTool.userMcpServer.mcpServer.command,
          args: ["mcp/github.mcp-server.js"],
          env: envObj,
        },
      } satisfies ServerConfig);
    });
  });

  const serverConfigs: ServerConfig[] = Array.from(serverConfigsMap.values());

  const testServerConfigs = serverConfigs;

  const connectedClients = await createClients(testServerConfigs);
  console.log(`[DEBUG] Connected to ${connectedClients.length} servers`);

  const cleanup = async () => {
    try {
      await Promise.all(connectedClients.map(({ cleanup }) => cleanup()));
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  };

  const tools = [];
  for (const connectedClient of connectedClients) {
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
          if (toolNames.includes(tool.name)) {
            tools.push({
              name: `[${connectedClient.name}] ${tool.name}`,
              description: tool.description ?? "",
              inputSchema: tool.inputSchema,
              connectedClient,
              tool,
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

  return { tools, cleanup };
});
