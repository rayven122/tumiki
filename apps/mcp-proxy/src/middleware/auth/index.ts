import type { Context, Next } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { logError, logInfo, logDebug } from "../../libs/logger/index.js";
import { apiKeyAuthMiddleware } from "./apiKey.js";
import { devKeycloakAuth } from "./jwt.js";
import { checkPermission } from "../../services/permissionService.js";

/**
 * 認証方式を判定
 *
 * @returns "jwt" | "apikey" | null
 */
const detectAuthType = (c: Context<HonoEnv>): "jwt" | "apikey" | null => {
  const authorization = c.req.header("Authorization");
  const xApiKey = c.req.header("X-API-Key");

  if (authorization?.startsWith("Bearer eyJ")) {
    return "jwt"; // JWT形式（base64エンコードされたJSON）
  }

  if (authorization?.startsWith("Bearer tumiki_") || xApiKey) {
    return "apikey"; // Tumiki APIキー
  }

  return null;
};

/**
 * JWT認証を実行
 *
 * @param c - Honoコンテキスト
 * @returns エラーレスポンス or undefined（成功時）
 */
const authenticateWithJWT = async (
  c: Context<HonoEnv>,
): Promise<Response | void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = await devKeycloakAuth(c, () => Promise.resolve());

    // devKeycloakAuth が Response を返した場合（認証失敗）
    if (result) {
      return result;
    }

    // JWT ペイロードが設定されていることを確認
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

    // mcp_instance_id が必須（MCP サーバーアクセスには必要）
    if (!jwtPayload.tumiki?.mcp_instance_id) {
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32600,
            message:
              "mcp_instance_id is required for MCP server access. This JWT is not valid for MCP operations.",
          },
        },
        401,
      );
    }

    // 権限チェック: MCP_SERVER_INSTANCEへのREADアクセス
    const hasPermission = await checkPermission(
      jwtPayload.tumiki.tumiki_user_id,
      jwtPayload.tumiki.org_id,
      "MCP_SERVER_INSTANCE",
      "READ",
      jwtPayload.tumiki.mcp_instance_id,
    );

    if (!hasPermission) {
      logDebug("JWT authentication: Permission denied", {
        userId: jwtPayload.tumiki.tumiki_user_id,
        orgId: jwtPayload.tumiki.org_id,
        instanceId: jwtPayload.tumiki.mcp_instance_id,
      });

      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32003,
            message: "Permission denied: READ access to MCP_SERVER_INSTANCE",
          },
        },
        403,
      );
    }

    logDebug("JWT authentication successful", {
      userId: jwtPayload.tumiki.tumiki_user_id,
      orgId: jwtPayload.tumiki.org_id,
      instanceId: jwtPayload.tumiki.mcp_instance_id,
    });

    // 認証方式を記録
    c.set("authMethod", "jwt");

    // JWT認証では jwtPayload のみを使用（authInfo は不要）
    return undefined; // 成功
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
  const authType = detectAuthType(c);

  if (!authType) {
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
  }

  // JWT認証
  if (authType === "jwt") {
    logInfo("Using JWT authentication");
    const result = await authenticateWithJWT(c);
    if (result) {
      return result; // エラーレスポンス
    }
    await next();
    return;
  }

  // API Key認証
  logInfo("Using API Key authentication");
  return apiKeyAuthMiddleware(c, next);
};
