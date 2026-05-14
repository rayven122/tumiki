import { ipcMain } from "electron";
import { z } from "zod";
import * as service from "./ai-coding-telemetry.service";
import * as logger from "../../shared/utils/logger";
import type { AiCodingTool } from "./ai-coding-telemetry.types";

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
});

// 起動中の OTLP レシーバーポートを保持する
let _receiverPort = 0;

// レシーバー起動後にポートを設定する
export const setReceiverPort = (port: number): void => {
  _receiverPort = port;
};

// 起動時の自動再書き込み結果を保持する（renderer 起動完了後に取得させるため）。
// `getPendingAutoReapplied` で取得され、消費されるとクリアされる。
// TODO: マルチウィンドウ対応時は全ウィンドウへ push 通知する方式に変更する。
// 現在はシングルウィンドウ前提のため、最初の renderer が取得した時点で消費する。
let _pendingAutoReapplied: { tools: AiCodingTool[]; port: number } | null =
  null;

export const setPendingAutoReapplied = (
  tools: AiCodingTool[],
  port: number,
): void => {
  if (tools.length === 0) {
    _pendingAutoReapplied = null;
    return;
  }
  _pendingAutoReapplied = { tools, port };
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

  // 起動時の自動再書き込み結果を取得し、取得後はクリアする。
  // renderer がマウント直後に呼ぶことで、push 通知の取りこぼしを防ぐ。
  ipcMain.handle("aiCodingTelemetry:getPendingAutoReapplied", () => {
    const pending = _pendingAutoReapplied;
    _pendingAutoReapplied = null;
    return pending;
  });

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
      if (_receiverPort <= 0) {
        throw new Error("OTLP レシーバーが起動していません");
      }
      return await service.applyToolSettings({
        tool: validated.tool,
        port: _receiverPort,
      });
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
