import type { Request } from "express";
import { AuthType } from "@tumiki/db/prisma";
import { validateApiKey, type ValidationResult } from "./validateApiKey.js";
import { validateOAuthToken } from "./validateOAuthToken.js";

import { type db } from "@tumiki/db/tcp";

type UserMcpServerInstanceWithApiKeys = Awaited<
  ReturnType<typeof db.userMcpServerInstance.findFirst>
> & {
  apiKeys?: Array<{ apiKey: string; id: string; userId: string }>;
};

export interface AuthResult {
  valid: boolean;
  authType: "api_key" | "oauth";
  userMcpServerInstance?: UserMcpServerInstanceWithApiKeys;
  userId?: string;
  error?: string;
}

/**
 * リクエストからAPIキーを抽出
 */
const extractApiKey = (req: Request): string | undefined => {
  return (
    (req.query["api-key"] as string) ||
    (req.headers["api-key"] as string) ||
    (req.headers.authorization?.startsWith("Bearer ") &&
    !req.headers.authorization.substring(7).includes(".")
      ? req.headers.authorization.substring(7)
      : undefined)
  );
};

/**
 * リクエストからBearerトークンを抽出
 */
const extractBearerToken = (req: Request): string | undefined => {
  if (
    req.headers.authorization?.startsWith("Bearer ") &&
    req.headers.authorization.substring(7).includes(".")
  ) {
    return req.headers.authorization.substring(7);
  }
  return undefined;
};

/**
 * 統一された認証検証
 */
export const validateAuth = async (req: Request): Promise<ValidationResult> => {
  try {
    // 1. リクエストから認証情報を取得
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      return {
        valid: false,
        error: "No API key or Bearer token provided",
      };
    }
    const validation = await validateApiKey(apiKey);

    // 2. APIキー認証を試行
    if (!validation.valid) {
      return validation;
    }

    // 3. OAuth認証を試行
    const authType = validation.userMcpServerInstance?.authType;
    if (authType === AuthType.OAUTH || authType === AuthType.BOTH) {
      const bearerToken = extractBearerToken(req);
      if (!bearerToken) {
        return {
          valid: false,
          error: "No Bearer token provided for OAuth authentication",
        };
      }
      const oAuthValidation = await validateOAuthToken(bearerToken);
      if (!oAuthValidation.valid) {
        return oAuthValidation;
      }
      // 認証したユーザIDとmcpサーバインスタンスの所有者が一致してない場合は、失敗
      if (
        oAuthValidation?.userId !== validation.userMcpServerInstance?.userId
      ) {
        return {
          valid: false,
          error: "OAuth token user ID does not match MCP server instance owner",
        };
      }
    }

    // 4. 認証結果をログに記録
    return validation;
  } catch (error) {
    return {
      valid: false,
      error: `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
