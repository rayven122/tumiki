import { ipcMain } from "electron";
import { z } from "zod";
import * as mcpService from "./mcp.service";
import type { CreateFromCatalogInput } from "./mcp.types";
import * as logger from "../../shared/utils/logger";

// IPC入力のバリデーションスキーマ
const createFromCatalogSchema = z.object({
  catalogId: z.number().int(),
  catalogName: z.string().min(1),
  description: z.string(),
  transportType: z.enum(["STDIO", "SSE", "STREAMABLE_HTTP"]),
  command: z.string().nullable(),
  args: z.string(),
  url: z.string().nullable(),
  credentialKeys: z.array(z.string()),
  credentials: z.record(z.string(), z.string()),
  authType: z.enum(["NONE", "BEARER", "API_KEY", "OAUTH"]),
}) satisfies z.ZodType<CreateFromCatalogInput>;

/**
 * MCP関連の IPC ハンドラーを設定
 */
export const setupMcpIpc = (): void => {
  // カタログからMCPサーバーを登録
  ipcMain.handle("mcp:createFromCatalog", async (_, input: unknown) => {
    try {
      const validated = createFromCatalogSchema.parse(input);
      return await mcpService.createFromCatalog(validated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to create MCP server from catalog",
        error instanceof Error ? error : { error },
      );
      throw new Error(`MCPサーバーの登録に失敗しました: ${message}`);
    }
  });

  // 登録済みMCPサーバー一覧取得
  ipcMain.handle("mcp:getAll", async () => {
    try {
      return await mcpService.getAllServers();
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to get MCP server list",
        error instanceof Error ? error : { error },
      );
      throw new Error(`MCPサーバー一覧の取得に失敗しました: ${message}`);
    }
  });
};
