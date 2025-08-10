import type { Request, Response } from "express";
import { db } from "@tumiki/db/tcp";
import { sendOAuthErrorResponse } from "../../utils/errorResponse.js";
import { auth0Config } from "../../libs/auth0Config.js";
import { oauthStore } from "../../utils/oauthStore.js";
import {
  authenticateOAuthClient,
  getAuth0M2MToken,
  updateApiKeyLastUsed,
  type Auth0TokenResponse,
} from "../../utils/oauthHelpers.js";
import { verifyApiKey } from "../../utils/apiKey.js";

/**
 * OAuth Token Endpoint (簡易版)
 * McpApiKeyテーブルでクライアント認証を行い、Auth0 M2Mトークンを返却
 * POST /oauth/token
 */
interface TokenRequestBody {
  grant_type: string;
  client_id?: string;
  client_secret?: string;
  code?: string;
  redirect_uri?: string;
  code_verifier?: string;
  scope?: string;
  refresh_token?: string;
  resource?: string;
}

export const handleOAuthToken = async (
  req: Request<object, object, TokenRequestBody>,
  res: Response,
): Promise<void> => {
  // デバッグログ（開発環境のみ）
  if (process.env.NODE_ENV !== "production") {
    console.log("🔑 OAuth Token endpoint called");
    console.log("Grant type:", req.body.grant_type);
  }

  try {
    const { grant_type } = req.body;

    // grant_typeごとの処理
    if (grant_type === "authorization_code") {
      // Authorization Code Grant の処理
      await handleAuthorizationCodeGrant(req, res);
      return;
    } else if (grant_type === "client_credentials") {
      // Client Credentials Grant の処理（既存の処理）
      await handleClientCredentialsGrant(req, res);
      return;
    } else if (grant_type === "refresh_token") {
      // Refresh Token Grant の処理
      await handleRefreshTokenGrant(req, res);
      return;
    } else {
      res.status(400).json({
        error: "unsupported_grant_type",
        error_description: `Unsupported grant type: ${grant_type}`,
      });
      return;
    }
  } catch (error) {
    console.error("Token generation error:", error);
    sendOAuthErrorResponse(res, 500, "server_error", "Server error");
  }
};

/**
 * Authorization Code Grant の処理
 */
