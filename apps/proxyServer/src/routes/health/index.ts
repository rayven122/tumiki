import type { RequestHandler } from "express";
import { logger } from "../../libs/logger.js";

/**
 * ヘルスチェック用のルートハンドラー
 */
export const handleHealthCheck: RequestHandler = (_req, res) => {
  logger.info("Received GET request to root endpoint");
  res.send("MCP Proxy Server is running. Use /mcp to establish an SSE stream.");
};
