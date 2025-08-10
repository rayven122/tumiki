import { type Request, type Response, type NextFunction } from "express";
import { validateApiKey } from "../libs/validateApiKey.js";
import { db } from "@tumiki/db/tcp";
import type { AuthType } from "@tumiki/db";
import { sessions } from "../utils/session.js";
import { createJwtCheck, type JWTAuth } from "../libs/auth0Config.js";
import {
  sendAuthError,
  sendBadRequestError,
  sendNotFoundError,
  sendForbiddenError,
  sendInternalError,
  JSON_RPC_ERROR_CODES,
} from "../utils/errorResponse.js";

/**
 * JWT検証ミドルウェア
 */
const jwtCheck = createJwtCheck();

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
    case "NONE":
      return "Authentication type NONE is not allowed for security reasons";
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

    // req.paramsが取得できない場合、URLから直接抽出
    if (!mcpServerInstanceId && req.path) {
      const match = /^\/(mcp|sse|messages)\/([a-z0-9]+)/.exec(req.path);
      if (match) {
        mcpServerInstanceId = match[2];
        console.log(
          `📍 Extracted MCP instance ID from path: ${mcpServerInstanceId}`,
        );
      }
    }

    // デバッグログ
    console.log("🔍 Auth middleware debug:");
    console.log("  - path:", req.path);
    console.log("  - url:", req.url);
    console.log("  - params:", req.params);
    console.log("  - extracted ID:", mcpServerInstanceId);
    console.log(
      "  - authType:",
      hasBearerToken ? "Bearer" : apiKey ? "API Key" : "None",
    );

    // レガシーエンドポイントの場合、APIキーからMCPサーバーインスタンスIDを取得
    if (!mcpServerInstanceId && apiKey) {
      mcpServerInstanceId =
        (await getMcpServerInstanceIdFromApiKey(apiKey)) || undefined;
      if (!mcpServerInstanceId) {
        sendAuthError(
          res,
          401,
          "Invalid API key",
          JSON_RPC_ERROR_CODES.SERVER_ERROR,
        );
        return;
      }
    }

    // MCPサーバーインスタンスIDが取得できない場合
    if (!mcpServerInstanceId) {
      console.error("❌ Failed to extract MCP server instance ID");
      console.error("  - Request details:", {
        path: req.path,
        url: req.url,
        params: req.params,
        headers: {
          "x-api-key": req.headers["x-api-key"],
          authorization: req.headers.authorization ? "Bearer ***" : undefined,
        },
      });
      sendBadRequestError(res, "MCP server instance ID required");
      return;
    }

    // MCPサーバーインスタンスの情報を取得
    const mcpServerInstance = await getMcpServerInstance(mcpServerInstanceId);
    if (!mcpServerInstance) {
      sendNotFoundError(res, "MCP server instance not found");
      return;
    }

    const authType = mcpServerInstance.authType;

    // authTypeに基づく認証チェック
    switch (authType) {
      case "NONE":
        sendForbiddenError(
          res,
          "Authentication type NONE is not allowed for security reasons",
        );
        return;

      case "API_KEY":
        // APIキー認証が必須
        if (!apiKey) {
          sendAuthError(
            res,
            401,
            getAuthErrorMessage(authType),
            JSON_RPC_ERROR_CODES.SERVER_ERROR,
          );
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
            JSON_RPC_ERROR_CODES.SERVER_ERROR,
          );
          return;
        }

        // APIキーが正しいMCPサーバーインスタンスに紐付いているか確認
        if (apiKeyValidation.userMcpServerInstance.id !== mcpServerInstanceId) {
          sendAuthError(
            res,
            401,
            "API key does not match the requested MCP server",
            JSON_RPC_ERROR_CODES.SERVER_ERROR,
          );
          return;
        }

        req.authInfo = {
          type: "api_key",
          userMcpServerInstanceId: mcpServerInstance.id,
          organizationId: mcpServerInstance.organizationId,
        };
        return next();

      case "OAUTH":
        // OAuth認証が必須
        if (!hasBearerToken) {
          sendAuthError(
            res,
            401,
            getAuthErrorMessage(authType),
            JSON_RPC_ERROR_CODES.SERVER_ERROR,
            {
              "WWW-Authenticate": 'Bearer realm="MCP API"',
            },
          );
          return;
        }

        // JWT検証を実行
        jwtCheck(req, res, (err?: unknown) => {
          if (err) {
            sendAuthError(
              res,
              401,
              "Unauthorized: Invalid or missing OAuth token",
              JSON_RPC_ERROR_CODES.SERVER_ERROR,
              { "WWW-Authenticate": 'Bearer realm="MCP API"' },
            );
            return;
          } else {
            // OAuth認証成功
            req.authInfo = {
              type: "oauth",
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

      default:
        // 未知のauthType
        sendInternalError(
          res,
          "Internal error: Invalid authentication configuration",
        );
        return;
    }
  };
};
