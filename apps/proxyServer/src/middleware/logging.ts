import { type Request, type Response, type NextFunction } from "express";
import {
  extractContext,
  runWithContext,
  StructuredLogger,
} from "../libs/structuredLogger.js";
import type { AuthenticatedRequest } from "./integratedAuth.js";

/**
 * レスポンス情報を保存するための拡張
 */
interface ResponseWithLogging extends Response {
  _startTime?: number;
  _statusCode?: number;
}

/**
 * リクエスト/レスポンスのログを記録するミドルウェア
 */
export const loggingMiddleware = () => {
  return (
    req: Request | AuthenticatedRequest,
    res: ResponseWithLogging,
    next: NextFunction,
  ): void => {
    const context = extractContext(req);
    const startTime = Date.now();

    // レスポンスの開始時刻を記録
    res._startTime = startTime;

    // リクエストログ
    runWithContext(context, () => {
      StructuredLogger.info("Request received", {
        headers: {
          "content-type": req.headers["content-type"],
          "user-agent": req.headers["user-agent"],
          "x-client-id": req.headers["x-client-id"],
        },
        query: req.query,
        params: req.params,
      });
    });

    // レスポンス送信時のログ
    const originalSend = res.send;
    res.send = function (data: unknown) {
      res._statusCode = res.statusCode;
      const duration = Date.now() - (res._startTime || startTime);

      runWithContext(context, () => {
        StructuredLogger.info("Response sent", {
          statusCode: res.statusCode,
          duration,
          contentLength: res.get("content-length"),
        });
      });

      return originalSend.call(this, data);
    };

    // エラー時のログ
    res.on("error", (error) => {
      runWithContext(context, () => {
        StructuredLogger.error("Response error", error);
      });
    });

    // コンテキスト内で次のミドルウェアを実行
    runWithContext(context, () => {
      next();
    });
  };
};

/**
 * エラーハンドリングミドルウェア
 */
export const errorLoggingMiddleware = () => {
  return (
    err: Error,
    req: Request | AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    const context = extractContext(req);

    runWithContext(context, () => {
      StructuredLogger.error("Unhandled error", err, {
        statusCode: res.statusCode,
      });
    });

    // エラーレスポンスを送信
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          message: "Internal Server Error",
          code: "INTERNAL_ERROR",
        },
      });
    } else {
      next(err);
    }
  };
};
