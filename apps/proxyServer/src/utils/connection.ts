import { type Request, type Response } from "express";
import { logger } from "../libs/logger.js";

/**
 * SSE接続確立（プレースホルダー実装）
 * 注: services/connection.ts が削除されたため、新しい実装が必要
 */
export const establishSSEConnection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  logger.warn("SSE connection functionality needs to be reimplemented", {
    url: req.url,
    method: req.method,
  });

  res.status(501).json({
    error: "SSE connection functionality is being refactored",
    message: "Please use the /mcp endpoint with Streamable HTTP transport",
  });
};

/**
 * SSEメッセージ処理（プレースホルダー実装）
 * 注: services/connection.ts が削除されたため、新しい実装が必要
 */
export const handleSSEMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  logger.warn("SSE message handling functionality needs to be reimplemented", {
    url: req.url,
    method: req.method,
  });

  res.status(501).json({
    error: "SSE message handling functionality is being refactored",
    message: "Please use the /mcp endpoint with Streamable HTTP transport",
  });
};
