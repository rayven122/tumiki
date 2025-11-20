/**
 * OAuth Callbackエンドポイント
 * GET /api/oauth/callback?code=xxx&state=yyy
 *
 * OAuth認証後のコールバックを処理してトークンを取得・保存
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@tumiki/db/server";
import { auth } from "@/auth";
import type { OAuthTokenData } from "@/lib/oauth/simple-oauth";
import type { OAuthSession, McpServer, OAuthClient } from "@tumiki/db";
import { getMcpServerToolsHTTP } from "@/utils/getMcpServerTools";
import { ServerStatus, ServerType } from "@tumiki/db/prisma";
import { generateApiKey } from "@/utils/server";

/**
 * コールバックパラメータを検証
 */
const validateCallbackParams = (
  searchParams: URLSearchParams,
): { code: string; state: string } | { error: string } => {
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("[OAuth Callback Error]", error, errorDescription);
    return { error };
  }

  if (!code || !state) {
    return { error: "Missing+code+or+state" };
  }

  return { code, state };
};

/**
 * OAuthSessionを検証
 */
const validateOAuthSession = async (
  state: string,
  userId: string,
): Promise<
  | { session: OAuthSession & { user: { id: string } } }
  | { error: string; sessionId?: string }
> => {
  const oauthSession = await db.oAuthSession.findUnique({
    where: { sessionId: state },
    include: { user: true },
  });

  if (!oauthSession) {
    return { error: "Invalid+session" };
  }

  // セッション有効期限チェック
  if (oauthSession.expiresAt < new Date()) {
    await db.oAuthSession.update({
      where: { id: oauthSession.id },
      data: { status: "expired" },
    });
    return { error: "Session+expired", sessionId: oauthSession.id };
  }

  // ユーザーID確認
  if (oauthSession.userId !== userId) {
    return { error: "User+mismatch" };
  }

  return { session: oauthSession };
};

/**
 * MCPサーバー情報を取得
 */
const getMcpServerInfo = async (
  mcpServerId: string,
  oauthSessionId: string,
): Promise<
  { mcpServer: McpServer & { oauthClient: OAuthClient } } | { error: string }
> => {
  const mcpServer = await db.mcpServer.findUnique({
    where: { id: mcpServerId },
    include: { oauthClient: true },
  });

  if (!mcpServer?.oauthClient || !mcpServer.oauthProvider) {
    await db.oAuthSession.update({
      where: { id: oauthSessionId },
      data: {
        status: "failed",
        errorCode: "server_not_found",
        errorDescription: "MCP server or OAuth client not found",
      },
    });
    return { error: "Server+not+found" };
  }

  return { mcpServer: mcpServer as McpServer & { oauthClient: OAuthClient } };
};

/**
 * 認可コードをアクセストークンに交換（fetchを使用した直接実装）
 */
const exchangeCodeForToken = async (
  code: string,
  oauthSession: OAuthSession,
  oauthClient: OAuthClient,
): Promise<{ tokenData: OAuthTokenData } | { error: string }> => {
  try {
    // トークンリクエストボディを作成
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: oauthSession.redirectUri,
      client_id: oauthClient.clientId,
      client_secret: oauthClient.clientSecret ?? "",
      code_verifier: oauthSession.codeVerifier,
    });

    // fetchでトークンエンドポイントにリクエスト
    const response = await fetch(oauthClient.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(
        `Token request failed: ${response.status} ${response.statusText}`,
      );
    }

    // レスポンスのテキストを取得してJSONとしてパース
    const responseText = await response.text();
    const tokenData = JSON.parse(responseText) as OAuthTokenData;

    return { tokenData };
  } catch (error) {
    console.error("[OAuth Token Exchange Error]", error);

    await db.oAuthSession.update({
      where: { id: oauthSession.id },
      data: {
        status: "failed",
        errorCode: "token_request_failed",
        errorDescription:
          error instanceof Error
            ? error.message
            : "Failed to obtain access token",
      },
    });

    return { error: "Token+request+failed" };
  }
};

/**
 * UserMcpServerConfigを取得または作成
 */
const getOrCreateUserMcpConfig = async (
  userId: string,
  mcpServerId: string,
  mcpServerName: string,
  mcpServerDescription: string,
) => {
  const userOrg = await db.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });

  if (!userOrg) {
    return { error: "Organization+not+found" };
  }

  let userMcpConfig = await db.userMcpServerConfig.findFirst({
    where: {
      mcpServerId,
      organizationId: userOrg.organizationId,
    },
  });

  // 存在しない場合は作成
  userMcpConfig ??= await db.userMcpServerConfig.create({
    data: {
      name: mcpServerName,
      description: mcpServerDescription,
      mcpServerId,
      organizationId: userOrg.organizationId,
      envVars: JSON.stringify({}),
    },
  });

  return { userMcpConfig };
};

/**
 * OAuthTokenを保存
 */
const saveOAuthToken = async (
  userMcpConfigId: string,
  oauthClientId: string,
  tokenData: OAuthTokenData,
  oauthSession: OAuthSession,
) => {
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await db.oAuthToken.upsert({
    where: {
      userMcpConfigId_tokenPurpose: {
        userMcpConfigId,
        tokenPurpose: "BACKEND_MCP",
      },
    },
    create: {
      userMcpConfigId,
      oauthClientId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      idToken: tokenData.id_token ?? null,
      tokenType: tokenData.token_type ?? "Bearer",
      scope: tokenData.scope ?? null,
      expiresAt,
      state: oauthSession.state,
      nonce: oauthSession.nonce,
      codeVerifier: oauthSession.codeVerifier,
      codeChallenge: oauthSession.codeChallenge,
      codeChallengeMethod: oauthSession.codeChallengeMethod,
      tokenPurpose: "BACKEND_MCP",
    },
    update: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      idToken: tokenData.id_token ?? null,
      tokenType: tokenData.token_type ?? "Bearer",
      scope: tokenData.scope ?? null,
      expiresAt,
      isValid: true,
      lastUsedAt: new Date(),
      refreshCount: 0,
      lastError: null,
      lastErrorAt: null,
    },
  });
};

