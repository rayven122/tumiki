import type { Request } from "express";
import type { ParsedQs } from "qs";
import type { ParamsDictionary } from "express-serve-static-core";
import { AsyncLocalStorage } from "node:async_hooks";
import { logger } from "./logger.js";
import type { AuthenticatedRequest } from "../middleware/integratedAuth.js";

/**
 * ログコンテキスト情報
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  userMcpServerInstanceId?: string;
  organizationId?: string;
  clientId?: string;
  method?: string;
  path?: string;
  authType?: string;
}

/**
 * AsyncLocalStorageを使用してリクエストコンテキストを管理
 */
const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

/**
 * リクエストIDを生成
 */
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * リクエストからコンテキスト情報を抽出
 */
export const extractContext = <
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
>(
  req: Request<P, ResBody, ReqBody, ReqQuery> | AuthenticatedRequest,
): LogContext => {
  const authReq = req as AuthenticatedRequest;
  return {
    requestId: (req.headers["x-request-id"] as string) || generateRequestId(),
    userId: authReq.authInfo?.userId,
    userMcpServerInstanceId: authReq.authInfo?.userMcpServerInstanceId,
    organizationId: authReq.authInfo?.organizationId,
    clientId: (req.headers["x-client-id"] as string) || req.ip || "unknown",
    method: req.method,
    path: req.path,
    authType: authReq.authInfo?.type,
  };
};

/**
 * コンテキスト付きでコードを実行
 */
export const runWithContext = <T>(context: LogContext, fn: () => T): T => {
  return asyncLocalStorage.run(context, fn);
};

/**
 * 現在のコンテキストを取得
 */
const getCurrentContext = (): LogContext => {
  return asyncLocalStorage.getStore() || {};
};

/**
 * 構造化ログを出力するヘルパークラス
 */
export class StructuredLogger {
  /**
   * 情報ログ
   */
  static info(message: string, data?: Record<string, unknown>): void {
    const context = getCurrentContext();
    logger.info(message, {
      ...context,
      ...data,
    });
  }

  /**
   * エラーログ
   */
  static error(
    message: string,
    error?: unknown,
    data?: Record<string, unknown>,
  ): void {
    const context = getCurrentContext();
    logger.error(message, {
      ...context,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
      ...data,
    });
  }

  /**
   * 警告ログ
   */
  static warn(message: string, data?: Record<string, unknown>): void {
    const context = getCurrentContext();
    logger.warn(message, {
      ...context,
      ...data,
    });
  }

  /**
   * デバッグログ
   */
  static debug(message: string, data?: Record<string, unknown>): void {
    const context = getCurrentContext();
    logger.debug(message, {
      ...context,
      ...data,
    });
  }

  /**
   * パフォーマンス測定付きログ
   */
  static async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    data?: Record<string, unknown>,
  ): Promise<T> {
    const startTime = Date.now();
    const context = getCurrentContext();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      logger.info(`${operation} completed`, {
        ...context,
        operation,
        duration,
        status: "success",
        ...data,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(`${operation} failed`, {
        ...context,
        operation,
        duration,
        status: "error",
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : error,
        ...data,
      });

      throw error;
    }
  }
}

/**
 * エクスポート
 */
export { asyncLocalStorage as logContext };
