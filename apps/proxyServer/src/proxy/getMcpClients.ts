import { createClients } from "./client.js";
import { type ServerConfig } from "../types/config.js";
import { db } from "../libs/db.js";
import { ServerStatus } from "@prisma/client";

const getServerConfigs = async (apiKeyId: string) => {
  const serverInstance = await db.userMcpServerInstance.findUniqueOrThrow({
    where: {
      id: apiKeyId,
      serverStatus: ServerStatus.RUNNING,
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

  const serverConfigIds = serverInstance.toolGroup.toolGroupTools.map(
    ({ userMcpServerConfigId }) => userMcpServerConfigId
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
        ({ userMcpServerConfigId }) => userMcpServerConfigId === serverConfig.id
      )
      .map(({ tool }) => tool.name);

    const envObj = JSON.parse(serverConfig.envVars) as Record<string, string>;

    return {
      name: serverConfig.name,
      toolNames,
      transport: {
        type: "stdio",
        command:
          serverConfig.mcpServer.command === "node"
            ? process.execPath
            : serverConfig.mcpServer.command,
        args: serverConfig.mcpServer.args,
        env: envObj,
      },
    };
  });

  return serverConfigList;
};

export const getMcpClients = async (apiKeyId: string) => {
  const serverConfigs = await getServerConfigs(apiKeyId);

  const connectedClients = await createClients(serverConfigs);
  console.log(`[DEBUG] Connected to ${connectedClients.length} servers`);

  const cleanup = async () => {
    try {
      console.log(`[DEBUG] Cleaning up ${connectedClients.length} servers`);
      await Promise.all(connectedClients.map(({ cleanup }) => cleanup()));
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  };

  return { connectedClients, cleanup };
};
