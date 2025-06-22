import { type Response } from "express";
import {
  establishSSEConnection,
  handleSSEMessage,
} from "../services/connection.js";
import { logger } from "../lib/logger.js";
import { type AuthenticatedRequest } from "../middleware/auth.js";

/**
 * SSE接続確立エンドポイント
 * GET /sse - SSE接続を確立
 */
export const handleSSEConnection = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  console.log("SSE endpoint - session exists:", !!req.session);
  console.log("SSE endpoint - user:", req.session?.user);
  logger.info("SSE connection endpoint called", {
    hasSession: !!req.session,
    userId: req.session?.user?.id,
  });
  await establishSSEConnection(req, res);
};

/**
 * SSEメッセージ処理エンドポイント
 * POST /messages - SSEメッセージを処理
 */
export const handleSSEMessages = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  logger.info("SSE messages endpoint called");
  await handleSSEMessage(req, res);
};
