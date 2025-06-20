import { createClients } from "./client.js";
import { type ServerConfig } from "../../infrastructure/types/config.js";
import { db } from "@tumiki/db/tcp";
import { logger } from "../../infrastructure/utils/logger.js";

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
