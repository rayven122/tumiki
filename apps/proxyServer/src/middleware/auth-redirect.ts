import type { Request, Response, NextFunction } from "express";
import { getNextAuthToken, type AuthUser } from "@tumiki/auth";
import type { AuthenticatedRequest } from "../types/auth";

async function verifyNextAuthSession(req: Request): Promise<AuthUser | null> {
  try {
    const adaptedReq = {
      headers: req.headers as Record<string, string>,
      cookies: req.cookies as Record<string, string>,
    };

    const token = await getNextAuthToken(adaptedReq);

    if (!token) {
      return null;
    }

    return {
      id: token.sub!,
      email: token.email || undefined,
      name: token.name || undefined,
      role: token.role,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

/**
 * 認証が必要で、失敗時にManagerアプリへリダイレクトするミドルウェア
 * SSEエンドポイント用に最適化されている
 */
export async function requireAuthWithRedirect(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await verifyNextAuthSession(req);

    if (!user) {
      // ブラウザからの直接アクセスかどうかを判定
      const acceptHeader = req.headers.accept || "";
      const userAgent = req.headers["user-agent"] || "";

      // SSEクライアントからのアクセス（プログラマティック）かブラウザかを判定
      if (acceptHeader.includes("text/event-stream")) {
        // SSEクライアントの場合は401 JSONを返す（リダイレクトは不可）
        res.status(401).json({
          error: "Unauthorized",
          message: "No valid session found. Please authenticate first.",
          authUrl: `${process.env.MANAGER_URL || "http://localhost:3000"}/api/auth/signin`,
          requiresRedirect: true,
        });
        return;
      } else if (
        acceptHeader.includes("text/html") ||
        userAgent.includes("Mozilla")
      ) {
        // ブラウザからのアクセスの場合はリダイレクト
        const returnUrl = encodeURIComponent(
          `${req.protocol}://${req.get("host")}${req.originalUrl}`,
        );
        const managerUrl = process.env.MANAGER_URL || "http://localhost:3000";
        const redirectUrl = `${managerUrl}/api/auth/signin?callbackUrl=${returnUrl}`;

        console.log(`Redirecting unauthenticated user to: ${redirectUrl}`);
        res.redirect(302, redirectUrl);
        return;
      }

      // API呼び出しの場合は401を返す
      res.status(401).json({
        error: "Unauthorized",
        message: "No valid session found. Please authenticate first.",
        authUrl: `${process.env.MANAGER_URL || "http://localhost:3000"}/api/auth/signin`,
        requiresRedirect: true,
      });
      return;
    }

    // 型安全な方法でユーザー情報を設定
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    // エラー時も適切にハンドリング
    const acceptHeader = req.headers.accept || "";

    if (acceptHeader.includes("text/event-stream")) {
      // SSEクライアントの場合は401 JSONを返す
      res.status(401).json({
        error: "Authentication failed",
        message: "Session verification failed. Please re-authenticate.",
        authUrl: `${process.env.MANAGER_URL || "http://localhost:3000"}/api/auth/signin`,
        requiresRedirect: true,
      });
      return;
    } else if (acceptHeader.includes("text/html")) {
      const managerUrl = process.env.MANAGER_URL || "http://localhost:3000";
      res.redirect(302, `${managerUrl}/api/auth/signin`);
      return;
    }

    res.status(401).json({
      error: "Authentication failed",
      message: "Session verification failed. Please re-authenticate.",
      authUrl: `${process.env.MANAGER_URL || "http://localhost:3000"}/api/auth/signin`,
      requiresRedirect: true,
    });
  }
}
