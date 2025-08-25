/**
 * OAuth Token Refresh Endpoint
 * OAuth トークンのリフレッシュを処理
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
 * OAuthトークンをリフレッシュ
 * POST /oauth/refresh
 *
 * Request Body:
 * - mcpServerId: MCP サーバーID
 */
export const handleOAuthRefresh: RequestHandler = async (req, res) => {
  try {
    const { mcpServerId } = req.body as { mcpServerId: string };

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
    if (!mcpServerId) {
      res.status(400).json({
        error: "invalid_request",
        error_description: "mcpServerId is required",
      });
      return;
    }

    logger.info("Refreshing OAuth token", {
      userId,
      mcpServerId,
    });

    // ユーザーの組織を取得
    const userOrganization = await db.organizationMember.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (!userOrganization) {
      res.status(404).json({
        error: "not_found",
        error_description: "User organization not found",
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

    if (!userMcpConfig || userMcpConfig.oauthTokens.length === 0) {
      res.status(404).json({
        error: "not_found",
        error_description: "No valid OAuth token found for this MCP server",
      });
      return;
    }

    const token = userMcpConfig.oauthTokens[0];
    if (!token) {
      res.status(404).json({
        error: "not_found",
        error_description: "No valid OAuth token found",
      });
      return;
    }

    // リフレッシュトークンがない場合
    if (!token.refreshToken) {
      res.status(400).json({
        error: "invalid_grant",
        error_description: "No refresh token available",
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

    // トークンをリフレッシュ
    const newAccessToken = await oauthManager.refreshToken(token.id);

    // 新しいトークン情報を取得
    const updatedToken = await db.oAuthToken.findUnique({
      where: { id: token.id },
    });

    logger.info("OAuth token refreshed successfully", {
      userId,
      mcpServerId,
      tokenId: token.id,
    });

    res.json({
      success: true,
      accessToken: newAccessToken,
      expiresAt: updatedToken?.expiresAt,
    });
  } catch (error) {
    logger.error("OAuth token refresh failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: "server_error",
      error_description: "Internal server error during token refresh",
    });
  }
};
