import { ipcMain } from "electron";
import { z } from "zod";
import * as service from "./mcp-server-detail.service";
import * as logger from "../../shared/utils/logger";

// IPC入力のバリデーションスキーマ
const serverIdSchema = z.number().int().positive();

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
};
