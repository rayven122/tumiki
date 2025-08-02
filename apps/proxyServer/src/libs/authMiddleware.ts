import type { Request } from "express";
import { AuthType } from "@tumiki/db/prisma";
import { validateApiKey } from "./validateApiKey.js";
import { validateOAuthToken } from "./validateOAuthToken.js";
import { logger } from "./logger.js";
import { db } from "@tumiki/db/tcp";
// MCP SDK AuthInfo interface (ローカル定義)
interface AuthInfo {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt?: number;
  resource?: URL;
  extra?: Record<string, unknown>;
}

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
 * AuthResultをMCP SDK AuthInfoに変換
 */
export const convertToMcpAuthInfo = (
  authResult: AuthResult,
  bearerToken?: string,
): AuthInfo | undefined => {
  if (!authResult.valid || !authResult.userMcpServerInstance) {
    return undefined;
  }

  const clientId = authResult.userMcpServerInstance.id; // インスタンスIDをclientIdとして使用

  // スコープの取得 - OAuth tokenから取得する場合は後で実装
  const scopes: string[] = [];

  // Auth0 OAuth認証の場合は実際のトークンを使用、API key認証の場合は独自形式
  const token = bearerToken || `api_key:${authResult.userMcpServerInstance.id}`;

  return {
    token,
    clientId,
    scopes,
    // API keyには有効期限がないのでundefined
    expiresAt: undefined,
    extra: {
      authType: authResult.authType,
      userId: authResult.userId,
      instanceId: authResult.userMcpServerInstance.id,
    },
  };
};

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
 * JWTトークンかどうかを判定
 */
const isJWT = (token: string): boolean => {
  const parts = token.split(".");
  return parts.length === 3;
};

/**
 * OAuthトークンからMCPサーバーインスタンスを検索
 */
const findInstanceByOAuthToken = async (
  oauthValidation: Awaited<ReturnType<typeof validateOAuthToken>>,
): Promise<UserMcpServerInstanceWithApiKeys | null> => {
  if (!oauthValidation.valid) {
    return null;
  }

  // カスタムクレームからインスタンスIDを取得
  const instanceId = oauthValidation.metadata?.mcpServerInstanceId as
    | string
    | undefined;

  if (instanceId) {
    const instance = await db.userMcpServerInstance.findFirst({
      where: {
        id: instanceId,
        userId: oauthValidation.userId,
        deletedAt: null,
      },
      include: {
        toolGroup: {
          include: {
            toolGroupTools: {
              include: { tool: true },
            },
          },
        },
        apiKeys: true,
      },
    });

    if (instance) {
      return instance;
    }
  }

  // カスタムクレームがない場合は、ユーザーのOAuth有効インスタンスを検索
  // プロバイダー情報をトークンから推定
  const provider = oauthValidation.issuer?.includes("github")
    ? "github"
    : oauthValidation.issuer?.includes("google")
      ? "google"
      : undefined;

  if (!provider) {
    return null;
  }

  return await db.userMcpServerInstance.findFirst({
    where: {
      userId: oauthValidation.userId,
      deletedAt: null,
    },
    include: {
      toolGroup: {
        include: {
          toolGroupTools: {
            include: { tool: true },
          },
        },
      },
      apiKeys: true,
    },
  });
};

/**
 * 統一された認証検証
 */
export const validateAuth = async (req: Request): Promise<AuthResult> => {
  try {
    // 1. リクエストから認証情報を取得
    const apiKey = extractApiKey(req);
    const bearerToken = extractBearerToken(req);

    logger.debug("Auth validation started", {
      hasApiKey: !!apiKey,
      hasBearerToken: !!bearerToken,
      isBearerJWT: bearerToken ? isJWT(bearerToken) : false,
    });

    // 2. APIキー認証を試行
    if (apiKey) {
      const validation = await validateApiKey(apiKey);
      if (validation.valid && validation.userMcpServerInstance) {
        const instance = validation.userMcpServerInstance;

        // インスタンスの認証設定を確認
        if (instance.authType === AuthType.OAUTH) {
          logger.warn("API key used for OAuth-only instance", {
            instanceId: instance.id,
          });
          return {
            valid: false,
            authType: "api_key",
            error: "This instance requires OAuth authentication",
          };
        }

        logger.info("API key authentication successful", {
          instanceId: instance.id,
          userId: validation.apiKey?.userId,
        });

        return {
          valid: true,
          authType: "api_key",
          userMcpServerInstance: instance,
          userId: validation.apiKey?.userId,
        };
      }
    }

    // 3. OAuth認証を試行
    if (bearerToken && isJWT(bearerToken)) {
      const validation = await validateOAuthToken(bearerToken);
      if (validation.valid) {
        // トークンからインスタンスを検索
        const instance = await findInstanceByOAuthToken(validation);

        if (instance) {
          // インスタンスの認証設定を確認
          if (instance.authType === AuthType.API_KEY) {
            logger.warn("OAuth token used for API key-only instance", {
              instanceId: instance.id,
            });
            return {
              valid: false,
              authType: "oauth",
              error: "This instance requires API key authentication",
            };
          }

          logger.info("OAuth authentication successful", {
            instanceId: instance.id,
            userId: validation.userId,
          });

          return {
            valid: true,
            authType: "oauth",
            userMcpServerInstance: instance,
            userId: validation.userId,
          };
        }

        return {
          valid: false,
          authType: "oauth",
          error: "No OAuth-enabled instance found for this token",
        };
      }

      return {
        valid: false,
        authType: "oauth",
        error: validation.error || "Invalid OAuth token",
      };
    }

    // 4. 認証情報が提供されていない
    return {
      valid: false,
      authType: "api_key",
      error: "No valid authentication provided",
    };
  } catch (error) {
    logger.error("Authentication validation error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      valid: false,
      authType: "api_key",
      error: "Authentication validation failed",
    };
  }
};
