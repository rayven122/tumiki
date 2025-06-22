import type { Request, Response } from "express";
import { logger } from "../lib/logger.js";

/**
 * Simplified Authentication Server Metadata
 * MCPプロトコル準拠のシンプルなNextAuth認証メタデータ
 */
interface AuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  authentication_type: "nextauth_cookie";
  supported_flows: string[];
}

/**
 * Authentication Server Metadata Endpoint
 * NextAuth Cookieベース認証用のシンプルなメタデータ
 *
 * パス: /.well-known/oauth-authorization-server
 */
export const handleAuthMetadata = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    console.log("Auth metadata endpoint called");
    console.log("Auth metadata endpoint called");
    console.log("Auth metadata endpoint called");
    console.log("Auth metadata endpoint called");
    logger.debug("Auth metadata request", {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    const baseUrl =
      process.env.NODE_ENV === "production"
        ? "https://tumiki.cloud"
        : "http://localhost:3000";

    const metadata: AuthServerMetadata = {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/api/auth/signin`,
      authentication_type: "nextauth_cookie",
      supported_flows: ["browser_redirect_with_callback"],
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=3600"); // 1時間キャッシュ
    console.log("Auth metadata response:", metadata);
    res.status(200).json(metadata);

    logger.info("Auth metadata served", {
      issuer: metadata.issuer,
      authEndpoint: metadata.authorization_endpoint,
      userAgent: req.headers["user-agent"],
    });
  } catch (error) {
    logger.error("Error serving auth metadata", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: "server_error",
      error_description: "Failed to retrieve authentication server metadata",
    });
  }
};

/**
 * Simple Authentication Helper
 * NextAuthログイン画面へのリダイレクトURLを生成
 */
export const generateAuthRedirectUrl = (callbackUrl?: string): string => {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://tumiki.cloud"
      : "http://localhost:3000";

  if (callbackUrl) {
    return `${baseUrl}/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  }

  return `${baseUrl}/api/auth/signin`;
};
