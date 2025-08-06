import { type Request, type Response, type NextFunction } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { validateApiKey } from "../libs/validateApiKey.js";
import { db } from "@tumiki/db/tcp";
import type { AuthType } from "@tumiki/db";
import { sessions } from "../utils/session.js";

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
      return "Authentication type NONE is not allowed for security reasons";
    default:
      return "Authentication required";
  }
};

/**
 * 統一的なエラーレスポンスを送信するヘルパー関数
 */
const sendAuthError = (
  res: Response,
  statusCode: number,
  message: string,
  code = -32000,
  headers?: Record<string, string>,
): void => {
  if (res.headersSent) {
    return;
  }

  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }

  res.status(statusCode).json({
    jsonrpc: "2.0",
    error: {
      code,
      message,
    },
    id: null,
  });
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
  } catch {
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
    // セッションIDの取得（/messagesエンドポイント用）
    const sessionId = req.query.sessionId as string | undefined;

    // セッションベースの認証を優先
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session && session.authInfo) {
        // セッションから認証情報を直接使用
        req.authInfo = session.authInfo;
        return next();
      }
    }

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
        sendAuthError(res, 401, "Invalid API key");
        return;
      }
    }

    // MCPサーバーインスタンスIDが取得できない場合
    if (!mcpServerInstanceId) {
      sendAuthError(res, 400, "MCP server instance ID required");
      return;
    }

    // MCPサーバーインスタンスの情報を取得
    const mcpServerInstance = await getMcpServerInstance(mcpServerInstanceId);
    if (!mcpServerInstance) {
      sendAuthError(res, 404, "MCP server instance not found");
      return;
    }

    const authType = mcpServerInstance.authType;

    // authTypeに基づく認証チェック
    switch (authType) {
      case "NONE":
        sendAuthError(
          res,
          403,
          "Authentication type NONE is not allowed for security reasons",
          -32000,
        );
        return;

      case "API_KEY":
        // APIキー認証が必須
        if (!apiKey) {
          sendAuthError(res, 401, getAuthErrorMessage(authType));
          return;
        }

        // APIキーの検証
        const apiKeyValidation = await validateApiKey(apiKey);
        if (
          !apiKeyValidation.valid ||
          !apiKeyValidation.userMcpServerInstance
        ) {
          sendAuthError(
            res,
            401,
            `Unauthorized: ${apiKeyValidation.error || "Invalid API key"}`,
          );
          return;
        }

        // APIキーが正しいMCPサーバーインスタンスに紐付いているか確認
        if (apiKeyValidation.userMcpServerInstance.id !== mcpServerInstanceId) {
          sendAuthError(
            res,
            401,
            "API key does not match the requested MCP server",
          );
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
          sendAuthError(res, 401, getAuthErrorMessage(authType), -32000, {
            "WWW-Authenticate": 'Bearer realm="MCP API"',
          });
          return;
        }

        // JWT検証を実行
        jwtCheck(req, res, (err?: unknown) => {
          if (err) {
            sendAuthError(
              res,
              401,
              "Unauthorized: Invalid or missing OAuth token",
              -32000,
              { "WWW-Authenticate": 'Bearer realm="MCP API"' },
            );
            return;
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
            return;
          }
        });
        return;

      case "BOTH":
        // BOTH認証タイプは未実装
        sendAuthError(
          res,
          501,
          "BOTH authentication type is not yet implemented",
          -32000,
        );
        return;

      default:
        // 未知のauthType
        sendAuthError(
          res,
          500,
          "Internal error: Invalid authentication configuration",
          -32603,
        );
        return;
    }
  };
};
