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
  // OAuth認証はミドルウェアで処理済みのため、ここでは通常の処理を実行
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
  // OAuth認証はミドルウェアで処理済みのため、ここでは通常の処理を実行
  await transportHandleSSEMessage(req, res);
};
