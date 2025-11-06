import type { Context, Next } from "hono";
import { db } from "@tumiki/db/server";
import type { AuthInfo, HonoEnv } from "../types/index.js";
import { logError, logInfo } from "../libs/logger/index.js";
import { devKeycloakAuth } from "./keycloakAuth.js";

/**
 * APIキーを抽出
 */
const extractApiKey = (c: Context): string | undefined => {
  // X-API-Key ヘッダー
  const xApiKey = c.req.header("X-API-Key");
  if (xApiKey) {
    return xApiKey;
  }

  // Authorization: Bearer ヘッダー
  const authorization = c.req.header("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  return undefined;
};

/**
 * APIキーを検証（データベース）
 *
 * Cloud Runのサーバーレス環境では、毎回DBチェックを行う
 * （キャッシュは外部Redis/Memcachedで実装する場合はPhase 2）
 */
const validateApiKey = async (
  apiKey: string,
): Promise<AuthInfo | undefined> => {
  try {
    // 1つのクエリで mcpApiKey と userMcpServerInstance を取得（最適化）
    const mcpApiKey = await db.mcpApiKey.findUnique({
      where: { apiKey },
      include: {
        userMcpServerInstance: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!mcpApiKey?.isActive || !mcpApiKey.userMcpServerInstance) {
      return undefined;
    }

    // includeで取得したインスタンス情報
    const instance = mcpApiKey.userMcpServerInstance;

    return {
      organizationId: instance.organizationId,
      mcpServerInstanceId: mcpApiKey.userMcpServerInstanceId,
      apiKeyId: mcpApiKey.id,
      apiKey: mcpApiKey.apiKey,
    };
  } catch (error: unknown) {
    logError("Failed to validate API key", error as Error);
    return undefined;
  }
};

/**
 * 認証ミドルウェア
 *
 * Cloud Runのステートレス環境向けに設計
 * - インメモリキャッシュなし（各インスタンスで異なるため）
 * - 毎回DBチェック
 * - 必要に応じてPhase 2でRedis/Memcachedキャッシュを追加
 *
 * 開発環境モード:
 * - DEV_MODE=true の場合、認証をバイパス
 * - ダミーの認証情報を設定
 */
export const authMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  // 開発環境モード: 認証バイパス
  // development環境のみで有効（staging/test環境では無効）
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_MODE === "true"
  ) {
    // ダミーの認証情報を設定
    c.set("authInfo", {
      organizationId: "dev-org-id",
      mcpServerInstanceId: "dev-instance-id",
      apiKeyId: "dev-api-key-id",
      apiKey: "dev-api-key",
    });
    await next();
    return;
  }

  const apiKey = extractApiKey(c);

  if (!apiKey) {
    return c.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: "Invalid or inactive API key",
          data: {
            hint: "Provide API key via X-API-Key header or Authorization: Bearer header",
          },
        },
      },
      401,
    );
  }

  // データベース検証
  const authInfo = await validateApiKey(apiKey);

  if (!authInfo) {
    return c.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: "Invalid or inactive API key",
        },
      },
      401,
    );
  }

  // 認証情報をコンテキストに設定
  c.set("authInfo", authInfo);

  await next();
};

/**
 * 統合認証ミドルウェア
 *
 * Authorization ヘッダーの形式を判定して、適切な認証方法を選択:
 * - `Bearer eyJ...` → JWT 認証（Keycloak）
 * - `Bearer tumiki_...` → API Key 認証
 * - `X-API-Key` ヘッダー → API Key 認証
 * - なし → 401 エラー
 */
export const integratedAuthMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  const authorization = c.req.header("Authorization");
  const xApiKey = c.req.header("X-API-Key");

  // JWT 認証の判定（Bearer eyJ で始まる場合）
  if (authorization?.startsWith("Bearer eyJ")) {
    logInfo("Using JWT authentication");

    try {
      // JWT 認証を実行（devKeycloakAuth は DEV_MODE 対応）
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await devKeycloakAuth(c, next);

      // devKeycloakAuth が Response を返した場合（認証失敗）
      if (result) {
        return result;
      }

      // JWT ペイロードから認証情報を構築
      const jwtPayload = c.get("jwtPayload");

      if (!jwtPayload) {
        return c.json(
          {
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32600,
              message: "Invalid JWT token",
            },
          },
          401,
        );
      }

      // AuthInfo を JWT ペイロードから構築
      const authInfo: AuthInfo = {
        organizationId: jwtPayload.tumiki.org_id,
        mcpServerInstanceId: jwtPayload.tumiki.mcp_instance_id,
        apiKeyId: "jwt-api-key",
        apiKey: "jwt-token",
      };

      c.set("authInfo", authInfo);
      await next();
      return;
    } catch (error) {
      logError("JWT authentication failed", error as Error);
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32600,
            message: "Invalid or expired JWT token",
          },
        },
        401,
      );
    }
  }

  // API Key 認証（Bearer tumiki_ または X-API-Key ヘッダー）
  if (authorization?.startsWith("Bearer tumiki_") || xApiKey) {
    logInfo("Using API Key authentication");
    return authMiddleware(c, next);
  }

  // 認証情報なし
  return c.json(
    {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32600,
        message: "Authentication required",
        data: {
          hint: "Provide JWT token (Bearer eyJ...) or API key (Bearer tumiki_... or X-API-Key header)",
        },
      },
    },
    401,
  );
};
