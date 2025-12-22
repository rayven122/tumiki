import type { Context } from "hono";
import type {
  OAuthErrorResponse,
  OAuthTokenResponse,
  DCRRequest,
  DCRResponse,
  DCRErrorResponse,
} from "../types/index.js";
import { logError, logInfo } from "../libs/logger/index.js";
import { type Client, errors } from "openid-client";
import { getKeycloakIssuer } from "../libs/auth/keycloak.js";

/**
 * Keycloak Client を作成
 *
 * @param clientId - クライアントID
 * @param clientSecret - クライアントシークレット（オプション、Public Client の場合は undefined）
 * @returns openid-client の Client インスタンス
 */
const createKeycloakClient = async (
  clientId: string,
  clientSecret?: string,
): Promise<Client> => {
  const issuer = await getKeycloakIssuer();
  return new issuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
    // Public Client（client_secret なし）の場合は token_endpoint_auth_method を none に
    token_endpoint_auth_method: clientSecret ? "client_secret_post" : "none",
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

    if (req.grant_type === "authorization_code") {
      // PKCE を使用して認可コードをトークンに交換
      const tokenSet = await client.callback(
        req.redirect_uri,
        { code: req.code },
        { code_verifier: req.code_verifier },
      );

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
 * @param error - openid-client の OPError から取得したエラーコード
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
 * OPError から HTTP ステータスコードを決定
 *
 * @param error - openid-client の OPError
 * @returns HTTP ステータスコード
 */
const determineStatusCode = (error: errors.OPError): 400 | 401 | 403 | 500 => {
  // OPError.response は http.IncomingMessage を継承しているため、statusCode を使用
  const status = error.response?.statusCode;
  if (status === 401 || status === 403 || status === 500) {
    return status;
  }
  return 400;
};

/**
 * POST /oauth/register - OAuth 2.0 Dynamic Client Registration（RFC 7591準拠）
 *
 * openid-client の Issuer.Client.register() を使用して Keycloak に DCR リクエストを送信
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

    // openid-client の Client.register() を使用
    const issuer = await getKeycloakIssuer();
    const authHeader = c.req.header("authorization");
    const initialAccessToken = authHeader?.replace(/^Bearer\s+/i, "");

    logInfo("Registering client via openid-client", {
      clientName: (body as DCRRequest).client_name,
    });

    // openid-client の Client.register() を使用
    // issuer.Client は BaseClient クラス自体を返すため、静的メソッド register にアクセス可能
    const ClientClass = issuer.Client as unknown as {
      register: (
        metadata: Record<string, unknown>,
        options?: { initialAccessToken?: string },
      ) => Promise<Client>;
    };
    const registeredClient = await ClientClass.register(
      body as Record<string, unknown>,
      { initialAccessToken: initialAccessToken || undefined },
    );

    // レスポンス生成
    const response: DCRResponse = {
      client_id: registeredClient.metadata.client_id,
      client_secret: registeredClient.metadata.client_secret,
      client_id_issued_at: registeredClient.metadata.client_id_issued_at as
        | number
        | undefined,
      client_secret_expires_at: registeredClient.metadata
        .client_secret_expires_at as number | undefined,
      registration_access_token: registeredClient.metadata
        .registration_access_token as string | undefined,
      registration_client_uri: registeredClient.metadata
        .registration_client_uri as string | undefined,
      redirect_uris: registeredClient.metadata.redirect_uris ?? [],
      client_name: registeredClient.metadata.client_name as string | undefined,
    };

    logInfo("DCR successful", { clientId: response.client_id });
    return c.json(response, 201);
  } catch (error) {
    // OPError ハンドリング（openid-client からのエラー）
    if (error instanceof errors.OPError) {
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
