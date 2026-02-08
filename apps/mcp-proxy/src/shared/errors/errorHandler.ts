import type { Context } from "hono";
import { logError, sanitizeIdForLog } from "../logger/index.js";
import type { HonoEnv } from "../types/honoEnv.js";
import { createMcpError } from "./mcpError.js";

type ErrorHandlerOptions = {
  requestId: string | number | null | undefined;
  errorCode: number;
  errorMessage: string;
  organizationId: string;
  instanceId: string;
  logMessage: string;
  additionalMetadata?: Record<string, unknown>;
};

/**
 * 共通エラーハンドラー
 * エラーログの出力とJSON-RPCエラーレスポンスの生成を行う
 */
export const handleError = (
  c: Context<HonoEnv>,
  error: Error,
  options: ErrorHandlerOptions,
) => {
  const {
    requestId,
    errorCode,
    errorMessage,
    organizationId,
    instanceId,
    logMessage,
    additionalMetadata,
  } = options;

  // エラーログでは機密情報をハッシュ化
  logError(logMessage, error, {
    organizationId: sanitizeIdForLog(organizationId),
    instanceId: sanitizeIdForLog(instanceId),
    ...additionalMetadata,
  });

  // JSON-RPC 2.0形式のエラーレスポンスを返す
  return c.json(
    createMcpError(
      errorCode,
      errorMessage,
      {
        message: error.message,
      },
      requestId ?? null,
    ),
  );
};
