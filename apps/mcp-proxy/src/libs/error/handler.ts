import type { Context } from "hono";
import { logError, sanitizeIdForLog } from "../logger/index.js";
import { createJsonRpcError } from "../jsonrpc/index.js";
import type { AuthInfo, HonoEnv } from "../../types/index.js";

type ErrorHandlerOptions = {
  requestId: string | number | null | undefined;
  errorCode: number;
  errorMessage: string;
  authInfo: AuthInfo;
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
    authInfo,
    instanceId,
    logMessage,
    additionalMetadata,
  } = options;

  // エラーログでは機密情報をハッシュ化
  logError(logMessage, error, {
    organizationId: sanitizeIdForLog(authInfo.organizationId),
    instanceId: sanitizeIdForLog(instanceId),
    ...additionalMetadata,
  });

  return c.json(
    createJsonRpcError(requestId, errorCode, errorMessage, {
      message: error.message,
    }),
  );
};
