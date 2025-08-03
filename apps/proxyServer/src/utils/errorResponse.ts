import type { Response } from "express";
import { logger } from "../libs/logger.js";

interface ErrorResponse {
  jsonrpc?: string;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
  id?: unknown;
}

/**
 * 統一されたエラーレスポンスを送信
 */
export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  errorCode = "SERVER_ERROR",
  additionalData?: unknown,
): void => {
  const errorResponse: ErrorResponse = {
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message,
      data: additionalData,
    },
    id: null,
  };

  logger.error("Error response", {
    statusCode,
    errorCode,
    message,
    additionalData,
  });

  res.status(statusCode).json(errorResponse);
};

/**
 * 認証エラーレスポンスを送信
 */
export const sendAuthErrorResponse = (
  res: Response,
  message: string,
  additionalData?: unknown,
): void => {
  sendErrorResponse(res, 401, message, "AUTH_FAILED", additionalData);
};

/**
 * バリデーションエラーレスポンスを送信
 */
export const sendValidationErrorResponse = (
  res: Response,
  message: string,
  additionalData?: unknown,
): void => {
  sendErrorResponse(res, 400, message, "VALIDATION_ERROR", additionalData);
};

/**
 * サーバーエラーレスポンスを送信
 */
export const sendServerErrorResponse = (
  res: Response,
  message = "Internal Server Error",
  additionalData?: unknown,
): void => {
  sendErrorResponse(res, 500, message, "SERVER_ERROR", additionalData);
};
