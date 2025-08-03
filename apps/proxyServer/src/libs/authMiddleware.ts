import type { Request } from "express";
import { AuthType } from "@tumiki/db/prisma";
import { validateApiKey } from "./validateApiKey.js";
import { validateOAuthToken } from "./validateOAuthToken.js";
import type { AuthValidationResult } from "../types/auth.js";
import { extractApiKey, extractBearerToken } from "../utils/authExtractor.js";

/**
 * 統一された認証検証
 */
export const validateAuth = async (
  req: Request,
): Promise<AuthValidationResult> => {
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
