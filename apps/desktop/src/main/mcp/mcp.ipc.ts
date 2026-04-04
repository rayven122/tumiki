import { ipcMain } from "electron";
import { z } from "zod";
import * as mcpService from "./mcp.service";
import * as logger from "../shared/utils/logger";

// IPC入力のバリデーションスキーマ
const callToolSchema = z.object({
  name: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()),
});

/**
 * MCP関連の IPC ハンドラーを設定
 */
export const setupMcpProxyIpc = (): void => {
  // MCPサーバー起動
  ipcMain.handle("mcp:start", async () => {
    try {
      return await mcpService.startMcpServers();
    } catch (error) {
      logger.error(
        "MCPサーバーの起動に失敗しました",
        error instanceof Error ? error : { error },
      );
      const message = error instanceof Error ? error.message : "不明なエラー";
      throw new Error(`MCPサーバーの起動に失敗しました: ${message}`, {
        cause: error,
      });
    }
  });

  // MCPサーバー停止
  ipcMain.handle("mcp:stop", async () => {
    try {
      await mcpService.stopMcpServers();
    } catch (error) {
      logger.error(
        "MCPサーバーの停止に失敗しました",
        error instanceof Error ? error : { error },
      );
      const message = error instanceof Error ? error.message : "不明なエラー";
      throw new Error(`MCPサーバーの停止に失敗しました: ${message}`, {
        cause: error,
      });
    }
  });

  // ツール一覧取得
  ipcMain.handle("mcp:list-tools", async () => {
    try {
      return await mcpService.listMcpTools();
    } catch (error) {
      logger.error(
        "ツール一覧の取得に失敗しました",
        error instanceof Error ? error : { error },
      );
      const message = error instanceof Error ? error.message : "不明なエラー";
      throw new Error(`ツール一覧の取得に失敗しました: ${message}`, {
        cause: error,
      });
    }
  });

  // ツール実行
  ipcMain.handle("mcp:call-tool", async (_event, params: unknown) => {
    try {
      const validated = callToolSchema.parse(params);
      return await mcpService.callMcpTool(
        validated.name,
        validated.arguments as Record<string, unknown>,
      );
    } catch (error) {
      logger.error(
        "ツール実行に失敗しました",
        error instanceof Error ? error : { error },
      );
      const message = error instanceof Error ? error.message : "不明なエラー";
      throw new Error(`ツール実行に失敗しました: ${message}`, {
        cause: error,
      });
    }
  });

  // 状態取得
  ipcMain.handle("mcp:status", async () => {
    try {
      return await mcpService.getMcpStatus();
    } catch (error) {
      logger.error(
        "状態取得に失敗しました",
        error instanceof Error ? error : { error },
      );
      const message = error instanceof Error ? error.message : "不明なエラー";
      throw new Error(`状態取得に失敗しました: ${message}`, { cause: error });
    }
  });
};
