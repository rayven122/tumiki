import { ipcMain } from "electron";
import { z } from "zod";
import * as catalogService from "./catalog.service";
import * as logger from "../../shared/utils/logger";

const addFromCatalogSchema = z.object({
  catalogId: z.string().min(1),
  serverName: z.string().min(1),
  description: z.string(),
  status: z.enum(["available", "request_required", "disabled"]),
  permissions: z.object({
    read: z.boolean(),
    write: z.boolean(),
    execute: z.boolean(),
  }),
  connectionTemplate: z.object({
    transportType: z.enum(["STDIO", "SSE", "STREAMABLE_HTTP"]),
    command: z.string().nullable(),
    args: z.array(z.string()),
    url: z.string().nullable(),
    authType: z.enum(["NONE", "BEARER", "API_KEY", "OAUTH"]),
    credentialKeys: z.array(z.string()),
  }),
  tools: z.array(
    z.object({
      name: z.string().min(1),
      allowed: z.boolean(),
    }),
  ),
  credentials: z.record(z.string(), z.string()),
});

/**
 * カタログ関連の IPC ハンドラーを設定
 */
export const setupCatalogIpc = (): void => {
  ipcMain.handle("catalog:getAll", async () => {
    try {
      return await catalogService.getAllCatalogs();
    } catch (error) {
      logger.error(
        "Failed to get catalog list",
        error instanceof Error ? error : { error },
      );
      throw new Error("カタログ一覧の取得に失敗しました");
    }
  });

  ipcMain.handle("catalog:getLocalAll", async () => {
    try {
      return await catalogService.getAllLocalCatalogs();
    } catch (error) {
      logger.error(
        "Failed to get local catalog list",
        error instanceof Error ? error : { error },
      );
      throw new Error("ローカルカタログ一覧の取得に失敗しました");
    }
  });

  ipcMain.handle("catalog:add", async (_, input: unknown) => {
    try {
      const validated = addFromCatalogSchema.parse(input);
      return await catalogService.addFromCatalog(validated);
    } catch (error) {
      logger.error(
        "Failed to add from catalog",
        error instanceof Error ? error : { error },
      );
      const detail = error instanceof Error ? `: ${error.message}` : "";
      throw new Error(`カタログからのMCP登録に失敗しました${detail}`);
    }
  });
};
