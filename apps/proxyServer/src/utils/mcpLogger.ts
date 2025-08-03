import { logger } from "../libs/logger.js";
import { logMcpRequest } from "../libs/requestLogger.js";
import type { TransportType } from "@tumiki/db/prisma";
import type { ApiKeyValidationResult } from "../types/auth.js";

interface LogMcpRequestParams {
  validation: ApiKeyValidationResult;
  toolName: string;
  transportType: TransportType;
  method: string;
  responseStatus: string;
  durationMs: number;
  inputBytes?: number;
  outputBytes?: number;
  requestData?: string;
  responseData?: string;
  errorMessage?: string;
  errorCode?: string;
  isValidationMode?: boolean;
}

/**
 * MCP リクエストのログ記録を共通化
 */
export const logMcpRequestWithValidation = async ({
  validation,
  toolName,
  transportType,
  method,
  responseStatus,
  durationMs,
  inputBytes,
  outputBytes,
  requestData,
  responseData,
  errorMessage,
  errorCode,
  isValidationMode = false,
}: LogMcpRequestParams): Promise<void> => {
  // 検証モードまたは無効な認証の場合はログを記録しない
  if (isValidationMode || !validation.valid) {
    return;
  }

  try {
    await logMcpRequest({
      userId: validation.apiKey.userId,
      mcpServerInstanceId: validation.userMcpServerInstance.id,
      toolName,
      transportType,
      method,
      responseStatus,
      durationMs,
      inputBytes,
      outputBytes,
      organizationId:
        validation.userMcpServerInstance.organizationId ?? undefined,
      requestData,
      responseData,
      errorMessage,
      errorCode,
    });
  } catch (error) {
    // ログ記録失敗をログに残すが、リクエスト処理は継続
    logger.error(`Failed to log ${method} request`, {
      error: error instanceof Error ? error.message : String(error),
      toolName,
      userId: validation.apiKey.userId,
    });
  }
};

/**
 * MCP リクエストのエラーログ記録
 */
export const logMcpRequestError = async ({
  validation,
  toolName,
  transportType,
  method,
  error,
  durationMs,
  isValidationMode = false,
}: {
  validation: ApiKeyValidationResult;
  toolName: string;
  transportType: TransportType;
  method: string;
  error: unknown;
  durationMs: number;
  isValidationMode?: boolean;
}): Promise<void> => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = error instanceof Error ? error.name : "UnknownError";

  await logMcpRequestWithValidation({
    validation,
    toolName,
    transportType,
    method,
    responseStatus: "500",
    durationMs,
    errorMessage,
    errorCode,
    isValidationMode,
  });
};
