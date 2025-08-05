import { type Request, type Response, type NextFunction } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { validateApiKey } from "../libs/validateApiKey.js";
import { logger } from "../libs/logger.js";
import type { AuthType } from "@tumiki/db";

/**
 * JWT検証ミドルウェアの設定
 */
const jwtCheck = auth({
  audience: `https://${process.env.AUTH0_DOMAIN || ""}/api`,
  issuerBaseURL: `https://${process.env.AUTH0_M2M_DOMAIN || ""}/`,
  tokenSigningAlg: "RS256",
});

/**
 * OAuth認証時のペイロード型定義
 */
interface OAuthPayload {
  sub?: string;
  scope?: string;
  permissions?: string[];
}

/**
 * JWTペイロード型（express-oauth2-jwt-bearerから）
 */
interface JWTAuth {
  payload?: OAuthPayload;
  header?: Record<string, unknown>;
  token?: string;
}

/**
 * リクエストに認証情報を付与するための拡張型
 */
export interface AuthenticatedRequest extends Request {
  authInfo?: {
    type: "api_key" | "oauth";
    userId?: string;
    userMcpServerInstanceId?: string;
    organizationId?: string;
    // OAuth認証の場合の追加情報
    sub?: string;
    scope?: string;
    permissions?: string[];
  };
}

/**
 * authTypeに応じたエラーメッセージを返す
 */
const getAuthErrorMessage = (authType: AuthType): string => {
  switch (authType) {
    case "OAUTH":
      return "OAuth authentication required for this server";
    case "API_KEY":
      return "API key authentication required for this server";
    case "BOTH":
      return "Either API key or OAuth authentication required";
    case "NONE":
      return "Authentication not required but invalid credentials provided";
    default:
      return "Authentication required";
  }
};

/**
 * 統合認証ミドルウェア
 * APIキー認証とJWT認証を統合し、authTypeに基づいて適切な認証方式を選択
 */
