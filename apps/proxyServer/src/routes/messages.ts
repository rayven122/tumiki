import { type Request, type Response } from "express";
import { handleMessage as handleMessageService } from "../services/messaging.js";

/**
 * POSTメッセージを処理するルートハンドラー
 */
export const handleMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await handleMessageService(req, res);
};