export const GET = async (request: NextRequest) => {
  try {
    // 認証チェック
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL("/auth/signin?error=Unauthorized", request.url),
      );
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;

    // パラメータ検証
    const paramsResult = validateCallbackParams(searchParams);
    if ("error" in paramsResult) {
      return NextResponse.redirect(
        new URL(`/mcp/servers?error=${paramsResult.error}`, request.url),
      );
    }
    const { code, state } = paramsResult;

    // OAuthSessionを検証
    const sessionResult = await validateOAuthSession(state, userId);
    if ("error" in sessionResult) {
      return NextResponse.redirect(
        new URL(`/mcp/servers?error=${sessionResult.error}`, request.url),
      );
    }
    const oauthSession = sessionResult.session;

    // MCPサーバー情報を取得
    const serverResult = await getMcpServerInfo(
      oauthSession.mcpServerId,
      oauthSession.id,
    );
    if ("error" in serverResult) {
      return NextResponse.redirect(
        new URL(`/mcp/servers?error=${serverResult.error}`, request.url),
      );
    }
    const { mcpServer } = serverResult;
    const oauthClient = mcpServer.oauthClient;

    // 認可コードをアクセストークンに交換
    const tokenResult = await exchangeCodeForToken(
      code,
      oauthSession,
      oauthClient,
    );
    if ("error" in tokenResult) {
      return NextResponse.redirect(
        new URL(`/mcp/servers?error=${tokenResult.error}`, request.url),
      );
    }
    const { tokenData } = tokenResult;

    // UserMcpServerConfigを取得または作成
    const configResult = await getOrCreateUserMcpConfig(
      userId,
      mcpServer.id,
      mcpServer.name,
      mcpServer.description ?? "",
    );
    if ("error" in configResult) {
      return NextResponse.redirect(
        new URL(`/mcp/servers?error=${configResult.error}`, request.url),
      );
    }
    const { userMcpConfig } = configResult;

    // OAuthTokenを保存
    await saveOAuthToken(
      userMcpConfig.id,
      oauthClient.id,
      tokenData,
      oauthSession,
    );

    // OAuth認証完了後、MCPサーバーからツールを取得してインスタンスを作成
    try {
      // Authorizationヘッダーを準備
      const headers = {
        Authorization: `Bearer ${tokenData.access_token}`,
      };

      // MCPサーバーからツールを取得
      const tools = await getMcpServerToolsHTTP(
        {
          name: mcpServer.name,
          url: mcpServer.url!,
        },
        headers,
      );

      if (tools && tools.length > 0) {
        // トランザクション内でツール、ツールグループ、インスタンスを作成
        await db.$transaction(async (tx) => {
          // 既存のツールを削除（再取得のため）
          await tx.tool.deleteMany({
            where: { mcpServerId: mcpServer.id },
          });

          // ツールを作成
          const createdTools = await Promise.all(
            tools.map((tool) =>
              tx.tool.create({
                data: {
                  mcpServerId: mcpServer.id,
                  name: tool.name,
                  description: tool.description ?? "",
                  inputSchema: tool.inputSchema as object,
                },
              }),
            ),
          );

          // ツールグループとの関連データを準備
          const toolGroupTools = createdTools.map((tool) => ({
            toolId: tool.id,
            userMcpServerConfigId: userMcpConfig.id,
          }));

          // UserToolGroupを作成
          const toolGroup = await tx.userToolGroup.create({
            data: {
              organizationId: userMcpConfig.organizationId,
              name: mcpServer.name,
              description: "",
              toolGroupTools: {
                createMany: {
                  data: toolGroupTools,
                },
              },
            },
          });

          // APIキーを生成
          const fullKey = generateApiKey();

          // UserMcpServerInstanceを作成
          await tx.userMcpServerInstance.create({
            data: {
              organizationId: userMcpConfig.organizationId,
              name: mcpServer.name,
              description: mcpServer.description ?? "",
              serverStatus: ServerStatus.RUNNING,
              serverType: ServerType.OFFICIAL,
              toolGroupId: toolGroup.id,
              apiKeys: {
                create: {
                  name: `${mcpServer.name} API Key`,
                  apiKey: fullKey,
                  userId,
                },
              },
            },
          });
        });
      }
    } catch (toolError) {
      console.error("[Tool Fetch Error]", toolError);
      // ツール取得エラーは警告として扱い、認証自体は成功とする
    }

    // OAuthSessionを完了状態に更新
    await db.oAuthSession.update({
      where: { id: oauthSession.id },
      data: { status: "completed" },
    });

    // 成功時、MCPサーバー一覧ページにリダイレクト
    return NextResponse.redirect(
      new URL(
        `/mcp/servers?success=OAuth+authentication+completed`,
        request.url,
      ),
    );
  } catch (error) {
    console.error("[OAuth Callback Error]", error);
    return NextResponse.redirect(
      new URL(
        `/mcp/servers?error=${encodeURIComponent(
          error instanceof Error ? error.message : "Unknown error",
        )}`,
        request.url,
      ),
    );
  }
};
