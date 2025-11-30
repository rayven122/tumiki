/**
 * OAuth認証開始エンドポイント
 * POST /api/oauth/authorize
 *
 * リモートMCPサーバーのOAuth認証フローを開始
 */

import { NextResponse } from "next/server";
import { db } from "@tumiki/db/server";
import { auth } from "@/auth";
import { generatePKCEParams } from "@/lib/oauth/pkce";
import {
  createOAuthClient,
  type PKCEAuthorizationParams,
  type OAuthEndpoints,
} from "@/lib/oauth/simple-oauth";
import { getOAuthRedirectUri } from "@/lib/oauth/utils";

type AuthorizeRequestBody = {
  mcpServerId: string;
  userMcpConfigId: string;
  scopes?: string[];
};

const isAuthorizeRequestBody = (
  body: unknown,
): body is AuthorizeRequestBody => {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.mcpServerId === "string" &&
    typeof b.userMcpConfigId === "string" &&
    (b.scopes === undefined || Array.isArray(b.scopes))
  );
};

export const POST = async (request: Request) => {
  try {
    // 認証チェック
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // リクエストボディ
    const requestBody: unknown = await request.json();

    if (!isAuthorizeRequestBody(requestBody)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { mcpServerId, scopes } = requestBody;

    // MCPサーバー情報を取得
    const mcpServer = await db.mcpServer.findUnique({
      where: { id: mcpServerId },
      include: { oauthClient: true },
    });

    if (!mcpServer) {
      return NextResponse.json(
        { error: "MCP server not found" },
        { status: 404 },
      );
    }

    if (mcpServer.authType !== "OAUTH") {
      return NextResponse.json(
        { error: "MCP server does not support OAuth" },
        { status: 400 },
      );
    }

    // OAuthClient情報を取得（存在しない場合はエラー）
    if (!mcpServer.oauthClient) {
      return NextResponse.json(
        {
          error: "OAuth client not configured. Please contact administrator.",
        },
        { status: 400 },
      );
    }

    const oauthClient = mcpServer.oauthClient;

    // PKCEパラメータを生成
    const pkceParams = await generatePKCEParams();

    // リダイレクトURI（環境変数から取得）
    // 注: DCR登録時と同じロジックを使用して一貫性を保つ
    const redirectUri = getOAuthRedirectUri(request);

    // スコープ（指定されていなければデフォルト）
    const requestedScopes =
      scopes && scopes.length > 0 ? scopes : mcpServer.oauthScopes;

    // OAuthSessionを作成
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分後
    const oauthSession = await db.oAuthSession.create({
      data: {
        sessionId: pkceParams.state, // state をsessionIdとして使用
        userId,
        mcpServerId,
        codeVerifier: pkceParams.codeVerifier,
        codeChallenge: pkceParams.codeChallenge,
        codeChallengeMethod: "S256",
        state: pkceParams.state,
        nonce: pkceParams.nonce,
        redirectUri,
        requestedScopes,
        status: "pending",
        expiresAt,
      },
    });

    // simple-oauth2クライアントを作成
    // OAuthClientからエンドポイント情報を取得（DCRで登録済み）
    const endpoints: OAuthEndpoints = {
      authorizationEndpoint: oauthClient.authorizationEndpoint,
      tokenEndpoint: oauthClient.tokenEndpoint,
    };

    const oauth2Client = createOAuthClient(
      oauthClient.clientId,
      oauthClient.clientSecret ?? "",
      endpoints,
    );

    // Authorization URLを構築
    const authParams: PKCEAuthorizationParams = {
      redirect_uri: redirectUri,
      scope: requestedScopes.join(" "),
      state: pkceParams.state,
      code_challenge: pkceParams.codeChallenge,
      code_challenge_method: "S256",
    };
    const authUrl = oauth2Client.authorizeURL(
      authParams as Parameters<typeof oauth2Client.authorizeURL>[0],
    );

    // レスポンス
    return NextResponse.json({
      authorizationUrl: authUrl.toString(),
      sessionId: oauthSession.sessionId,
      expiresAt: oauthSession.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[OAuth Authorize Error]", {
      message: error instanceof Error ? error.message : "Unknown error",
      // センシティブな情報は除外
    });
    return NextResponse.json(
      {
        error: "Failed to initiate OAuth flow",
        // 本番環境では一般的なエラーメッセージのみ
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
      },
      { status: 500 },
    );
  }
};
