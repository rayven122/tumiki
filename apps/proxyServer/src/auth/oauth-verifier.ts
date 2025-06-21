import { getNextAuthToken, type AuthUser } from "@tumiki/auth";
import type { Request } from "express";

/**
 * OAuth Access Token Verification Information
 * MCP準拠の認証情報形式
 */
export interface MCPAuthInfo {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt?: number;
  resource?: URL;
  extra?: Record<string, unknown>;
  // 追加のNextAuth固有プロパティ
  subject: string;
  issuer: string;
  claims: Record<string, unknown>;
}

/**
 * NextAuth JWTトークンをMCP OAuth形式に変換
 */
export class NextAuthOAuthVerifier {
  async verifyAccessToken(token: string): Promise<MCPAuthInfo> {
    try {
      // NextAuthのJWTトークンを模擬的なリクエストオブジェクトで検証
      const mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
          cookie: `next-auth.session-token=${token}`,
        },
        cookies: {
          "next-auth.session-token": token,
        },
      };

      const authToken = await getNextAuthToken(mockReq);

      if (!authToken) {
        throw new Error("Invalid or expired token");
      }

      return {
        token,
        clientId: "mcp-proxy-server", // デフォルトクライアントID
        scopes: ["openid", "profile", "email"], // NextAuthで利用可能なスコープ
        expiresAt: authToken.exp,
        extra: {
          // NextAuth固有の追加情報
          subject: authToken.sub!,
          issuer: process.env.NEXTAUTH_URL || "http://localhost:3000",
          claims: {
            sub: authToken.sub,
            email: authToken.email,
            name: authToken.name,
            role: authToken.role,
            iat: authToken.iat,
            exp: authToken.exp,
          },
        },
        // 下位互換性のため直接プロパティも設定
        subject: authToken.sub!,
        issuer: process.env.NEXTAUTH_URL || "http://localhost:3000",
        claims: {
          sub: authToken.sub,
          email: authToken.email,
          name: authToken.name,
          role: authToken.role,
          iat: authToken.iat,
          exp: authToken.exp,
        },
      };
    } catch (error) {
      console.error("Token verification failed:", error);
      throw new Error("Token verification failed");
    }
  }

  /**
   * Express Requestから認証情報を抽出してMCP形式で返す
   */
  async verifyRequestAuth(req: Request): Promise<MCPAuthInfo | null> {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader?.startsWith("Bearer ")) {
        // Bearer tokenからの検証
        const token = authHeader.slice(7);
        return await this.verifyAccessToken(token);
      }

      // NextAuthセッションCookieからの検証
      const adaptedReq = {
        headers: req.headers as Record<string, string>,
        cookies: req.cookies as Record<string, string>,
      };

      const authToken = await getNextAuthToken(adaptedReq);

      if (!authToken) {
        return null;
      }

      return {
        token: "session-token", // セッションベースの場合
        clientId: "mcp-proxy-server", // デフォルトクライアントID
        scopes: ["openid", "profile", "email"],
        expiresAt: authToken.exp,
        extra: {
          // NextAuth固有の追加情報
          subject: authToken.sub!,
          issuer: process.env.NEXTAUTH_URL || "http://localhost:3000",
          claims: {
            sub: authToken.sub,
            email: authToken.email,
            name: authToken.name,
            role: authToken.role,
            iat: authToken.iat,
            exp: authToken.exp,
          },
        },
        // 下位互換性のため直接プロパティも設定
        subject: authToken.sub!,
        issuer: process.env.NEXTAUTH_URL || "http://localhost:3000",
        claims: {
          sub: authToken.sub,
          email: authToken.email,
          name: authToken.name,
          role: authToken.role,
          iat: authToken.iat,
          exp: authToken.exp,
        },
      };
    } catch (error) {
      console.error("Request auth verification failed:", error);
      return null;
    }
  }

  /**
   * MCPAuthInfoからAuthUserに変換
   */
  mcpAuthToUser(authInfo: MCPAuthInfo): AuthUser {
    const claims = authInfo.claims;
    return {
      id: authInfo.subject,
      email: claims.email as string | undefined,
      name: claims.name as string | undefined,
      role: claims.role as string | undefined,
    };
  }
}

// シングルトンインスタンス
export const nextAuthOAuthVerifier = new NextAuthOAuthVerifier();