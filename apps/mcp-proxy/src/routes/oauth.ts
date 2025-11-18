import type { Context } from "hono";
import type { OAuthErrorResponse, OAuthTokenResponse } from "../types/index.js";

/**
 * Keycloak OAuth 2.1 トークンエンドポイントURL
 *
 * 環境変数 KEYCLOAK_ISSUER から構築
 * 例: https://keycloak.example.com/realms/tumiki/protocol/openid-connect/token
 */
const getKeycloakTokenEndpoint = (): string => {
  const issuer = process.env.KEYCLOAK_ISSUER;
  if (!issuer) {
    throw new Error("KEYCLOAK_ISSUER environment variable is not set");
  }
  return `${issuer}/protocol/openid-connect/token`;
};

/**
 * リクエストボディのバリデーション
 *
 * @param body - パースされたリクエストボディ
 * @returns バリデーション結果とエラーメッセージ
 */
const validateTokenRequest = (
  body: unknown,
): { valid: boolean; error?: OAuthErrorResponse } => {
  if (typeof body !== "object" || body === null) {
    return {
      valid: false,
      error: {
        error: "invalid_request",
        error_description: "Request body must be an object",
      },
    };
  }

  const req = body as Record<string, unknown>;

  // grant_type の検証
  if (
    req.grant_type !== "client_credentials" &&
    req.grant_type !== "refresh_token"
  ) {
    return {
      valid: false,
      error: {
        error: "unsupported_grant_type",
        error_description:
          "Only client_credentials and refresh_token grant types are supported",
      },
    };
  }

  // client_id と client_secret の検証
  if (typeof req.client_id !== "string" || req.client_id.trim() === "") {
    return {
      valid: false,
      error: {
        error: "invalid_request",
        error_description: "client_id is required",
      },
    };
  }

  if (
    typeof req.client_secret !== "string" ||
    req.client_secret.trim() === ""
  ) {
    return {
      valid: false,
      error: {
        error: "invalid_request",
        error_description: "client_secret is required",
      },
    };
  }

  // refresh_token grant の場合の追加検証
  if (req.grant_type === "refresh_token") {
    if (
      typeof req.refresh_token !== "string" ||
      req.refresh_token.trim() === ""
    ) {
      return {
        valid: false,
        error: {
          error: "invalid_request",
          error_description:
            "refresh_token is required for refresh_token grant",
        },
      };
    }
  }

  return { valid: true };
};

/**
 * POST /oauth/token - OAuth 2.1 トークンエンドポイント
 *
 * Keycloak Token Endpoint へのプロキシとして機能
 *
 * サポートするグラントタイプ:
 * - client_credentials: クライアント認証情報によるトークン取得
 * - refresh_token: リフレッシュトークンによるトークン更新
 *
 * @param c - Honoコンテキスト
 * @returns OAuth 2.1 トークンレスポンスまたはエラー
 */
export const oauthTokenHandler = async (c: Context): Promise<Response> => {
  try {
    // Content-Type の検証
    const contentType = c.req.header("content-type");
    if (!contentType?.includes("application/x-www-form-urlencoded")) {
      const errorResponse: OAuthErrorResponse = {
        error: "invalid_request",
        error_description:
          "Content-Type must be application/x-www-form-urlencoded",
      };
      return c.json(errorResponse, 400);
    }

    // リクエストボディのパース
    const body = await c.req.parseBody();

    // バリデーション
    const validation = validateTokenRequest(body);
    if (!validation.valid && validation.error) {
      return c.json(validation.error, 400);
    }

    // Keycloak Token Endpoint へのプロキシリクエスト
    const keycloakTokenEndpoint = getKeycloakTokenEndpoint();

    // application/x-www-form-urlencoded 形式でリクエストボディを構築
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        formData.append(key, value);
      }
    }

    const response = await fetch(keycloakTokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    // Keycloak からのレスポンスを取得
    const responseBody = await response.json();

    // エラーレスポンスの場合
    if (!response.ok) {
      // Keycloak のエラーをそのまま返す
      return c.json(
        responseBody as OAuthErrorResponse,
        response.status as 400 | 401 | 403 | 500,
      );
    }

    // 成功レスポンス
    return c.json(responseBody as OAuthTokenResponse, 200);
  } catch (error) {
    console.error("OAuth token endpoint error:", error);

    const errorResponse: OAuthErrorResponse = {
      error: "invalid_request",
      error_description:
        error instanceof Error ? error.message : "Internal server error",
    };

    return c.json(errorResponse, 500);
  }
};
