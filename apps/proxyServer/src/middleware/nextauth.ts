import type { Request, Response, NextFunction } from "express";
import { authMiddleware } from "./auth";

/**
 * NextAuth認証ミドルウェア
 * Managerアプリと同じセッションを使用してユーザー認証を行う
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return authMiddleware(req, res, next);
}