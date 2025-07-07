import { db } from "@tumiki/db/tcp";
import { type TransportType } from "@tumiki/db/prisma";
import { logger } from "./logger.js";

type LogRequestParams = {
  userId?: string;
  mcpServerInstanceId: string;
  toolName: string;
  transportType: TransportType;
  method: string;
  responseStatus: string;
  durationMs: number;
  errorMessage?: string;
  errorCode?: string;
  inputBytes?: number;
  outputBytes?: number;
  organizationId?: string;
  userAgent?: string;
};

/**
 * MCPサーバーリクエストログを記録する
 */
export const logMcpRequest = async (
  params: LogRequestParams,
): Promise<void> => {
  try {
    await db.mcpServerRequestLog.create({
      data: {
        userId: params.userId,
        mcpServerInstanceId: params.mcpServerInstanceId,
        toolName: params.toolName,
        transportType: params.transportType,
        method: params.method,
        responseStatus: params.responseStatus,
        durationMs: params.durationMs,
        errorMessage: params.errorMessage,
        errorCode: params.errorCode,
        inputBytes: params.inputBytes,
        outputBytes: params.outputBytes,
        organizationId: params.organizationId,
        userAgent: params.userAgent,
      },
    });

    logger.debug("MCP request logged successfully", {
      toolName: params.toolName,
      responseStatus: params.responseStatus,
      durationMs: params.durationMs,
    });
  } catch (error) {
    // ログ記録の失敗はサービス全体を停止させない
    logger.error("Failed to log MCP request", {
      toolName: params.toolName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * データサイズを計算する（バイト数）
 */
export const calculateDataBytes = (data: unknown): number => {
  const jsonString = JSON.stringify(data);
  return Buffer.byteLength(jsonString, "utf8");
};

/**
 * リクエスト/レスポンスからデータサイズを計算（バイト数）
 */
export const calculateDataUsage = (
  requestData: unknown,
  responseData: unknown,
): { inputBytes: number; outputBytes: number } => {
  return {
    inputBytes: calculateDataBytes(requestData),
    outputBytes: calculateDataBytes(responseData),
  };
};
