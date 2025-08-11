import { type Request, type Response, type NextFunction } from "express";
import { db } from "@tumiki/db/tcp";
import type { AuthenticatedRequest } from "./integratedAuth.js";

/**
 * OAuthアクセストークンの検証結果
 */
interface TokenValidationResult {
  valid: boolean;
  userId?: string;
  clientId?: string;
  scope?: string;
  error?: string;
}

/**
 * Bearerトークンを抽出
 */
const extractBearerToken = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
};

/**
 * OAuthアクセストークンを検証
 */
export const validateOAuthToken = async (
  token: string,
  mcpServerInstanceId?: string,
): Promise<TokenValidationResult> => {
  try {
    // トークンで検索（prisma-field-encryptionが自動的にハッシュ比較を行う）
    const accessToken = await db.oAuthAccessToken.findFirst({
      where: {
        token, // prisma-field-encryptionが自動的にハッシュ比較
      },
      include: {
        client: true,
        user: true,
      },
    });

    if (!accessToken) {
      return {
        valid: false,
        error: "Invalid token",
      };
    }

    // トークンの有効期限をチェック
    if (accessToken.expiresAt < new Date()) {
      return {
        valid: false,
        error: "Token expired",
      };
    }

    // MCPサーバーインスタンスIDが指定されている場合、クライアントの所属を確認
    if (
      mcpServerInstanceId &&
      accessToken.client.userMcpServerInstanceId !== mcpServerInstanceId
    ) {
      return {
        valid: false,
        error: "Token does not belong to this MCP server instance",
      };
    }

    return {
      valid: true,
      userId: accessToken.userId,
      clientId: accessToken.clientId,
      scope: accessToken.scope,
    };
  } catch (error) {
    console.error("Token validation error:", error);
    return {
      valid: false,
      error: "Internal validation error",
    };
  }
};

/**
 * OAuthトークン認証ミドルウェア
 * MCPプロキシ用にカスタマイズされたOAuthアクセストークン検証
 */
export const oauthTokenAuthMiddleware = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Authorizationヘッダーからトークンを取得
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bearer token required",
        },
        id: null,
      });
      return;
    }

    // URLパスからMCPサーバーインスタンスIDを取得
    const mcpServerInstanceId = req.params.userMcpServerInstanceId;

    // トークンを検証
    const validation = await validateOAuthToken(token, mcpServerInstanceId);

    if (!validation.valid) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: validation.error || "Invalid token",
        },
        id: null,
      });
      return;
    }

    // MCPサーバーインスタンス情報を取得
    if (mcpServerInstanceId) {
      const instance = await db.userMcpServerInstance.findUnique({
        where: {
          id: mcpServerInstanceId,
          deletedAt: null,
        },
        include: {
          organization: true,
        },
      });

      if (!instance) {
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

      // 認証情報をリクエストに付与
      req.authInfo = {
        type: "oauth",
        userId: validation.userId,
        userMcpServerInstanceId: instance.id,
        organizationId: instance.organizationId ?? undefined,
        scope: validation.scope,
      };
    } else {
      // MCPサーバーインスタンスIDがない場合（レガシーエンドポイント等）
      req.authInfo = {
        type: "oauth",
        userId: validation.userId,
        scope: validation.scope,
      };
    }

    next();
  };
};
