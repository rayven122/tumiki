import { type Request, type Response, type NextFunction } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { logger } from "../libs/logger.js";

/**
 * JWT検証ミドルウェアの設定
 */
const jwtCheck = auth({
  audience: process.env.AUTH0_AUDIENCE || "",
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || "",
  tokenSigningAlg: "RS256",
});

/**
 * 条件付きOAuth認証ミドルウェア
 * 特定のクエリパラメータが存在する場合のみJWT検証を実行
 */
export const conditionalAuthMiddleware = () => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // クエリパラメータをチェック
    const useOAuth =
      req.query.useOAuth === "true" || req.query.use_oauth === "true";

    if (!useOAuth) {
      // OAuth認証を使用しない場合はスキップ
      return next();
    }

    logger.info("OAuth validation requested", {
      path: req.path,
      method: req.method,
      clientId: req.headers["x-client-id"] || req.ip,
    });

    try {
      // JWT検証を実行
      await new Promise<void>((resolve, reject) => {
        jwtCheck(req, res, (err?: unknown) => {
          if (err) {
            reject(
              err instanceof Error
                ? err
                : new Error(
                    typeof err === "string" ? err : "JWT validation failed",
                  ),
            );
          } else {
            resolve();
          }
        });
      });

      // JWTのsubをログに出力
      logger.info("OAuth validation successful", {
        path: req.path,
        // @ts-expect-error auth object is added by express-oauth2-jwt-bearer
        sub: req.auth?.sub,
      });

      next();
    } catch (error) {
      logger.error("OAuth validation failed", {
        path: req.path,
        error: error instanceof Error ? error.message : String(error),
      });

      // エラーレスポンスが既に送信されていない場合のみ送信
      if (!res.headersSent) {
        res.status(401).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Unauthorized: Invalid or missing OAuth token",
          },
          id: null,
        });
      }
    }
  };
};