const handleAuthorizationCodeGrant = async (
  req: Request<object, object, TokenRequestBody>,
  res: Response,
): Promise<void> => {
  // URLエンコード形式のパラメータ名のバリエーションに対応
  const code = req.body.code;
  const redirect_uri = req.body.redirect_uri;
  const client_id = req.body.client_id;
  const client_secret = req.body.client_secret;
  const code_verifier = req.body.code_verifier;

  // デバッグログ（開発環境のみ）
  if (process.env.NODE_ENV !== "production") {
    console.log("🔄 Authorization Code Grant - Token Exchange");
    console.log("Code:", code ? "present" : "missing");
    console.log("Client ID:", client_id ? "present" : "missing");
  }

  // 必須パラメータの検証（client_idは後で取得可能なため、codeとredirect_uriのみ必須）
  if (!code || !redirect_uri) {
    const missing = [];
    if (!code) missing.push("code");
    if (!redirect_uri) missing.push("redirect_uri");
    sendOAuthErrorResponse(
      res,
      400,
      "invalid_request",
      `Missing required parameters for authorization_code grant: ${missing.join(", ")}`,
    );
    return;
  }

  try {
    // コードマッピングから元のクライアント情報を取得
    const codeMapping = oauthStore.getCodeMapping(code);

    // コードマッピングがない場合、Auth0に直接転送を試みる（MCP Inspector互換性）
    let finalClientId = client_id;
    if (!codeMapping) {
      console.log(
        "⚠️ No code mapping found, attempting direct Auth0 forwarding",
      );
      // client_idがない場合、最後に登録されたクライアントIDを使用（開発用）
      if (!client_id) {
        // TODO: 本番環境では適切なクライアント検証が必要
        console.log("⚠️ No client_id provided, using fallback");
        finalClientId = "client_fallback"; // 仮のクライアントID
      }
    } else if (codeMapping.originalClientId !== client_id && client_id) {
      sendOAuthErrorResponse(res, 400, "invalid_grant", "Client ID mismatch");
      return;
    } else if (!client_id) {
      finalClientId = codeMapping.originalClientId;
    }

    // クライアント認証（client_secretがある場合、かつclient_idが存在する場合）
    if (client_secret && finalClientId && finalClientId !== "client_fallback") {
      const apiKeyRecord = await db.mcpApiKey.findFirst({
        where: {
          apiKey: finalClientId,
          isActive: true,
        },
      });

      if (
        !apiKeyRecord ||
        !(await verifyApiKey(client_secret, apiKeyRecord.apiKeyHash || ""))
      ) {
        sendOAuthErrorResponse(
          res,
          401,
          "invalid_client",
          "Client authentication failed",
        );
        return;
      }
    }

    // Auth0の実際のクライアント認証情報
    // ユーザー認証用の通常のクライアントを使用
    const auth0ClientId = process.env.AUTH0_CLIENT_ID;
    const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET;

    if (!auth0ClientId || !auth0ClientSecret) {
      console.error("Auth0 client credentials not configured");
      sendOAuthErrorResponse(
        res,
        500,
        "server_error",
        "OAuth configuration error",
      );
      return;
    }

    // Auth0のトークンエンドポイントにコードを転送
    const auth0TokenUrl = auth0Config.endpoints.token;
    const auth0CallbackUrl = `${process.env.MCP_PROXY_URL || "http://localhost:8080"}/oauth/callback`;

    const tokenResponse = await fetch(auth0TokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: auth0ClientId,
        client_secret: auth0ClientSecret,
        code: code,
        redirect_uri: auth0CallbackUrl,
        code_verifier: code_verifier,
        audience: "https://auth.tumiki.cloud/api",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Failed to exchange code with Auth0:", errorText);
      sendOAuthErrorResponse(
        res,
        500,
        "server_error",
        "Failed to obtain access token",
      );
      return;
    }

    const data = (await tokenResponse.json()) as Auth0TokenResponse;

    console.log("✅ Token obtained from Auth0:");
    console.log(
      "  - Access token prefix:",
      data.access_token?.substring(0, 20) + "...",
    );
    console.log("  - Token type:", data.token_type);
    console.log("  - Scope:", data.scope);
    console.log("  - Has refresh token:", !!data.refresh_token);
    console.log("  - Has ID token:", !!data.id_token);

    // コードマッピングを削除（一度だけ使用可能）
    if (codeMapping) {
      oauthStore.deleteCodeMapping(code);
    }

    // OAuth 2.0 Token Response
    const response = {
      access_token: data.access_token,
      token_type: "Bearer",
      expires_in: data.expires_in || 86400,
      scope: data.scope || "mcp:access",
      refresh_token: data.refresh_token,
      id_token: data.id_token,
    };
    res.json(response);
  } catch (error) {
    console.error("Authorization code exchange error:", error);
    sendOAuthErrorResponse(res, 500, "server_error", "Token exchange failed");
  }
};

/**
 * Client Credentials Grant の処理（既存の処理）
 */
