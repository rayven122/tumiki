import { type Request, type Response, type NextFunction } from "express";
import { auth, requiredScopes } from "express-oauth2-jwt-bearer";
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
export const conditionalAuthMiddleware = (requiredScope?: string) => {
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

      // スコープ検証が必要な場合
      if (requiredScope) {
        const scopeCheck = requiredScopes(requiredScope);
        await new Promise<void>((resolve, reject) => {
          scopeCheck(req, res, (err?: unknown) => {
            if (err) {
              reject(
                err instanceof Error
                  ? err
                  : new Error(
                      typeof err === "string" ? err : "Scope validation failed",
                    ),
              );
            } else {
              resolve();
            }
          });
        });
      }

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

/**
 * APIキーとOAuth認証を組み合わせた認証ミドルウェア
 * OAuthが有効な場合はOAuth認証を使用し、そうでない場合はAPIキー認証を使用
 */
export const hybridAuthMiddleware = (requiredScope?: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const useOAuth =
      req.query.useOAuth === "true" || req.query.use_oauth === "true";

    if (useOAuth) {
      // OAuth認証を使用
      return conditionalAuthMiddleware(requiredScope)(req, res, next);
    }

    // APIキー認証をチェック
    const apiKey: string | undefined =
      (req.query["api-key"] as string) ||
      (req.headers["api-key"] as string) ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.substring(7)
        : undefined);

    if (!apiKey) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Unauthorized: Missing API key",
        },
        id: null,
      });
      return;
    }

    // APIキーの検証は後続のミドルウェアで行う
    next();
  };
};
