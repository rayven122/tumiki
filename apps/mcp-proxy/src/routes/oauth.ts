import type { Context } from "hono";
import type {
  OAuthErrorResponse,
  OAuthTokenResponse,
  DCRRequest,
  DCRResponse,
  DCRErrorResponse,
} from "../types/index.js";
import { logError, logInfo } from "../libs/logger/index.js";
import * as openidClient from "openid-client";
import {
  ResponseBodyError,
  allowInsecureRequests,
  skipStateCheck,
} from "openid-client";
import {
  createKeycloakConfiguration,
  isLocalhostUrl,
} from "../libs/auth/keycloak.js";

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

/**
 * DCR リクエストのバリデーション（RFC 7591準拠）
 *
 * @param body - パースされたリクエストボディ
 * @returns バリデーション結果
 */
const validateDCRRequest = (
  body: unknown,
): { valid: true } | { valid: false; error: DCRErrorResponse } => {
  if (typeof body !== "object" || body === null) {
    return {
      valid: false,
      error: {
        error: "invalid_client_metadata",
        error_description: "Request body must be an object",
      },
    };
  }

  const req = body as Partial<DCRRequest>;

  // redirect_uris は必須（authorization_code grant の場合）
  if (!req.redirect_uris || !Array.isArray(req.redirect_uris)) {
    return {
      valid: false,
      error: {
        error: "invalid_client_metadata",
        error_description: "redirect_uris is required and must be an array",
      },
    };
  }

  if (req.redirect_uris.length === 0) {
    return {
      valid: false,
      error: {
        error: "invalid_client_metadata",
        error_description: "redirect_uris must contain at least one URI",
      },
    };
  }

  // 各 redirect_uri の検証
  for (const uri of req.redirect_uris) {
    if (typeof uri !== "string") {
      return {
        valid: false,
        error: {
          error: "invalid_redirect_uri",
          error_description: "Each redirect_uri must be a string",
        },
      };
    }

    try {
      const url = new URL(uri);

      // HTTPS 必須（localhost は開発用に例外）
      const isLocalhost =
        url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (url.protocol !== "https:" && !isLocalhost) {
        return {
          valid: false,
          error: {
            error: "invalid_redirect_uri",
            error_description: `redirect_uri must use HTTPS (except localhost): ${uri}`,
          },
        };
      }
    } catch {
      return {
        valid: false,
        error: {
          error: "invalid_redirect_uri",
          error_description: `Invalid URL format: ${uri}`,
        },
      };
    }
  }

  return { valid: true };
};

/**
 * RFC 7591 エラーコードへのマッピング
 *
 * @param error - openid-client からのエラーコード
 * @returns RFC 7591 準拠のエラーコード
 */
const mapToRFC7591Error = (error?: string): DCRErrorResponse["error"] => {
  const knownErrors = [
    "invalid_redirect_uri",
    "invalid_client_metadata",
    "invalid_software_statement",
    "unapproved_software_statement",
  ] as const;
  return knownErrors.includes(error as (typeof knownErrors)[number])
    ? (error as DCRErrorResponse["error"])
    : "invalid_client_metadata";
};

/**
 * ResponseBodyError から HTTP ステータスコードを決定
 *
 * @param error - openid-client v6 の ResponseBodyError
 * @returns HTTP ステータスコード
 */
const determineStatusCode = (
  error: ResponseBodyError,
): 400 | 401 | 403 | 500 => {
  // v6 では error.status で直接取得可能
  const status = error.status;
  if (status === 401 || status === 403 || status === 500) {
    return status;
  }
  return 400;
};

/**
 * POST /oauth/register - OAuth 2.0 Dynamic Client Registration（RFC 7591準拠）
 *
 * openid-client v6 の dynamicClientRegistration() を使用して Keycloak に DCR リクエストを送信
 *
 * @param c - Honoコンテキスト
 * @returns DCR レスポンスまたはエラー
 */
export const dcrHandler = async (c: Context): Promise<Response> => {
  try {
    // Content-Type の検証
    const contentType = c.req.header("content-type");
    if (!contentType?.includes("application/json")) {
      const errorResponse: DCRErrorResponse = {
        error: "invalid_client_metadata",
        error_description: "Content-Type must be application/json",
      };
      return c.json(errorResponse, 400);
    }

    // リクエストボディのパース
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      const errorResponse: DCRErrorResponse = {
        error: "invalid_client_metadata",
        error_description: "Invalid JSON body",
      };
      return c.json(errorResponse, 400);
    }

    // mcp-proxy 固有バリデーション（localhost 例外の HTTPS チェック）
    const validation = validateDCRRequest(body);
    if (!validation.valid) {
      return c.json(validation.error, 400);
    }

    // Authorization ヘッダーから Initial Access Token を取得
    const authHeader = c.req.header("authorization");
    const initialAccessToken = authHeader?.replace(/^Bearer\s+/i, "");

    logInfo("Registering client via openid-client v6", {
      clientName: (body as DCRRequest).client_name,
    });

    // Keycloak Issuer URL を取得
    const keycloakIssuerUrl = process.env.KEYCLOAK_ISSUER;
    if (!keycloakIssuerUrl) {
      throw new Error("KEYCLOAK_ISSUER environment variable is not set");
    }

    // localhost の場合は HTTP を許可（ローカル開発用）
    const executeOptions = isLocalhostUrl(keycloakIssuerUrl)
      ? [allowInsecureRequests]
      : undefined;

    // openid-client v6 の dynamicClientRegistration() を使用
    const registrationConfig = await openidClient.dynamicClientRegistration(
      new URL(keycloakIssuerUrl),
      body as Partial<openidClient.ClientMetadata>,
      undefined, // clientAuth（登録時は不要）
      {
        ...(initialAccessToken && { initialAccessToken }),
        ...(executeOptions && { execute: executeOptions }),
      },
    );

    // v6: Configuration から clientMetadata() でクライアントメタデータを取得
    const clientMetadata = registrationConfig.clientMetadata();

    // レスポンス生成
    const response: DCRResponse = {
      client_id: clientMetadata.client_id,
      client_secret: clientMetadata.client_secret,
      client_id_issued_at: clientMetadata.client_id_issued_at as
        | number
        | undefined,
      client_secret_expires_at: clientMetadata.client_secret_expires_at as
        | number
        | undefined,
      registration_access_token: clientMetadata.registration_access_token as
        | string
        | undefined,
      registration_client_uri: clientMetadata.registration_client_uri as
        | string
        | undefined,
      redirect_uris:
        (clientMetadata.redirect_uris as string[] | undefined) ?? [],
      client_name: clientMetadata.client_name as string | undefined,
    };

    logInfo("DCR successful", { clientId: response.client_id });
    return c.json(response, 201);
  } catch (error) {
    // ResponseBodyError ハンドリング（openid-client v6 からのエラー）
    if (error instanceof ResponseBodyError) {
      logError("DCR failed", error);

      const errorResponse: DCRErrorResponse = {
        error: mapToRFC7591Error(error.error),
        error_description: error.error_description ?? error.message,
      };
      return c.json(errorResponse, determineStatusCode(error));
    }

    logError("DCR handler error", error as Error);

    const errorResponse: DCRErrorResponse = {
      error: "invalid_client_metadata",
      error_description:
        error instanceof Error ? error.message : "Internal server error",
    };

    return c.json(errorResponse, 500);
  }
};
