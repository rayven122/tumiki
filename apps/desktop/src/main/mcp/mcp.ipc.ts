import { ipcMain } from "electron";
import * as mcpService from "./mcp.service";
import * as logger from "../shared/utils/logger";

/**
 * MCP関連の IPC ハンドラーを設定
 */
export const setupMcpIpc = (): void => {
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
  ipcMain.handle(
    "mcp:call-tool",
    async (
      _event,
      params: { name: string; arguments: Record<string, unknown> },
    ) => {
      try {
        return await mcpService.callMcpTool(params.name, params.arguments);
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
    },
  );

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
