import { getDb } from "../../shared/db";
import * as repository from "./mcp-server-detail.repository";
import type {
  McpServerDetailItem,
  McpToolItem,
} from "./mcp-server-detail.types";

/**
 * MCPサーバー詳細情報を取得
 * Date→string変換を行いIPC通信用の型に変換する
 */
export const getServerDetail = async (
  serverId: number,
): Promise<McpServerDetailItem | null> => {
  const db = await getDb();
  const server = await repository.findByIdWithDetails(db, serverId);

  if (!server) return null;

  return {
    ...server,
    createdAt: server.createdAt.toISOString(),
    updatedAt: server.updatedAt.toISOString(),
    connections: server.connections.map((conn) => ({
      id: conn.id,
      name: conn.name,
      slug: conn.slug,
      transportType: conn.transportType,
      command: conn.command,
      args: conn.args,
      url: conn.url,
      authType: conn.authType,
      isEnabled: conn.isEnabled,
      catalogId: conn.catalogId,
      createdAt: conn.createdAt.toISOString(),
      updatedAt: conn.updatedAt.toISOString(),
      catalog: conn.catalog,
      tools: conn.tools.map((tool) => ({
        ...tool,
        createdAt: tool.createdAt.toISOString(),
        updatedAt: tool.updatedAt.toISOString(),
      })),
    })),
  };
};

/**
 * MCPツールの許可フラグ(isAllowed)を切り替え
 */
export const toggleTool = async (
  toolId: number,
  isAllowed: boolean,
): Promise<McpToolItem> => {
  const db = await getDb();
  const updated = await repository.updateToolAllowed(db, toolId, isAllowed);
  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
};
