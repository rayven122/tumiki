import { type Request, type Response } from "express";
import { logger } from "../../infrastructure/utils/logger.js";

/**
 * ヘルスチェック用のルートハンドラー
 */
export const handleHealthCheck = (_req: Request, res: Response): void => {
  logger.info("Received GET request to root endpoint");
  res.send("MCP Proxy Server is running. Use /mcp to establish an SSE stream.");
};
