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
import {
  createOAuthClient,
  type PKCETokenParams,
  type OAuthTokenData,
  type OAuthEndpoints,
} from "@/lib/oauth/simple-oauth";

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

    // パラメータ取得
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // エラーチェック
    if (error) {
      console.error("[OAuth Callback Error]", error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/dashboard/mcp-servers?error=${encodeURIComponent(error)}`,
          request.url,
        ),
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/mcp-servers?error=Missing+code+or+state",
          request.url,
        ),
      );
    }

    // OAuthSessionを検証
    const oauthSession = await db.oAuthSession.findUnique({
      where: { sessionId: state },
      include: {
        user: true,
      },
    });

    if (!oauthSession) {
      return NextResponse.redirect(
        new URL("/dashboard/mcp-servers?error=Invalid+session", request.url),
      );
    }

    // セッション有効期限チェック
    if (oauthSession.expiresAt < new Date()) {
      await db.oAuthSession.update({
        where: { id: oauthSession.id },
        data: { status: "expired" },
      });

      return NextResponse.redirect(
        new URL("/dashboard/mcp-servers?error=Session+expired", request.url),
      );
    }

    // ユーザーID確認
    if (oauthSession.userId !== userId) {
      return NextResponse.redirect(
        new URL("/dashboard/mcp-servers?error=User+mismatch", request.url),
      );
    }

    // MCPサーバー情報を取得
    const mcpServer = await db.mcpServer.findUnique({
      where: { id: oauthSession.mcpServerId },
      include: { oauthClient: true },
    });

    if (!mcpServer?.oauthClient || !mcpServer.oauthProvider) {
      await db.oAuthSession.update({
        where: { id: oauthSession.id },
        data: {
          status: "failed",
          errorCode: "server_not_found",
          errorDescription: "MCP server or OAuth client not found",
        },
      });

      return NextResponse.redirect(
        new URL("/dashboard/mcp-servers?error=Server+not+found", request.url),
      );
    }

    const oauthClient = mcpServer.oauthClient;

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

    // トークンを取得
    let tokenData: OAuthTokenData;
    try {
      const tokenParams: PKCETokenParams = {
        code,
        redirect_uri: oauthSession.redirectUri,
        code_verifier: oauthSession.codeVerifier,
      };
      const result = await oauth2Client.getToken(
        tokenParams as Parameters<typeof oauth2Client.getToken>[0],
      );

      tokenData = result.token as OAuthTokenData;
    } catch (error) {
      console.error("[Token Request Error]", error);

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

      return NextResponse.redirect(
        new URL(
          "/dashboard/mcp-servers?error=Token+request+failed",
          request.url,
        ),
      );
    }

    // UserMcpServerConfigを検索（すでに存在する可能性がある）
    // ここではmcpServerIdとorganizationIdで検索
    const userOrg = await db.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!userOrg) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/mcp-servers?error=Organization+not+found",
          request.url,
        ),
      );
    }

    let userMcpConfig = await db.userMcpServerConfig.findFirst({
      where: {
        mcpServerId: mcpServer.id,
        organizationId: userOrg.organizationId,
      },
    });

    // 存在しない場合は作成
    userMcpConfig ??= await db.userMcpServerConfig.create({
      data: {
        name: mcpServer.name,
        description: `OAuth connected ${mcpServer.name}`,
        mcpServerId: mcpServer.id,
        organizationId: userOrg.organizationId,
        envVars: JSON.stringify({}), // OAuth認証の場合、envVarsは空
      },
    });

    // トークン有効期限を計算
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    // OAuthTokenを保存（upsert）
    await db.oAuthToken.upsert({
      where: {
        userMcpConfigId_tokenPurpose: {
          userMcpConfigId: userMcpConfig.id,
          tokenPurpose: "BACKEND_MCP",
        },
      },
      create: {
        userMcpConfigId: userMcpConfig.id,
        oauthClientId: oauthClient.id,
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

    // OAuthSessionを完了状態に更新
    await db.oAuthSession.update({
      where: { id: oauthSession.id },
      data: {
        status: "completed",
      },
    });

    // 成功時、ダッシュボードにリダイレクト
    return NextResponse.redirect(
      new URL(
        `/dashboard/mcp-servers?success=OAuth+authentication+completed`,
        request.url,
      ),
    );
  } catch (error) {
    console.error("[OAuth Callback Error]", error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/mcp-servers?error=${encodeURIComponent(
          error instanceof Error ? error.message : "Unknown error",
        )}`,
        request.url,
      ),
    );
  }
};
