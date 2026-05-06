import { ipcMain } from "electron";
import { z } from "zod";
import * as logger from "../../shared/utils/logger";
import {
  getPreview,
  writeConfig,
  AiClientWriteError,
} from "./ai-client.service";

const previewInputSchema = z.string().min(1);

const writeInputSchema = z.object({
  clientId: z.string().min(1),
  entries: z.record(
    z.string().min(1),
    z.object({
      command: z.string().min(1),
      args: z.array(z.string()),
      env: z.record(z.string(), z.string()).optional(),
    }),
  ),
  removeSlugs: z.array(z.string().min(1)).optional(),
});

const errorMessage = (error: unknown): string => {
  if (error instanceof AiClientWriteError) return error.message;
  if (error instanceof Error) return error.message;
  return "予期しないエラーが発生しました";
};

export const setupAiClientIpc = (): void => {
  ipcMain.handle("aiClient:getPreview", async (_, clientId: unknown) => {
    try {
      const parsed = previewInputSchema.parse(clientId);
      return await getPreview(parsed);
    } catch (error) {
      logger.error("Failed to get AI client preview", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(errorMessage(error));
    }
  });

  ipcMain.handle("aiClient:writeConfig", async (_, request: unknown) => {
    try {
      const parsed = writeInputSchema.parse(request);
      return await writeConfig(parsed);
    } catch (error) {
      logger.error("Failed to write AI client config", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(errorMessage(error));
    }
  });
};