export const integratedAuthMiddleware = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const apiKey: string | undefined =
      (req.query["api-key"] as string) ||
      (req.headers["api-key"] as string) ||
      undefined;

    const authHeader = req.headers.authorization;
    const hasBearerToken = authHeader?.startsWith("Bearer ");

    logger.info("Integrated auth middleware processing", {
      path: req.path,
      method: req.method,
      hasApiKey: !!apiKey,
      hasBearerToken,
      clientId: req.headers["x-client-id"] || req.ip,
    });

    // APIキーが提供されている場合
    if (apiKey) {
      const validation = await validateApiKey(apiKey);

      if (!validation.valid || !validation.userMcpServerInstance) {
        logger.error("API key validation failed", {
          path: req.path,
          error: validation.error,
        });

        res.status(401).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: `Unauthorized: ${validation.error || "Invalid API key"}`,
          },
          id: null,
        });
        return;
      }

      const authType = validation.userMcpServerInstance.authType;

      logger.info("API key validated, checking authType", {
        authType,
        userMcpServerInstanceId: validation.userMcpServerInstance.id,
      });

      // authTypeに基づく認証チェック
      switch (authType) {
        case "NONE":
          // 認証不要
          req.authInfo = {
            type: "api_key",
            userId: validation.apiKey?.userId,
            userMcpServerInstanceId: validation.userMcpServerInstance.id,
            organizationId:
              validation.userMcpServerInstance.organizationId ?? undefined,
          };
          return next();

        case "API_KEY":
          // APIキーのみ（既に検証済み）
          req.authInfo = {
            type: "api_key",
            userId: validation.apiKey?.userId,
            userMcpServerInstanceId: validation.userMcpServerInstance.id,
            organizationId:
              validation.userMcpServerInstance.organizationId ?? undefined,
          };
          return next();

        case "OAUTH":
          // OAuthのみ - Bearer tokenが必須
          if (!hasBearerToken) {
            logger.error("OAuth required but no Bearer token provided", {
              path: req.path,
              userMcpServerInstanceId: validation.userMcpServerInstance.id,
            });

            res.setHeader("WWW-Authenticate", 'Bearer realm="MCP API"');
            res.status(401).json({
              jsonrpc: "2.0",
              error: {
                code: -32000,
                message: getAuthErrorMessage(authType),
              },
              id: null,
            });
            return;
          }

          // JWT検証を実行
          jwtCheck(req, res, (err?: unknown) => {
            if (err) {
              logger.error("OAuth validation failed", {
                path: req.path,
                error:
                  err instanceof Error ? err.message : "JWT validation failed",
              });

              if (!res.headersSent) {
                res.setHeader("WWW-Authenticate", 'Bearer realm="MCP API"');
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
              // OAuth認証成功
              // この時点でvalidation.userMcpServerInstanceは必ず存在する（141行目でチェック済み）
              req.authInfo = {
                type: "oauth",
                userId: validation.apiKey?.userId,
                userMcpServerInstanceId: validation.userMcpServerInstance!.id,
                organizationId:
                  validation.userMcpServerInstance!.organizationId ?? undefined,
                // req.authからOAuth情報を取得（express-oauth2-jwt-bearerが設定）
                sub: (req as Request & { auth?: JWTAuth }).auth?.payload?.sub,
                scope: (req as Request & { auth?: JWTAuth }).auth?.payload
                  ?.scope,
                permissions: (req as Request & { auth?: JWTAuth }).auth?.payload
                  ?.permissions,
              };
              next();
            }
          });
          return;

        case "BOTH":
          // APIキーまたはOAuth
          if (hasBearerToken) {
            // Bearer tokenがある場合はJWT検証も実行
            jwtCheck(req, res, (err?: unknown) => {
              if (err) {
                logger.warn(
                  "OAuth validation failed, falling back to API key",
                  {
                    path: req.path,
                    error:
                      err instanceof Error
                        ? err.message
                        : "JWT validation failed",
                  },
                );

                // JWT検証失敗してもAPIキーが有効なので続行
                req.authInfo = {
                  type: "api_key",
                  userId: validation.apiKey?.userId,
                  userMcpServerInstanceId: validation.userMcpServerInstance!.id,
                  organizationId:
                    validation.userMcpServerInstance!.organizationId ??
                    undefined,
                };
                next();
              } else {
                // OAuth認証成功
                req.authInfo = {
                  type: "oauth",
                  userId: validation.apiKey?.userId,
                  userMcpServerInstanceId: validation.userMcpServerInstance!.id,
                  organizationId:
                    validation.userMcpServerInstance!.organizationId ??
                    undefined,
                  sub: (req as Request & { auth?: JWTAuth }).auth?.payload?.sub,
                  scope: (req as Request & { auth?: JWTAuth }).auth?.payload
                    ?.scope,
                  permissions: (req as Request & { auth?: JWTAuth }).auth
                    ?.payload?.permissions,
                };
                next();
              }
            });
            return;
          }

          // APIキーで既に認証済み
          req.authInfo = {
            type: "api_key",
            userId: validation.apiKey?.userId,
            userMcpServerInstanceId: validation.userMcpServerInstance.id,
            organizationId:
              validation.userMcpServerInstance.organizationId ?? undefined,
          };
          return next();

        default:
          // 未知のauthType
          logger.error("Unknown authType", {
            authType,
            userMcpServerInstanceId: validation.userMcpServerInstance.id,
          });

          res.status(500).json({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "Internal error: Invalid authentication configuration",
            },
            id: null,
          });
          return;
      }
    }

    // APIキーがない場合はBearer tokenをチェック
    if (hasBearerToken) {
      logger.info("No API key provided, checking Bearer token", {
        path: req.path,
      });

      // TODO: Bearer tokenからMCPサーバー情報を取得する実装
      // 現在は未実装のため、Bearer tokenのみでの認証はエラーとする
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message:
            "API key required. Bearer token only authentication not yet implemented",
        },
        id: null,
      });
      return;
    }

    // 認証情報なし
    logger.error("No authentication credentials provided", {
      path: req.path,
    });

    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Unauthorized: Missing authentication credentials",
      },
      id: null,
    });
  };
};
