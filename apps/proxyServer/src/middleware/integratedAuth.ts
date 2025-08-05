import { type Request, type Response, type NextFunction } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { validateApiKey } from "../libs/validateApiKey.js";
import { logger } from "../libs/logger.js";
import { db } from "@tumiki/db/tcp";
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
 * MCPサーバーインスタンスの情報を取得
 */
const getMcpServerInstance = async (mcpServerInstanceId: string) => {
  try {
    const instance = await db.userMcpServerInstance.findUnique({
      where: {
        id: mcpServerInstanceId,
        deletedAt: null,
      },
      include: {
        user: true,
        organization: true,
      },
    });
    return instance;
  } catch (error) {
    logger.error("Failed to fetch MCP server instance", {
      mcpServerInstanceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * APIキーからMCPサーバーインスタンスIDを取得（後方互換用）
 */
const getMcpServerInstanceIdFromApiKey = async (apiKey: string) => {
  const validation = await validateApiKey(apiKey);
  if (validation.valid && validation.userMcpServerInstance) {
    return validation.userMcpServerInstance.id;
  }
  return null;
};

/**
 * 統合認証ミドルウェア
 * URLパスまたはAPIキーからMCPサーバーを識別し、authTypeに基づいて適切な認証方式を選択
 */
export const integratedAuthMiddleware = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // APIキーの取得（新しいX-API-Keyヘッダーを優先）
    const apiKey: string | undefined =
      (req.headers["x-api-key"] as string) ||
      (req.headers["api-key"] as string) ||
      (req.query["api-key"] as string) ||
      undefined;

    const authHeader = req.headers.authorization;
    const hasBearerToken = authHeader?.startsWith("Bearer ");

    // URLパスからMCPサーバーインスタンスIDを取得
    let mcpServerInstanceId = req.params.userMcpServerInstanceId;

    // レガシーエンドポイントの場合、APIキーからMCPサーバーインスタンスIDを取得
    if (!mcpServerInstanceId && apiKey) {
      mcpServerInstanceId =
        (await getMcpServerInstanceIdFromApiKey(apiKey)) || undefined;
      if (!mcpServerInstanceId) {
        logger.error("Failed to get MCP server instance ID from API key", {
          path: req.path,
        });
        res.status(401).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Invalid API key",
          },
          id: null,
        });
        return;
      }
    }

    // MCPサーバーインスタンスIDが取得できない場合
    if (!mcpServerInstanceId) {
      logger.error("No MCP server instance ID provided", {
        path: req.path,
        method: req.method,
      });
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "MCP server instance ID required",
        },
        id: null,
      });
      return;
    }

    logger.info("Integrated auth middleware processing", {
      path: req.path,
      method: req.method,
      mcpServerInstanceId,
      hasApiKey: !!apiKey,
      hasBearerToken,
      clientId: req.headers["x-client-id"] || req.ip,
    });

    // MCPサーバーインスタンスの情報を取得
    const mcpServerInstance = await getMcpServerInstance(mcpServerInstanceId);
    if (!mcpServerInstance) {
      logger.error("MCP server instance not found", {
        mcpServerInstanceId,
      });
      res.status(404).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "MCP server instance not found",
        },
        id: null,
      });
      return;
    }

    const authType = mcpServerInstance.authType;

    // authTypeに基づく認証チェック
    switch (authType) {
      case "NONE":
        // 認証不要
        req.authInfo = {
          type: "api_key",
          userId: mcpServerInstance.userId,
          userMcpServerInstanceId: mcpServerInstance.id,
          organizationId: mcpServerInstance.organizationId ?? undefined,
        };
        return next();

      case "API_KEY":
        // APIキー認証が必須
        if (!apiKey) {
          logger.error("API key required but not provided", {
            path: req.path,
            mcpServerInstanceId,
          });
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

        // APIキーの検証
        const apiKeyValidation = await validateApiKey(apiKey);
        if (
          !apiKeyValidation.valid ||
          !apiKeyValidation.userMcpServerInstance
        ) {
          logger.error("API key validation failed", {
            path: req.path,
            error: apiKeyValidation.error,
          });
          res.status(401).json({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: `Unauthorized: ${apiKeyValidation.error || "Invalid API key"}`,
            },
            id: null,
          });
          return;
        }

        // APIキーが正しいMCPサーバーインスタンスに紐付いているか確認
        if (apiKeyValidation.userMcpServerInstance.id !== mcpServerInstanceId) {
          logger.error("API key does not match MCP server instance", {
            apiKeyInstanceId: apiKeyValidation.userMcpServerInstance.id,
            requestedInstanceId: mcpServerInstanceId,
          });
          res.status(401).json({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "API key does not match the requested MCP server",
            },
            id: null,
          });
          return;
        }

        req.authInfo = {
          type: "api_key",
          userId: apiKeyValidation.apiKey?.userId,
          userMcpServerInstanceId: mcpServerInstance.id,
          organizationId: mcpServerInstance.organizationId ?? undefined,
        };
        return next();

      case "OAUTH":
        // OAuth認証が必須
        if (!hasBearerToken) {
          logger.error("OAuth required but no Bearer token provided", {
            path: req.path,
            mcpServerInstanceId,
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
            req.authInfo = {
              type: "oauth",
              userId: mcpServerInstance.userId,
              userMcpServerInstanceId: mcpServerInstance.id,
              organizationId: mcpServerInstance.organizationId ?? undefined,
              // req.authからOAuth情報を取得（express-oauth2-jwt-bearerが設定）
              sub: (req as Request & { auth?: JWTAuth }).auth?.payload?.sub,
              scope: (req as Request & { auth?: JWTAuth }).auth?.payload?.scope,
              permissions: (req as Request & { auth?: JWTAuth }).auth?.payload
                ?.permissions,
            };
            next();
          }
        });
        return next();

      default:
        // 未知のauthType
        logger.error("Unknown authType", {
          authType,
          mcpServerInstanceId,
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
  };
};
