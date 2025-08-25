/**
 * OAuth Token Revocation Endpoint
 * OAuth トークンの無効化を処理
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
 * OAuthトークンを無効化
 * POST /oauth/revoke
 *
 * Request Body:
 * - mcpServerId: MCP サーバーID
 */
export const handleOAuthRevoke: RequestHandler = async (req, res) => {
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

    logger.info("Revoking OAuth token", {
      userId,
      mcpServerId,
    });

    // ユーザーの組織を取得
    const userOrganization = await db.organizationMember.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (!userOrganization) {
      // トークンが存在しない場合も成功として扱う（RFC 7009準拠）
      res.json({
        success: true,
        message: "Token revoked or not found",
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
        },
      },
    });

    if (!userMcpConfig || userMcpConfig.oauthTokens.length === 0) {
      // トークンが存在しない場合も成功として扱う（RFC 7009準拠）
      res.json({
        success: true,
        message: "Token revoked or not found",
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

    // すべての有効なトークンを無効化
    for (const token of userMcpConfig.oauthTokens) {
      try {
        await oauthManager.revokeToken(token.id);
      } catch (error) {
        // 個別のトークン無効化エラーはログに記録するが、処理は継続
        logger.warn("Failed to revoke individual token", {
          tokenId: token.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("OAuth tokens revoked successfully", {
      userId,
      mcpServerId,
      tokenCount: userMcpConfig.oauthTokens.length,
    });

    res.json({
      success: true,
      message: "All tokens revoked successfully",
    });
  } catch (error) {
    logger.error("OAuth token revocation failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: "server_error",
      error_description: "Internal server error during token revocation",
    });
  }
};

/**
 * すべてのOAuthトークンを無効化
 * POST /oauth/revoke/all
 */
export const handleOAuthRevokeAll: RequestHandler = async (req, res) => {
  try {
    // 認証情報をチェック
    if (!req.authInfo?.userId) {
      res.status(401).json({
        error: "unauthorized",
        error_description: "User authentication required",
      });
      return;
    }

    const userId = req.authInfo.userId;

    logger.info("Revoking all OAuth tokens", {
      userId,
    });

    // ユーザーの組織を取得
    const userOrganization = await db.organizationMember.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (!userOrganization) {
      res.json({
        success: true,
        message: "No tokens to revoke",
        revokedCount: 0,
        errorCount: 0,
      });
      return;
    }

    // ユーザーのすべてのMCPサーバー設定を取得
    const userMcpConfigs = await db.userMcpServerConfig.findMany({
      where: {
        organizationId: userOrganization.organizationId,
      },
      include: {
        oauthTokens: {
          where: {
            isValid: true,
          },
        },
      },
    });

    // OAuthManagerインスタンスを作成
    const callbackBaseUrl = `${req.protocol}://${req.get("host")}`;
    const oauthManager = await createOAuthManager({
      callbackBaseUrl,
      enablePKCE: true,
      enableDCR: true,
    });

    let revokedCount = 0;
    let errorCount = 0;

    // すべてのトークンを無効化
    for (const config of userMcpConfigs) {
      for (const token of config.oauthTokens ?? []) {
        try {
          await oauthManager.revokeToken(token.id);
          revokedCount++;
        } catch (error) {
          errorCount++;
          logger.warn("Failed to revoke individual token", {
            tokenId: token.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    logger.info("All OAuth tokens revocation completed", {
      userId,
      revokedCount,
      errorCount,
    });

    res.json({
      success: true,
      message: `Revoked ${revokedCount} tokens${errorCount > 0 ? ` (${errorCount} errors)` : ""}`,
      revokedCount,
      errorCount,
    });
  } catch (error) {
    logger.error("All OAuth tokens revocation failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: "server_error",
      error_description: "Internal server error during token revocation",
    });
  }
};
