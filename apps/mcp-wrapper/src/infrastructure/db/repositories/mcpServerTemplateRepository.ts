import { db, TransportType } from "@tumiki/db/server";
import type { McpServerConfig } from "../../../domain/types/mcpServer.js";
import { logError, logWarn } from "../../../shared/logger/index.js";
import { config } from "../../../shared/constants/config.js";

/**
 * STDIO MCPサーバーテンプレートを名前で取得
 */
export const getStdioServerByName = async (
  normalizedName: string,
): Promise<McpServerConfig | null> => {
  try {
    const template = await db.mcpServerTemplate.findFirst({
      where: {
        normalizedName,
        transportType: TransportType.STDIO,
        organizationId: config.officialOrganizationId,
      },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        command: true,
        args: true,
        envVarKeys: true,
      },
    });

    if (!template) {
      logWarn("STDIO server template not found", { normalizedName });
      return null;
    }

    if (!template.command) {
      logWarn("STDIO server has no command", { normalizedName });
      return null;
    }

    return {
      id: template.id,
      name: template.name,
      normalizedName: template.normalizedName,
      command: template.command,
      args: template.args,
      envVarKeys: template.envVarKeys,
    };
  } catch (error) {
    logError("Failed to get STDIO server template", error as Error, {
      normalizedName,
    });
    throw error;
  }
};

/**
 * 利用可能なSTDIO MCPサーバー一覧を取得
 */
export const listAvailableServers = async (): Promise<
  { name: string; normalizedName: string }[]
> => {
  try {
    const templates = await db.mcpServerTemplate.findMany({
      where: {
        transportType: TransportType.STDIO,
        organizationId: config.officialOrganizationId,
        command: { not: null },
      },
      select: {
        name: true,
        normalizedName: true,
      },
    });

    return templates;
  } catch (error) {
    logError("Failed to list available servers", error as Error);
    throw error;
  }
};
