import type { McpServerConfig } from "../../../../domain/types/mcpServer.js";
import { ServerNotFoundError } from "../../../../domain/errors/serverNotFoundError.js";
import { getStdioServerByName } from "../../../../infrastructure/db/repositories/mcpServerTemplateRepository.js";

export type GetServerConfigQuery = {
  readonly serverName: string;
};

/**
 * MCPサーバー設定を取得
 */
export const getServerConfigQuery = async (
  query: GetServerConfigQuery,
): Promise<McpServerConfig> => {
  const serverConfig = await getStdioServerByName(query.serverName);

  if (!serverConfig) {
    throw new ServerNotFoundError(query.serverName);
  }

  return serverConfig;
};
