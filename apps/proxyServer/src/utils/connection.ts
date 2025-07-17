import { type Request, type Response } from "express";
import {
  establishSSEConnection as transportEstablishSSEConnection,
  handleSSEMessage as transportHandleSSEMessage,
} from "./transport.js";

/**
 * SSE接続確立
 * GET /sse - SSE接続を確立
 */
export const establishSSEConnection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await transportEstablishSSEConnection(req, res);
};

/**
 * SSEメッセージ処理
 * POST /messages - SSEメッセージを処理
 */
export const handleSSEMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await transportHandleSSEMessage(req, res);
};
