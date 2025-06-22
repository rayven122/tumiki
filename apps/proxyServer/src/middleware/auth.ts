import type { Request, Response, NextFunction } from "express";
import { getToken } from "@tumiki/auth/express-only";
import type { Role } from "@prisma/client";
import { logger } from "../lib/logger.js";

/**
 * 拡張されたRequestインターフェース - セッション情報を含む
 */
export interface AuthenticatedRequest extends Request {
  session?: {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: Role;
    };
    expires: string;
  };
}

/**
 * API key検証 - 既存の認証システム
 */
export const validateApiKey = (apiKeyId: string | undefined): boolean => {
  return !!apiKeyId && apiKeyId.length > 0;
};

/**
 * Cookie-based JWT authentication middleware using NextAuth getToken
 * Returns 401 Unauthorized with WWW-Authenticate header for MCP clients
 */
export const cookieJWTAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    console.log("Cookie-based JWT auth middleware called");
    // NextAuth's getToken function to verify JWT from cookies
    const token = await getToken({
      req: req as unknown as Parameters<typeof getToken>[0]["req"],
      secret: process.env.AUTH_SECRET,
    });

    logger.info("JWT token:", token ?? {});

    if (!token?.sub) {
      logger.warn("JWT authentication failed - no valid token", {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        cookies: !!req.cookies,
        hasAuthCookie: !!req.cookies?.["next-auth.session-token"],
      });

      // MCP protocol compliant error response with callback URL
      const mcpServerUrl =
        process.env.NODE_ENV === "production"
          ? "https://server.tumiki.cloud"
          : "http://localhost:8080";

      const callbackUrl = `${mcpServerUrl}${req.originalUrl}`;
      const authUrl =
        process.env.NODE_ENV === "production"
          ? `https://tumiki.cloud/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
          : `http://localhost:3000/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

      res.set(
        "WWW-Authenticate",
        `Bearer realm="MCP Server", authorization_uri="${authUrl}"`,
      );
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Authentication required",
          data: {
            type: "auth",
            authorization_uri: authUrl,
            callback_url: callbackUrl,
          },
        },
        id: null,
      });
      return;
    }

    // Set session information from JWT token
    req.session = {
      user: {
        id: token.sub,
        name: token.name,
        email: token.email,
        image: token.picture,
        role: token.role as Role | undefined,
      },
      expires: new Date(token.exp! * 1000).toISOString(),
    };

    logger.debug("JWT authentication successful", {
      userId: token.sub,
      userAgent: req.headers["user-agent"],
    });

    next();
  } catch (error) {
    logger.error("JWT auth middleware error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal authentication error",
        data: {
          type: "internal_error",
        },
      },
      id: null,
    });
  }
};

/**
 * 両方の認証を必須とする厳密な認証ミドルウェア
 * API keyとJWTセッション認証の両方が必要
 */
export const strictDualAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const apiKeyId = (req.query["api-key"] ?? req.headers["api-key"]) as
    | string
    | undefined;

  // API key認証をチェック
  const hasValidApiKey = validateApiKey(apiKeyId);
  if (!hasValidApiKey) {
    logger.warn("Authentication failed - missing or invalid API key", {
      hasApiKey: !!apiKeyId,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    res.set(
      "WWW-Authenticate",
      'Bearer realm="MCP Server", error="invalid_token", error_description="Valid API key required"',
    );
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Unauthorized: Valid API key required",
        data: {
          type: "invalid_api_key",
        },
      },
      id: null,
    });
    return;
  }

  // JWT セッション認証をチェック
  try {
    const token = await getToken({
      req: req as unknown as Parameters<typeof getToken>[0]["req"],
      secret: process.env.AUTH_SECRET,
    });

    if (!token?.sub) {
      logger.warn("Authentication failed - missing or invalid JWT session", {
        apiKeyId: "***",
        hasToken: !!token,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });

      res.set(
        "WWW-Authenticate",
        'Bearer realm="MCP Server", error="invalid_token", error_description="Valid session required"',
      );
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Unauthorized: Valid session required",
          data: {
            type: "invalid_session",
          },
        },
        id: null,
      });
      return;
    }

    // Set session information from JWT token
    req.session = {
      user: {
        id: token.sub,
        name: token.name,
        email: token.email,
        image: token.picture,
        role: token.role as Role | undefined,
      },
      expires: new Date(token.exp! * 1000).toISOString(),
    };

    // 両方の認証が成功
    logger.debug("Dual authentication successful", {
      apiKeyId: "***",
      userId: token.sub,
    });
    next();
  } catch (error) {
    logger.error("JWT session auth middleware error", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Session authentication error",
        data: {
          type: "session_auth_error",
        },
      },
      id: null,
    });
  }
};

/**
 * オプショナル認証ミドルウェア - JWT認証情報があれば設定、なくても続行
 */
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const apiKeyId = (req.query["api-key"] ?? req.headers["api-key"]) as
    | string
    | undefined;

  // API key情報を設定
  if (validateApiKey(apiKeyId)) {
    logger.debug("Optional API key authentication", {
      apiKeyId: "***",
    });
  }

  // JWT セッション認証を試行
  try {
    const token = await getToken({
      req: req as unknown as Parameters<typeof getToken>[0]["req"],
      secret: process.env.AUTH_SECRET,
    });

    if (token?.sub) {
      // Set session information from JWT token
      req.session = {
        user: {
          id: token.sub,
          name: token.name,
          email: token.email,
          image: token.picture,
          role: token.role as Role | undefined,
        },
        expires: new Date(token.exp! * 1000).toISOString(),
      };

      logger.debug("Optional JWT authentication successful", {
        userId: token.sub,
      });
    }

    next();
  } catch (error) {
    logger.error("Optional JWT auth middleware error", {
      error: error instanceof Error ? error.message : String(error),
    });
    next();
  }
};

/**
 * ユーザーが認証されたMCPサーバーにアクセス権限があるかチェック
 */
export const checkMcpServerAccess = async (
  req: AuthenticatedRequest,
  apiKeyId: string,
): Promise<boolean> => {
  // API key認証の場合は既存の検証ロジックに依存
  if (validateApiKey(apiKeyId)) {
    return true;
  }

  // セッション認証の場合は、ユーザーがサーバーにアクセス権限があるかチェック
  if (req.session?.user?.id) {
    // TODO: 実装 - ユーザーがMCPサーバーにアクセス権限があるかDBで確認
    // 現在は基本的な認証のみ実装
    return true;
  }

  return false;
};
