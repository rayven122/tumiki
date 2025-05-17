import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { createClients, type ConnectedClient } from "./client";
import { type ServerConfig } from "./config";
import { db } from "@/server/db";
import { getFromCache, setInCache } from "@/lib/redis";
import { z } from "zod";

const makeCacheKey = (apiKeyId: string) => `mcp-proxy-${apiKeyId}`;

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
  tools: ClientTool[];
  cleanup: () => Promise<void>;
}> => {
  const cacheKey = makeCacheKey(apiKeyId);
  const cachedTools = await getFromCache(cacheKey);
  if (cachedTools) {
    console.log(`[DEBUG] Cache hit for ${cacheKey}`);
    const result = z
      .object({
        tools: ListToolsResultSchema.shape.tools,
      })
      .passthrough()
      .safeParse(cachedTools);

    if (result.success) {
      return result.data as {
        tools: ClientTool[];
        cleanup: () => Promise<void>;
      };
    }
  }

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
          args: toolGroupTool.userMcpServer.mcpServer.args,
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

  const tools: ClientTool[] = [];
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

  await setInCache(cacheKey, { tools, cleanup });

  return { tools, cleanup };
};
