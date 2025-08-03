import type { Request } from "express";

/**
 * リクエストからAPIキーを抽出
 * 優先順位: query parameter > header > bearer token (JWT以外)
 */
export const extractApiKey = (req: Request): string | undefined => {
  // 1. Query parameter
  const queryApiKey = req.query["api-key"] as string | undefined;
  if (queryApiKey) {
    return queryApiKey;
  }

  // 2. Header
  const headerApiKey = req.headers["api-key"] as string | undefined;
  if (headerApiKey) {
    return headerApiKey;
  }

  // 3. Bearer token (JWTではない場合)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    // JWTの簡易判定（.を含むかどうか）
    if (!token.includes(".")) {
      return token;
    }
  }

  return undefined;
};

/**
 * リクエストからBearerトークン（JWT）を抽出
 */
export const extractBearerToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    // JWTの簡易判定（.を含むかどうか）
    if (token.includes(".")) {
      return token;
    }
  }
  return undefined;
};

/**
 * リクエストから認証情報を抽出
 */
export const extractAuthCredentials = (
  req: Request,
): {
  apiKey?: string;
  bearerToken?: string;
} => {
  return {
    apiKey: extractApiKey(req),
    bearerToken: extractBearerToken(req),
  };
};
