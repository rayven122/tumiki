import type { Context } from "hono";
import type {
  OAuthErrorResponse,
  OAuthTokenResponse,
} from "../../../../shared/types/honoEnv.js";
import { logError } from "../../../../shared/logger/index.js";
import * as openidClient from "openid-client";
import {
  ResponseBodyError,
  allowInsecureRequests,
  skipStateCheck,
} from "openid-client";
import { createKeycloakConfiguration } from "../../../../infrastructure/keycloak/keycloakConfig.js";

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
    req.grant_type !== "refresh_token" &&
    req.grant_type !== "authorization_code"
  ) {
    return {
      valid: false,
      error: {
        error: "unsupported_grant_type",
        error_description:
          "Only authorization_code, client_credentials and refresh_token grant types are supported",
      },
    };
  }

  // client_id の検証（全グラントタイプで必須）
  if (typeof req.client_id !== "string" || req.client_id.trim() === "") {
    return {
      valid: false,
      error: {
        error: "invalid_request",
        error_description: "client_id is required",
      },
    };
  }

  // client_secret の検証（client_credentials では必須、authorization_code ではオプショナル）
  if (req.grant_type === "client_credentials") {
    if (
      typeof req.client_secret !== "string" ||
      req.client_secret.trim() === ""
    ) {
      return {
        valid: false,
        error: {
          error: "invalid_request",
          error_description:
            "client_secret is required for client_credentials grant",
        },
      };
    }
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

  // authorization_code grant の場合の追加検証
  if (req.grant_type === "authorization_code") {
    if (typeof req.code !== "string" || req.code.trim() === "") {
      return {
        valid: false,
        error: {
          error: "invalid_request",
          error_description: "code is required for authorization_code grant",
        },
      };
    }
    if (
      typeof req.redirect_uri !== "string" ||
      req.redirect_uri.trim() === ""
    ) {
      return {
        valid: false,
        error: {
          error: "invalid_request",
          error_description:
            "redirect_uri is required for authorization_code grant",
        },
      };
    }
    // PKCE: code_verifier は必須（MCP仕様）
    if (
      typeof req.code_verifier !== "string" ||
      req.code_verifier.trim() === ""
    ) {
      return {
        valid: false,
        error: {
          error: "invalid_request",
          error_description:
            "code_verifier is required for authorization_code grant (PKCE)",
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
 * - authorization_code: 認可コードによるトークン取得（PKCE必須）
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

    // openid-client v6 を使用してトークンを取得
    const req = body as Record<string, string>;

    // Grant Type に応じた処理
    if (req.grant_type === "client_credentials") {
      // v6: Configuration を作成して clientCredentialsGrant を実行
      const config = await createKeycloakConfiguration(
        req.client_id,
        req.client_secret,
      );
      const tokenResponse = await openidClient.clientCredentialsGrant(config, {
        scope: req.scope,
      });

      const response: OAuthTokenResponse = {
        access_token: tokenResponse.access_token ?? "",
        token_type: "Bearer",
        expires_in: tokenResponse.expires_in ?? 0,
        refresh_token: tokenResponse.refresh_token,
        scope: tokenResponse.scope,
      };

      return c.json(response, 200);
    }

    if (req.grant_type === "refresh_token") {
      // v6: Configuration を作成して refreshTokenGrant を実行
      const config = await createKeycloakConfiguration(
        req.client_id,
        req.client_secret,
      );
      const tokenResponse = await openidClient.refreshTokenGrant(
        config,
        req.refresh_token,
      );

      const response: OAuthTokenResponse = {
        access_token: tokenResponse.access_token ?? "",
        token_type: "Bearer",
        expires_in: tokenResponse.expires_in ?? 0,
        refresh_token: tokenResponse.refresh_token,
        scope: tokenResponse.scope,
      };

      return c.json(response, 200);
    }

    if (req.grant_type === "authorization_code") {
      // v6: Configuration を作成して authorizationCodeGrant を実行
      const config = await createKeycloakConfiguration(
        req.client_id,
        req.client_secret,
      );

      // ServerMetadata から issuer を取得
      const serverMetadata = config.serverMetadata();

      // コールバック URL を構築（認可レスポンスパラメータを含む）
      const callbackUrl = new URL(req.redirect_uri);
      callbackUrl.searchParams.set("code", req.code);

      // RFC 9207: issuer パラメータを追加
      // Keycloak が authorization_response_iss_parameter_supported: true の場合に必要
      callbackUrl.searchParams.set("iss", serverMetadata.issuer);

      // state が提供された場合は URL に含める
      if (req.state) {
        callbackUrl.searchParams.set("state", req.state);
      }

      // checks の設定：
      // - state が提供された場合: expectedState で検証
      // - state がない場合: skipStateCheck で検証をスキップ
      const tokenResponse = await openidClient.authorizationCodeGrant(
        config,
        callbackUrl,
        {
          pkceCodeVerifier: req.code_verifier,
          expectedState: req.state ?? skipStateCheck,
        },
      );

      const response: OAuthTokenResponse = {
        access_token: tokenResponse.access_token ?? "",
        token_type: "Bearer",
        expires_in: tokenResponse.expires_in ?? 0,
        refresh_token: tokenResponse.refresh_token,
        scope: tokenResponse.scope,
      };

      return c.json(response, 200);
    }

    // ここに到達することはないはず（validateTokenRequestでチェック済み）
    const errorResponse: OAuthErrorResponse = {
      error: "unsupported_grant_type",
      error_description: "Unsupported grant type",
    };
    return c.json(errorResponse, 400);
  } catch (error) {
    logError("OAuth token endpoint error", error as Error);

    // openid-client v6 の ResponseBodyError をハンドリング
    if (error instanceof ResponseBodyError) {
      // ResponseBodyError のエラーコードを OAuthErrorResponse の型にマッピング
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
      // v6 では error.status で直接取得可能
      const statusCode =
        errorCode === "invalid_client" ||
        errorCode === "invalid_grant" ||
        errorCode === "unauthorized_client"
          ? 401
          : 400;

      return c.json(errorResponse, statusCode);
    }

    // ClientError（検証エラーなど）
    if (error instanceof Error && error.name === "ClientError") {
      const errorResponse: OAuthErrorResponse = {
        error: "invalid_request",
        error_description: error.message,
      };
      return c.json(errorResponse, 400);
    }

    // その他のエラー（v5 の RPError に相当するものを含む）
    const errorResponse: OAuthErrorResponse = {
      error: "server_error",
      error_description:
        error instanceof Error ? error.message : "Internal server error",
    };

    return c.json(errorResponse, 500);
  }
};
