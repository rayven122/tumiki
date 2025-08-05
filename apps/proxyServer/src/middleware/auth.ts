import { type Request, type Response, type NextFunction } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { logger } from "../libs/logger.js";

/**
 * JWT検証ミドルウェアの設定
 */
const jwtCheck = auth({
  audience: `https://${process.env.AUTH0_DOMAIN || ""}/api`,
  issuerBaseURL: `https://${process.env.AUTH0_M2M_DOMAIN || ""}/`,
  tokenSigningAlg: "RS256",
});

/**
 * 条件付きOAuth認証ミドルウェア
 * 特定のクエリパラメータが存在する場合のみJWT検証を実行
 */
export const conditionalAuthMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

    // jwtCheckを直接呼び出す
    jwtCheck(req, res, (err?: unknown) => {
      if (err) {
        logger.error("OAuth validation failed", {
          path: req.path,
          error: err instanceof Error ? err.message : "JWT validation failed",
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
      } else {
        // 認証成功のログ
        logger.info("OAuth validation successful", {
          path: req.path,
        });

        // req.authを削除して既存の実装に影響を与えない
        delete req.auth;

        next();
      }
    });
  };
};
