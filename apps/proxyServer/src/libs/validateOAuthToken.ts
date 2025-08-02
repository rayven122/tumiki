import { auth } from "express-oauth2-jwt-bearer";
import type { Request, Response, Handler } from "express";
import { logger } from "./logger.js";

export type OAuthValidationResult =
  | {
      valid: true;
      userId: string;
      issuer?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      valid: false;
      error: string;
    };

// express-oauth2-jwt-bearerがリクエストオブジェクトに追加するauth情報の型定義
interface AuthenticatedRequest extends Request {
  auth?: {
    header: Record<string, unknown>;
    payload: {
      sub: string;
      scope?: string;
      permissions?: string[];
      iss: string;
      [key: string]: unknown;
    };
    token: string;
  };
}

/**
 * Auth0用のJWT検証ミドルウェアを作成
 */
const createJwtVerifier = (): Handler => {
  const audience = process.env.AUTH0_AUDIENCE;
  const issuerBaseURL =
    process.env.AUTH0_ISSUER_BASE_URL ||
    (process.env.AUTH0_DOMAIN
      ? `https://${process.env.AUTH0_DOMAIN}/`
      : undefined);

  if (!audience || !issuerBaseURL) {
    throw new Error(
      "AUTH0_AUDIENCE and AUTH0_ISSUER_BASE_URL (or AUTH0_DOMAIN) are required",
    );
  }

  const jwtCheck = auth({
    audience,
    issuerBaseURL,
    tokenSigningAlg: "RS256",
  });

  return jwtCheck;
};

/**
 * OAuth JWTトークンを検証
 */
export const validateOAuthToken = async (
  token: string,
): Promise<OAuthValidationResult> => {
  try {
    // express-oauth2-jwt-bearerを使用した検証
    const verifier = createJwtVerifier();

    // モックリクエストオブジェクトを作成
    const mockReq: AuthenticatedRequest = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as AuthenticatedRequest;

    // モックレスポンス（使用されないが必要）
    const mockRes = {} as Response;

    // Promise化したミドルウェア実行
    await new Promise<void>((resolve, reject) => {
      const next = (error?: Error | string) => {
        if (error) {
          const errorObj =
            error instanceof Error ? error : new Error(String(error));
          reject(errorObj);
        } else {
          resolve();
        }
      };

      try {
        void verifier(mockReq, mockRes, next);
      } catch (syncError) {
        const errorObj =
          syncError instanceof Error ? syncError : new Error(String(syncError));
        reject(errorObj);
      }
    });

    // 検証成功時、auth情報を取得
    const authInfo = mockReq.auth;
    if (!authInfo || !authInfo.payload) {
      return {
        valid: false,
        error: "No auth information found after verification",
      };
    }

    // ユーザーIDの取得（Auth0のsub claim）
    const userId = authInfo.payload.sub;
    if (!userId) {
      return {
        valid: false,
        error: "No user ID found in token",
      };
    }

    // 発行者の取得
    const issuer = authInfo.payload.iss;

    // カスタムメタデータの取得（tumiki固有のクレーム）
    const metadata: Record<string, unknown> = {};
    const customNamespace = "https://tumiki.cloud/";

    Object.keys(authInfo.payload).forEach((key) => {
      if (key.startsWith(customNamespace)) {
        const metaKey = key.substring(customNamespace.length);
        metadata[metaKey] = authInfo.payload[key];
      }
    });

    logger.debug("OAuth token validated successfully", {
      userId,
      issuer,
      hasMetadata: Object.keys(metadata).length > 0,
    });

    return {
      valid: true,
      userId,
      issuer,
      metadata,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      error: errorMessage,
    };
  }
};
