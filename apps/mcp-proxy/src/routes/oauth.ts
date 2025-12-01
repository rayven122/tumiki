import type { Context } from "hono";
import type { OAuthErrorResponse, OAuthTokenResponse } from "../types/index.js";
import { logError, logDebug } from "../libs/logger/index.js";
import { Issuer, type Client, errors } from "openid-client";

/**
 * Keycloak Issuer のキャッシュ
 *
 * パフォーマンス最適化のため、Issuer discovery の結果をキャッシュ
 */
let keycloakIssuerCache: Issuer | null = null;

/**
 * Keycloak Issuer を取得（キャッシュ付き）
 *
 * openid-client の Issuer.discover() を使用して
 * Keycloak の OAuth/OIDC メタデータを自動取得
 */
const getKeycloakIssuer = async (): Promise<Issuer> => {
  if (!keycloakIssuerCache) {
    const keycloakIssuerUrl = process.env.KEYCLOAK_ISSUER;
    if (!keycloakIssuerUrl) {
      throw new Error("KEYCLOAK_ISSUER environment variable is not set");
    }

    // Issuer Discovery（自動メタデータ取得）
    keycloakIssuerCache = await Issuer.discover(keycloakIssuerUrl);

    logDebug("Keycloak Issuer discovered for OAuth token endpoint", {
      issuer: keycloakIssuerCache.issuer,
      tokenEndpoint: keycloakIssuerCache.metadata.token_endpoint,
    });
  }

  return keycloakIssuerCache;
};

/**
 * Keycloak Client を作成
 *
 * @param clientId - クライアントID
 * @param clientSecret - クライアントシークレット
 * @returns openid-client の Client インスタンス
 */
const createKeycloakClient = async (
  clientId: string,
  clientSecret: string,
): Promise<Client> => {
  const issuer = await getKeycloakIssuer();
  return new issuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
  });
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

    // openid-client を使用してトークンを取得
    const req = body as Record<string, string>;
    const client = await createKeycloakClient(req.client_id, req.client_secret);

    // Grant Type に応じた処理
    if (req.grant_type === "client_credentials") {
      const tokenSet = await client.grant({
        grant_type: "client_credentials",
        scope: req.scope,
      });

      const tokenResponse: OAuthTokenResponse = {
        access_token: tokenSet.access_token ?? "",
        token_type: "Bearer",
        expires_in: tokenSet.expires_in ?? 0,
        refresh_token: tokenSet.refresh_token,
        scope: tokenSet.scope,
      };

      return c.json(tokenResponse, 200);
    }

    if (req.grant_type === "refresh_token") {
      const tokenSet = await client.refresh(req.refresh_token);

      const tokenResponse: OAuthTokenResponse = {
        access_token: tokenSet.access_token ?? "",
        token_type: "Bearer",
        expires_in: tokenSet.expires_in ?? 0,
        refresh_token: tokenSet.refresh_token,
        scope: tokenSet.scope,
      };

      return c.json(tokenResponse, 200);
    }

    // ここに到達することはないはず（validateTokenRequestでチェック済み）
    const errorResponse: OAuthErrorResponse = {
      error: "unsupported_grant_type",
      error_description: "Unsupported grant type",
    };
    return c.json(errorResponse, 400);
  } catch (error) {
    logError("OAuth token endpoint error", error as Error);

    // openid-client の OPError をハンドリング
    if (error instanceof errors.OPError) {
      // OPErrorのエラーコードをOAuthErrorResponseの型にマッピング
      const knownErrors = [
        "invalid_request",
        "invalid_client",
        "invalid_grant",
        "unauthorized_client",
        "unsupported_grant_type",
        "invalid_scope",
        "server_error",
      ] as const;

      const errorCode = knownErrors.includes(
        error.error as (typeof knownErrors)[number],
      )
        ? (error.error as OAuthErrorResponse["error"])
        : "server_error";

      const errorResponse: OAuthErrorResponse = {
        error: errorCode,
        error_description: error.error_description ?? error.message,
      };

      // HTTPステータスコードの決定
      const statusCode =
        errorCode === "invalid_client" ||
        errorCode === "invalid_grant" ||
        errorCode === "unauthorized_client"
          ? 401
          : 400;

      return c.json(errorResponse, statusCode);
    }

    // RPError（Relying Party側のエラー）をハンドリング
    if (error instanceof errors.RPError) {
      const errorResponse: OAuthErrorResponse = {
        error: "server_error",
        error_description: error.message,
      };
      return c.json(errorResponse, 500);
    }

    // その他のエラー
    const errorResponse: OAuthErrorResponse = {
      error: "server_error",
      error_description:
        error instanceof Error ? error.message : "Internal server error",
    };

    return c.json(errorResponse, 500);
  }
};
