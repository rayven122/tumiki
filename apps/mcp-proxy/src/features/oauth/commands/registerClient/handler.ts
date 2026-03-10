import type { Context } from "hono";
import type {
  DCRRequest,
  DCRResponse,
  DCRErrorResponse,
} from "../../../../shared/types/honoEnv.js";
import { logError, logInfo } from "../../../../shared/logger/index.js";
import * as openidClient from "openid-client";
import { ResponseBodyError, allowInsecureRequests } from "openid-client";
import { isLocalhostUrl } from "../../../../infrastructure/keycloak/keycloakConfig.js";

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
        error:
          (error.error as DCRErrorResponse["error"]) ||
          "invalid_client_metadata",
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