const handleClientCredentialsGrant = async (
  req: Request<object, object, TokenRequestBody>,
  res: Response,
): Promise<void> => {
  const { client_id, client_secret, scope } = req.body;

  // デバッグログ（開発環境のみ）
  if (process.env.NODE_ENV !== "production") {
    console.log("🔒 Client Credentials Grant - Token Request");
  }

  // 必須パラメータの検証
  if (!client_id || !client_secret) {
    const missing = [];
    if (!client_id) missing.push("client_id");
    if (!client_secret) missing.push("client_secret");
    sendOAuthErrorResponse(
      res,
      400,
      "invalid_request",
      `Missing required parameters: ${missing.join(", ")}`,
    );
    return;
  }

  // クライアント認証
  const authResult = await authenticateOAuthClient(client_id, client_secret);

  if (!authResult.isValid) {
    console.log("❌", authResult.error);
    sendOAuthErrorResponse(
      res,
      authResult.error?.includes("expired")
        ? 401
        : authResult.error?.includes("authType")
          ? 403
          : 401,
      authResult.error?.includes("authType")
        ? "invalid_request"
        : "invalid_client",
      authResult.error || "Client authentication failed",
    );
    return;
  }

  const { apiKeyRecord } = authResult;

  // 最終使用日時を更新（非同期で実行）
  if (apiKeyRecord) {
    updateApiKeyLastUsed(apiKeyRecord.id);
  }

  // Auth0 M2Mトークンを取得

  const tokenResult = await getAuth0M2MToken(scope);

  if (!tokenResult.success) {
    console.error(tokenResult.error);
    sendOAuthErrorResponse(
      res,
      500,
      "server_error",
      tokenResult.error || "Failed to obtain access token",
    );
    return;
  }

  const data = tokenResult.data!;

  // OAuth 2.0 Token Response (RFC 6749準拠)
  const response = {
    access_token: data.access_token,
    token_type: "Bearer",
    expires_in: data.expires_in || 86400,
    scope: data.scope || "mcp:access",
    // Tumiki拡張フィールド
    mcp_server_instance_id:
      apiKeyRecord?.userMcpServerInstance?.id || undefined,
  };
  res.json(response);
};

/**
 * Refresh Token Grant の処理
 */
const handleRefreshTokenGrant = async (
  req: Request<object, object, TokenRequestBody>,
  res: Response,
): Promise<void> => {
  const { refresh_token } = req.body;

  // デバッグログ（開発環境のみ）
  if (process.env.NODE_ENV !== "production") {
    console.log("🔄 Refresh Token Grant - Token Request");
  }

  // 一時的に無効化して無限ループを防ぐ
  console.warn(
    "⚠️ Refresh token grant is temporarily disabled to prevent infinite loop",
  );
  sendOAuthErrorResponse(
    res,
    400,
    "temporarily_unavailable",
    "Refresh token grant is temporarily disabled. Please use authorization_code flow to re-authenticate.",
  );
  return;

  // 以下のコードは一時的に無効化されているが、将来的に有効化予定

  if (false) {
    try {
      // Auth0の設定を取得
      const auth0TokenUrl = auth0Config.endpoints.token;
      const auth0ClientId = process.env.AUTH0_CLIENT_ID;
      const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET;

      if (!auth0ClientId || !auth0ClientSecret) {
        console.error("Auth0 client credentials not configured");
        sendOAuthErrorResponse(
          res,
          500,
          "server_error",
          "OAuth configuration error",
        );
        return;
      }

      console.log("📤 Forwarding refresh token to Auth0");
      console.log("Auth0 Token URL:", auth0TokenUrl);

      // Auth0のトークンエンドポイントにrefresh_tokenを転送
      const tokenResponse = await fetch(auth0TokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          client_id: auth0ClientId,
          client_secret: auth0ClientSecret,
          refresh_token: refresh_token,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Failed to refresh token with Auth0:", errorText);

        // Auth0からのエラーレスポンスを解析
        let errorData: { error?: string; error_description?: string } = {};
        try {
          errorData = JSON.parse(errorText) as {
            error?: string;
            error_description?: string;
          };
        } catch {
          errorData = {
            error: "invalid_grant",
            error_description: "The refresh token is invalid or expired",
          };
        }

        sendOAuthErrorResponse(
          res,
          tokenResponse.status === 401 ? 401 : 400,
          errorData.error || "invalid_grant",
          errorData.error_description ||
            "The refresh token is invalid or expired",
        );
        return;
      }

      const data = (await tokenResponse.json()) as Auth0TokenResponse;

      console.log("✅ Token refreshed successfully");

      // OAuth 2.0 Token Response
      const response = {
        access_token: data.access_token,
        token_type: "Bearer",
        expires_in: data.expires_in || 86400,
        scope: data.scope || "mcp:access",
        refresh_token: data.refresh_token, // 新しいrefresh_tokenが返される場合
        id_token: data.id_token,
      };
      res.json(response);
    } catch (error) {
      console.error("Refresh token error:", error);
      sendOAuthErrorResponse(res, 500, "server_error", "Token refresh failed");
    }
  }
};
