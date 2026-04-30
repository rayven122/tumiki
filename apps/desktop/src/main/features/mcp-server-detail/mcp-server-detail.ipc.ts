import { ipcMain } from "electron";
import { z } from "zod";
import * as service from "./mcp-server-detail.service";
import * as logger from "../../shared/utils/logger";

// IPC入力のバリデーションスキーマ
const serverIdSchema = z.number().int().positive();
const toggleToolSchema = z.object({
  toolId: z.number().int().positive(),
  isAllowed: z.boolean(),
});

/**
 * MCPサーバー詳細関連の IPC ハンドラーを設定
 */
export const setupMcpServerDetailIpc = (): void => {
  // MCPサーバー詳細取得
  ipcMain.handle("mcp-server:getDetail", async (_, input: unknown) => {
    try {
      const serverId = serverIdSchema.parse(input);
      return await service.getServerDetail(serverId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to get MCP server detail",
        error instanceof Error ? error : { error },
      );
      throw new Error(`MCPサーバー詳細の取得に失敗しました: ${message}`);
    }
  });

  // MCPツール isAllowed 切替
  ipcMain.handle("mcp-server:toggleTool", async (_, input: unknown) => {
    try {
      const { toolId, isAllowed } = toggleToolSchema.parse(input);
      return await service.toggleTool(toolId, isAllowed);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to toggle MCP tool",
        error instanceof Error ? error : { error },
      );
      throw new Error(`MCPツールの切替に失敗しました: ${message}`);
    }
  });
};
