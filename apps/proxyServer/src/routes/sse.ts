import { type Request, type Response } from "express";
import { establishConnection } from "../services/connection.js";
import { logger } from "../lib/logger.js";

/**
 * SSE接続確立用のルートハンドラー
 */
export const handleSSEConnection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  logger.info("Received GET request to establish SSE stream");
  await establishConnection(req, res);
};
