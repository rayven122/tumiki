import { db } from "@tumiki/db/tcp";
import { type TransportType } from "@tumiki/db/prisma";
import { logger } from "./logger.js";
import {
  compressRequestResponseData,
  calculateDataSize,
} from "./dataCompression.js";

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
  // 詳細データ用の追加パラメータ
  requestData?: unknown;
  responseData?: unknown;
};

/**
 * MCPサーバーリクエストログを記録する
 */
export const logMcpRequest = async (
  params: LogRequestParams,
): Promise<void> => {
  try {
    // 基本ログを作成
    const requestLog = await db.mcpServerRequestLog.create({
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

    // 詳細データがある場合は圧縮して保存
    if (params.requestData && params.responseData) {
      const {
        inputDataCompressed,
        outputDataCompressed,
        originalInputSize,
        originalOutputSize,
        compressionRatio,
      } = await compressRequestResponseData(
        params.requestData,
        params.responseData,
      );

      await db.mcpServerRequestData.create({
        data: {
          requestLogId: requestLog.id,
          inputDataCompressed,
          outputDataCompressed,
          originalInputSize,
          originalOutputSize,
          compressedInputSize: inputDataCompressed.length,
          compressedOutputSize: outputDataCompressed.length,
          compressionRatio,
        },
      });

      logger.debug("MCP request with detailed data logged successfully", {
        toolName: params.toolName,
        responseStatus: params.responseStatus,
        durationMs: params.durationMs,
        originalInputSize,
        originalOutputSize,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
      });
    } else {
      logger.debug("MCP request logged successfully", {
        toolName: params.toolName,
        responseStatus: params.responseStatus,
        durationMs: params.durationMs,
      });
    }
  } catch (error) {
    // ログ記録の失敗はサービス全体を停止させない
    logger.error("Failed to log MCP request", {
      toolName: params.toolName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * リクエスト/レスポンスからデータサイズを計算（バイト数）
 */
export const calculateDataUsage = <TRequest, TResponse>(
  requestData: TRequest,
  responseData: TResponse,
): { inputBytes: number; outputBytes: number } => {
  return {
    inputBytes: calculateDataSize(requestData),
    outputBytes: calculateDataSize(responseData),
  };
};
