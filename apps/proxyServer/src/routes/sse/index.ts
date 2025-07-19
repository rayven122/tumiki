import { type Request, type Response } from "express";
import {
  establishSSEConnection,
  handleSSEMessage,
} from "../../utils/connection.js";
import { logger } from "../../libs/logger.js";

/**
 * SSE接続確立エンドポイント
 * GET /sse - SSE接続を確立
 */
export const handleSSEConnection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  logger.info("SSE connection endpoint called");
  await establishSSEConnection(req, res);
};

/**
 * SSEメッセージ処理エンドポイント
 * POST /messages - SSEメッセージを処理
 */
export const handleSSEMessages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  logger.info("SSE messages endpoint called");
  await handleSSEMessage(req, res);
};
