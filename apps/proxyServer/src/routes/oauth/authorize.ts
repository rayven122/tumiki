import type { Request, Response } from "express";
import { db } from "@tumiki/db/tcp";
import { sendOAuthErrorResponse } from "../../utils/errorResponse.js";
import crypto from "node:crypto";
import { auth0Config } from "../../libs/auth0Config.js";

/**
 * OAuth Authorization Endpoint Proxy
 * クライアントの認可リクエストをAuth0にプロキシする
 * GET/POST /oauth/authorize
 */
export const handleOAuthAuthorize = async (
  req: Request,
  res: Response,
): Promise<void> => {
  console.log("🔐 OAuth Authorize endpoint called");
  console.log("Method:", req.method);
  console.log("Query:", req.query);

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const params = req.method === "GET" ? req.query : req.body;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const response_type = params.response_type as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const client_id = params.client_id as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const redirect_uri = params.redirect_uri as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const scope = params.scope as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const state = params.state as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const code_challenge = params.code_challenge as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const code_challenge_method = params.code_challenge_method as
      | string
      | undefined;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const prompt = params.prompt as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const resource = params.resource as string | undefined;

    // 必須パラメータの確認
    if (!response_type || !client_id || !redirect_uri) {
      sendOAuthErrorResponse(
        res,
        400,
        "invalid_request",
        "Missing required parameters",
      );
      return;
    }

    // クライアントIDの検証（McpApiKeyテーブルで確認）
    const apiKeyRecord = await db.mcpApiKey.findFirst({
      where: {
        apiKey: client_id, // clientIdはapiKeyフィールドに保存されている
        isActive: true,
      },
      include: {
        userMcpServerInstance: {
          select: {
            id: true,
            authType: true,
            userId: true,
            organizationId: true,
          },
        },
      },
    });

    if (!apiKeyRecord) {
      sendOAuthErrorResponse(
        res,
        401,
        "invalid_client",
        "Client authentication failed",
      );
      return;
    }

    // authTypeがOAUTHまたはBOTHであることを確認
    if (
      apiKeyRecord.userMcpServerInstance?.authType !== "OAUTH" &&
      apiKeyRecord.userMcpServerInstance?.authType !== "BOTH"
    ) {
      sendOAuthErrorResponse(
        res,
        403,
        "invalid_request",
        "Server does not support OAuth authentication",
      );
      return;
    }

    // Auth0の実際のクライアントID（環境変数から取得）
    // ユーザー認証用の通常のクライアントを使用
    const auth0ClientId = process.env.AUTH0_CLIENT_ID;
    if (!auth0ClientId) {
      console.error("AUTH0_CLIENT_ID is not configured");
      sendOAuthErrorResponse(
        res,
        500,
        "server_error",
        "OAuth configuration error",
      );
      return;
    }

    // stateパラメータに元のクライアント情報を埋め込む
    // 元のstateとクライアント情報を含む新しいstateを作成
    const proxyState = {
      originalState: state || crypto.randomBytes(16).toString("hex"),
      originalClientId: client_id,
      originalRedirectUri: redirect_uri,
      mcpServerInstanceId: apiKeyRecord.userMcpServerInstanceId,
    };

    // stateをBase64エンコード
    const encodedState = Buffer.from(JSON.stringify(proxyState)).toString(
      "base64url",
    );

    // Auth0のコールバックURL（ProxyServerのコールバックエンドポイント）
    const proxyCallbackUrl = `${
      process.env.MCP_PROXY_URL || "http://localhost:8080"
    }/oauth/callback`;

    // Auth0認可エンドポイントへのリダイレクトURL構築
    const auth0AuthorizeUrl = new URL(auth0Config.endpoints.authorize);

    // パラメータを設定
    auth0AuthorizeUrl.searchParams.set("response_type", response_type);
    auth0AuthorizeUrl.searchParams.set("client_id", auth0ClientId);
    auth0AuthorizeUrl.searchParams.set("redirect_uri", proxyCallbackUrl);
    auth0AuthorizeUrl.searchParams.set("state", encodedState);

    // オプションパラメータ
    if (scope) {
      auth0AuthorizeUrl.searchParams.set("scope", scope);
    }

    // Auth0 APIのaudienceを設定（JWT検証で必要）
    auth0AuthorizeUrl.searchParams.set(
      "audience",
      "https://auth.tumiki.cloud/api",
    );

    if (code_challenge) {
      auth0AuthorizeUrl.searchParams.set("code_challenge", code_challenge);
    }
    if (code_challenge_method) {
      auth0AuthorizeUrl.searchParams.set(
        "code_challenge_method",
        code_challenge_method,
      );
    }
    if (prompt) {
      auth0AuthorizeUrl.searchParams.set("prompt", prompt);
    }
    if (resource) {
      auth0AuthorizeUrl.searchParams.set("resource", resource);
    }

    // Auth0にリダイレクト
    res.redirect(auth0AuthorizeUrl.toString());
  } catch (error) {
    console.error("Authorization proxy error:", error);
    sendOAuthErrorResponse(res, 500, "server_error", "Authorization failed");
  }
};
