import { db } from "@tumiki/db/tcp";
import { type TransportType } from "@tumiki/db";
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
  mcpServerInstanceId?: string;
  toolName: string;
  transportType: TransportType;
  method: string;
  responseStatus: string;
  durationMs: number;
  errorMessage?: string;
  errorCode?: string;
  inputBytes?: number;
  outputBytes?: number;
  organizationId: string;
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
    // mcpServerInstanceIdが未定義の場合はログ記録をスキップ
    if (!params.mcpServerInstanceId) {
      logger.debug("Skipping log record due to missing mcpServerInstanceId", {
        toolName: params.toolName,
        method: params.method,
      });
      return;
    }

    // データサイズ制限チェック（圧縮前の生データサイズで5MB制限）
    const maxDataSize = 5 * 1024 * 1024; // 5MB（圧縮前）
    let compressionResult: Awaited<
      ReturnType<typeof compressRequestResponseData>
    > | null = null;

    if (params.requestData && params.responseData) {
      const requestSize = JSON.stringify(params.requestData).length;
      const responseSize = JSON.stringify(params.responseData).length;

      if (requestSize > maxDataSize || responseSize > maxDataSize) {
        logger.warn(
          "Request/response data exceeds size limit, skipping detailed logging",
          {
            toolName: params.toolName,
            requestSize,
            responseSize,
            maxDataSize,
          },
        );
      } else {
        // 詳細データがある場合は事前に圧縮（トランザクション外で重い処理を実行）
        compressionResult = await compressRequestResponseData(
          params.requestData,
          params.responseData,
        );
      }
    }

    // データベースアクセスをトランザクションで原子性を保証
    // 基本ログと詳細データを一つのクエリで作成
    await db.mcpServerRequestLog.create({
      data: {
        userId: params.userId || null,
        mcpServerInstanceId: params.mcpServerInstanceId, // 事前チェック済み
        toolName: params.toolName,
        transportType: params.transportType,

        method: params.method,
        responseStatus: params.responseStatus,
        durationMs: params.durationMs,
        errorMessage: params.errorMessage || null,
        errorCode: params.errorCode || null,
        inputBytes: params.inputBytes || null,
        outputBytes: params.outputBytes || null,
        organizationId: params.organizationId,
        userAgent: params.userAgent || null,
        // ネストされたrequestData作成
        requestData: compressionResult
          ? {
              create: {
                inputDataCompressed: compressionResult.inputDataCompressed,
                outputDataCompressed: compressionResult.outputDataCompressed,
                originalInputSize: compressionResult.originalInputSize,
                originalOutputSize: compressionResult.originalOutputSize,
                compressedInputSize:
                  compressionResult.inputDataCompressed.length,
                compressedOutputSize:
                  compressionResult.outputDataCompressed.length,
                compressionRatio: compressionResult.compressionRatio,
              },
            }
          : undefined,
      },
    });
  } catch (error) {
    // ログ記録の失敗はサービス全体を停止させない
    logger.error("Failed to log MCP request", {
      toolName: sanitizeForLog(params.toolName),
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
