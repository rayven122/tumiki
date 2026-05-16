import { ipcMain } from "electron";
import { syncMcpPolicies } from "./mcp-policy-sync.service";
import * as logger from "../../shared/utils/logger";

/**
 * MCP ポリシー同期 IPC ハンドラー
 * - mcpPolicySync:sync : manager から MCP 設定を取得してローカル DB に適用
 */
export const setupMcpPolicySyncIpc = (): void => {
  ipcMain.handle("mcpPolicySync:sync", async () => {
    try {
      return await syncMcpPolicies();
    } catch (error) {
      logger.error("MCP policy sync failed", { error });
      throw error;
    }
  });
};
