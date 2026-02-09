/**
 * MCP Request Log Utility
 *
 * MCPツール実行のログをDBに記録するユーティリティ関数。
 * ミドルウェア経由でもdirect call経由でも使用可能。
 */

import {
  db,
  type Prisma,
  PiiMaskingMode,
  type TransportType,
} from "@tumiki/db/server";
import { logError, logInfo } from "../../../../shared/logger/index.js";
import { byteLength } from "../../../../shared/utils/byteLength.js";
import { countTokens } from "../../../../shared/utils/tokenCount.js";
import { publishMcpLog } from "../../../../infrastructure/pubsub/mcpLogger.js";

/**
 * MCPリクエストログの入力パラメータ
 */
export type LogMcpRequestParams = {
  /** MCPサーバーID */
  mcpServerId: string;
  /** 組織ID */
  organizationId: string;
  /** ユーザーID */
  userId: string;
  /** ツール名 */
  toolName: string;
  /** トランスポートタイプ */
  transportType?: TransportType;
  /** 実行時間（ミリ秒） */
  durationMs: number;
  /** リクエストボディ */
  requestBody: unknown;
  /** レスポンスボディ */
  responseBody: unknown;
  /** HTTPステータス */
  httpStatus?: number;
  /** エラーコード */
  errorCode?: number;
  /** エラーメッセージ */
  errorMessage?: string;
};

/**
 * MCP サーバー request log を記録
 *
 * @returns 作成されたログのID、エラー時はnull
 */
const saveMcpRequestLog = async (
  data: Prisma.McpServerRequestLogUncheckedCreateInput,
): Promise<string | null> => {
  try {
    const requestLog = await db.mcpServerRequestLog.create({ data });

    logInfo("MCP server request logged", {
      requestLogId: requestLog.id,
      mcpServerId: data.mcpServerId,
      toolName: data.toolName,
      durationMs: data.durationMs,
    });

    return requestLog.id;
  } catch (error) {
    logError("Failed to log MCP server request", error as Error, {
      mcpServerId: data.mcpServerId,
      toolName: data.toolName,
    });
    return null;
  }
};

/**
 * MCPリクエストをログに記録（DB + BigQuery）
 *
 * agent/chatからの直接呼び出し用。
 * ミドルウェアを経由しない場合でもログを記録する。
 *
 * @param params - ログパラメータ
 */
export const logMcpRequest = async (
  params: LogMcpRequestParams,
): Promise<void> => {
  const {
    mcpServerId,
    organizationId,
    userId,
    toolName,
    transportType = "STREAMABLE_HTTPS",
    durationMs,
    requestBody,
    responseBody,
    httpStatus = 200,
    errorCode,
    errorMessage,
  } = params;

  // バイト数を計算
  const inputBytes = byteLength(JSON.stringify(requestBody));
  const outputBytes = byteLength(JSON.stringify(responseBody));

  // トークン数を計算
  const inputTokens = countTokens(JSON.stringify(requestBody));
  const outputTokens = countTokens(JSON.stringify(responseBody));

  // PostgreSQL用ログデータ
  const postgresLogData = {
    mcpServerId,
    mcpApiKeyId: null,
    userId,
    organizationId,
    toolName,
    transportType,
    method: "tools/call",
    httpStatus,
    durationMs,
    inputBytes,
    outputBytes,
    userAgent: "tumiki-agent",
    piiMaskingMode: PiiMaskingMode.DISABLED,
    toonConversionEnabled: false,
    inputTokens,
    outputTokens,
  };

  // PostgreSQLにログ記録
  const requestLogId = await saveMcpRequestLog(postgresLogData).catch(
    (error) => {
      logError(
        "Failed to log MCP server request in direct call",
        error as Error,
        {
          toolName,
          mcpServerId,
        },
      );
      return null;
    },
  );

  // BigQueryへ非同期送信
  await publishMcpLog({
    ...postgresLogData,
    id: requestLogId ?? crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    requestBody,
    responseBody,
    errorCode,
    errorMessage,
    postgresLogFailed: requestLogId === null,
  });
};
