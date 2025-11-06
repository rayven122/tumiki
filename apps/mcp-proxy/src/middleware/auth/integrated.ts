import type { Context, Next } from "hono";
import type { AuthInfo, HonoEnv } from "../../types/index.js";
import { logError, logInfo } from "../../libs/logger/index.js";
import { apiKeyAuthMiddleware } from "./apiKey.js";
import { devKeycloakAuth } from "./jwt.js";

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await devKeycloakAuth(c, () => Promise.resolve());

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
      // TODO: ユーザーの userMcpServerInstance を取得して設定
      const authInfo: AuthInfo = {
        organizationId: jwtPayload.organization_id ?? "default-org",
        mcpServerInstanceId: "jwt-instance", // TODO: 実際のインスタンスID取得
        apiKeyId: "jwt-api-key",
        apiKey: "jwt-token",
      };

      c.set("authInfo", authInfo);
      // AuthInfo 設定後に next() を呼ぶ
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
    return apiKeyAuthMiddleware(c, next);
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
