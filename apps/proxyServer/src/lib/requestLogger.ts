import { db } from "@tumiki/db/tcp";
import { type TransportType } from "@tumiki/db/prisma";
import { logger } from "./logger.js";
import { compressRequestResponseData } from "./dataCompression.js";

/**
 * ログ出力用に機密情報をマスクする
 */
const sanitizeForLog = (toolName: string): string => {
  // API キーやトークンを含む可能性があるツール名をマスク
  const sensitivePatterns = [
    /api[_-]?key/i,
    /token/i,
    /secret/i,
    /password/i,
    /credential/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(toolName)) {
      return toolName.replace(/[a-zA-Z0-9]/g, "*");
    }
  }

  return toolName;
};

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
    // 詳細データがある場合は事前に圧縮（トランザクション外で重い処理を実行）
    let compressionResult: Awaited<
      ReturnType<typeof compressRequestResponseData>
    > | null = null;
    if (params.requestData && params.responseData) {
      compressionResult = await compressRequestResponseData(
        params.requestData,
        params.responseData,
      );
    }

    // データベースアクセスをトランザクションで原子性を保証
    await db.$transaction(async (tx) => {
      // 基本ログを作成
      const requestLog = await tx.mcpServerRequestLog.create({
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

      // 詳細データがある場合は関連レコードを作成
      if (compressionResult) {
        const {
          inputDataCompressed,
          outputDataCompressed,
          originalInputSize,
          originalOutputSize,
          compressionRatio,
        } = compressionResult;

        await tx.mcpServerRequestData.create({
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
      }
    });

    // ログ出力（トランザクション成功後）
    if (compressionResult) {
      logger.debug("MCP request with detailed data logged successfully", {
        toolName: sanitizeForLog(params.toolName),
        responseStatus: params.responseStatus,
        durationMs: params.durationMs,
        originalInputSize: compressionResult.originalInputSize,
        originalOutputSize: compressionResult.originalOutputSize,
        compressionRatio:
          Math.round(compressionResult.compressionRatio * 100) / 100,
      });
    } else {
      logger.debug("MCP request logged successfully", {
        toolName: sanitizeForLog(params.toolName),
        responseStatus: params.responseStatus,
        durationMs: params.durationMs,
      });
    }
  } catch (error) {
    // ログ記録の失敗はサービス全体を停止させない
    logger.error("Failed to log MCP request", {
      toolName: sanitizeForLog(params.toolName),
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
