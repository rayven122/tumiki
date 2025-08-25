/**
 * OAuth Authorization Endpoint
 * OAuth認証フローの開始を処理
 */

import type { Request, Response, NextFunction } from "express";

type AuthenticatedRequest = Request & {
  authInfo?: {
    userId: string;
    organizationId?: string;
  };
};

type RequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;
import { createOAuthManager } from "@tumiki/utils/server";
import { db } from "@tumiki/db/server";
import { logger } from "../../libs/logger.js";

/**
 * OAuth認証を開始
 * POST /oauth/authorize
 *
 * Request Body:
 * - mcpServerId: MCP サーバーID
 * - mcpServerUrl: MCP サーバーURL
 * - wwwAuthenticateHeader?: WWW-Authenticateヘッダー（401レスポンスから）
 */
export const handleOAuthAuthorize: RequestHandler = async (req, res) => {
  try {
    const { mcpServerId, mcpServerUrl, wwwAuthenticateHeader } = req.body as {
      mcpServerId: string;
      mcpServerUrl: string;
      wwwAuthenticateHeader?: string;
    };

    // 認証情報をチェック
    if (!req.authInfo?.userId) {
      res.status(401).json({
        error: "unauthorized",
        error_description: "User authentication required",
      });
      return;
    }

    const userId = req.authInfo.userId;

    // 必須パラメータのチェック
    if (!mcpServerId || !mcpServerUrl) {
      res.status(400).json({
        error: "invalid_request",
        error_description: "mcpServerId and mcpServerUrl are required",
      });
      return;
    }

    logger.info("Starting OAuth authorization", {
      userId,
      mcpServerId,
      mcpServerUrl,
      hasWWWAuthenticate: !!wwwAuthenticateHeader,
    });

    // MCPサーバーが存在することを確認
    const mcpServer = await db.mcpServer.findUnique({
      where: { id: mcpServerId },
    });

    if (!mcpServer) {
      res.status(404).json({
        error: "not_found",
        error_description: "MCP server not found",
      });
      return;
    }

    // OAuthManagerインスタンスを作成
    const callbackBaseUrl = `${req.protocol}://${req.get("host")}`;
    const oauthManager = await createOAuthManager({
      callbackBaseUrl,
      enablePKCE: true,
      enableDCR: true,
    });

    // OAuth認証を開始
    const result = await oauthManager.authenticate(
      mcpServerId,
      userId,
      mcpServerUrl,
      wwwAuthenticateHeader,
    );

    if (result.success) {
      // 既存の有効なトークンがある場合
      res.json({
        success: true,
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
      });
    } else if (result.requiresUserInteraction) {
      // ユーザー認証が必要な場合
      res.json({
        success: false,
        requiresUserInteraction: true,
        authorizationUrl: result.authorizationUrl,
      });
    } else {
      // エラーの場合
      res.status(400).json({
        success: false,
        error: result.error?.error ?? "unknown_error",
        error_description: result.error?.error_description,
        error_uri: result.error?.error_uri,
      });
    }
  } catch (error) {
    logger.error("OAuth authorization failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: "server_error",
      error_description: "Internal server error during OAuth authorization",
    });
  }
};

/**
 * 既存のOAuth認証状態を確認
 * GET /oauth/status/:mcpServerId
 */
export const handleOAuthStatus: RequestHandler = async (req, res) => {
  try {
    const { mcpServerId } = req.params;

    // 認証情報をチェック
    if (!req.authInfo?.userId) {
      res.status(401).json({
        error: "unauthorized",
        error_description: "User authentication required",
      });
      return;
    }

    const userId = req.authInfo.userId;

    logger.info("Checking OAuth status", {
      userId,
      mcpServerId,
    });

    // ユーザーの組織を取得
    const userOrganization = await db.organizationMember.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (!userOrganization) {
      res.json({
        authenticated: false,
        configured: false,
      });
      return;
    }

    // ユーザーのMCPサーバー設定を取得
    const userMcpConfig = await db.userMcpServerConfig.findFirst({
      where: {
        organizationId: userOrganization.organizationId,
        mcpServerId,
      },
      include: {
        oauthTokens: {
          where: {
            isValid: true,
          },
          take: 1,
        },
      },
    });

    if (!userMcpConfig) {
      res.json({
        authenticated: false,
        configured: false,
      });
      return;
    }

    const hasValidToken = userMcpConfig.oauthTokens.length > 0;
    const token = userMcpConfig.oauthTokens[0];

    // トークンの有効期限をチェック
    let tokenValid = false;
    if (token && token.expiresAt) {
      tokenValid = token.expiresAt > new Date();
    } else if (token) {
      tokenValid = true; // 有効期限がない場合は有効とみなす
    }

    res.json({
      authenticated: hasValidToken && tokenValid,
      configured: true,
      expiresAt: token?.expiresAt,
      hasRefreshToken: !!token?.refreshToken,
    });
  } catch (error) {
    logger.error("OAuth status check failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: "server_error",
      error_description: "Internal server error during status check",
    });
  }
};
