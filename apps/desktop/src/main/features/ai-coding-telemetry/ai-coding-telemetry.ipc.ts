import { ipcMain } from "electron";
import { z } from "zod";
import * as service from "./ai-coding-telemetry.service";
import * as logger from "../../shared/utils/logger";

// IPC 入力のバリデーションスキーマ
const getSummarySchema = z.object({
  days: z.number().int().min(1).max(365).default(7),
});

const getDailyUsageSchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
});

const toolSchema = z.enum(["claude-code", "codex"]);

const saveToolEnabledSchema = z.object({
  tool: toolSchema,
  enabled: z.boolean(),
});

const applyToToolSchema = z.object({
  tool: toolSchema,
  port: z.number().int().min(1).max(65535),
});

// 起動中の OTLP レシーバーポートを保持する
let _receiverPort = 0;

// レシーバー起動後にポートを設定する
export const setReceiverPort = (port: number): void => {
  _receiverPort = port;
};

// AI コーディングツール テレメトリ関連の IPC ハンドラーを登録する
export const setupAiCodingTelemetryIpc = (): void => {
  // 期間別サマリー取得（グラフ用）
  ipcMain.handle("aiCodingTelemetry:getSummary", async (_, input: unknown) => {
    try {
      const validated = getSummarySchema.parse(input);
      return await service.getSummary(validated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to get AI coding telemetry summary",
        error instanceof Error ? error : { error },
      );
      throw new Error(`テレメトリサマリーの取得に失敗しました: ${message}`);
    }
  });

  // 日別使用量取得（折れ線グラフ用）
  ipcMain.handle(
    "aiCodingTelemetry:getDailyUsage",
    async (_, input: unknown) => {
      try {
        const validated = getDailyUsageSchema.parse(input);
        return await service.getDailyUsage(validated);
      } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー";
        logger.error(
          "Failed to get AI coding telemetry daily usage",
          error instanceof Error ? error : { error },
        );
        throw new Error(`日別使用量の取得に失敗しました: ${message}`);
      }
    },
  );

  // OTLP レシーバーポートの取得
  ipcMain.handle("aiCodingTelemetry:getReceiverPort", () => _receiverPort);

  // ツールのテレメトリ設定取得
  ipcMain.handle(
    "aiCodingTelemetry:getToolSettings",
    async (_, tool: unknown) => {
      try {
        const validated = toolSchema.parse(tool);
        return await service.getToolSettings(validated);
      } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー";
        logger.error(
          "Failed to get tool settings",
          error instanceof Error ? error : { error },
        );
        throw new Error(`ツール設定の取得に失敗しました: ${message}`);
      }
    },
  );

  // ツールのテレメトリ有効フラグ保存
  ipcMain.handle(
    "aiCodingTelemetry:saveToolEnabled",
    async (_, input: unknown) => {
      try {
        const validated = saveToolEnabledSchema.parse(input);
        await service.saveToolEnabled(validated.tool, validated.enabled);
      } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー";
        logger.error(
          "Failed to save tool enabled setting",
          error instanceof Error ? error : { error },
        );
        throw new Error(`ツール設定の保存に失敗しました: ${message}`);
      }
    },
  );

  // ツールの設定ファイルに OTLP env vars を書き込む
  ipcMain.handle("aiCodingTelemetry:applyToTool", async (_, input: unknown) => {
    try {
      const validated = applyToToolSchema.parse(input);
      return await service.applyToolSettings(validated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to apply OTLP settings to tool",
        error instanceof Error ? error : { error },
      );
      throw new Error(`ツールへの設定書き込みに失敗しました: ${message}`);
    }
  });
};
