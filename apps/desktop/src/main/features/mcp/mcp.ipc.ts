import { ipcMain } from "electron";
import * as mcpService from "./mcp.service";
import type { CreateFromCatalogInput } from "./mcp.service";
import * as logger from "../../shared/utils/logger";

/**
 * MCP関連の IPC ハンドラーを設定
 */
export const setupMcpIpc = (): void => {
  // カタログからMCPサーバーを登録
  ipcMain.handle("mcp:createFromCatalog", async (_, input: unknown) => {
    try {
      return await mcpService.createFromCatalog(
        input as CreateFromCatalogInput,
      );
    } catch (error) {
      logger.error(
        "Failed to create MCP server from catalog",
        error instanceof Error ? error : { error },
      );
      throw new Error("MCPサーバーの登録に失敗しました");
    }
  });

  // 登録済みMCPサーバー一覧取得
  ipcMain.handle("mcp:getAll", async () => {
    try {
      return await mcpService.getAllServers();
    } catch (error) {
      logger.error(
        "Failed to get MCP server list",
        error instanceof Error ? error : { error },
      );
      throw new Error("MCPサーバー一覧の取得に失敗しました");
    }
  });

  // 登録済みMCP接続一覧取得
  ipcMain.handle("mcp:getAllConnections", async () => {
    try {
      return await mcpService.getAllConnections();
    } catch (error) {
      logger.error(
        "Failed to get MCP connection list",
        error instanceof Error ? error : { error },
      );
      throw new Error("MCP接続一覧の取得に失敗しました");
    }
  });
};
