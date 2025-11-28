/**
 * OAuth認証開始 procedure
 * リモートMCPサーバーのOAuth認証フローを開始
 */

import { z } from "zod";
import { protectedProcedure } from "@/server/api/trpc";
import { db } from "@tumiki/db/server";
import { generatePKCEParams } from "@/lib/oauth/pkce";
import {
  createOAuthClient,
  type PKCEAuthorizationParams,
  type OAuthEndpoints,
} from "@/lib/oauth/simple-oauth";
import { getOAuthRedirectUri } from "@/lib/oauth/utils";
import { TRPCError } from "@trpc/server";
import { discoverOAuthMetadata, DCRError } from "@/lib/oauth/dcr";

const authorizeInputSchema = z.object({
  mcpServerId: z.string(),
  userMcpConfigId: z.string(),
  scopes: z.array(z.string()).optional(),
});

export const authorize = protectedProcedure
  .input(authorizeInputSchema)
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const { mcpServerId, scopes } = input;

    // MCPサーバー情報を取得（テンプレート情報を含む）
    const mcpServer = await db.mcpServer.findUnique({
      where: { id: mcpServerId },
      include: { mcpServers: true },
    });

    if (!mcpServer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "MCP server not found",
      });
    }

    if (mcpServer.authType !== "OAUTH") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "MCP server does not support OAuth",
      });
    }

    // テンプレートIDを取得
    const templateId = mcpServer.mcpServers[0]?.id;
    if (!templateId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "MCP server template not found",
      });
    }

    // OAuthClient情報を取得
    const oauthClient = await db.mcpOAuthClient.findFirst({
      where: {
        mcpServerTemplateId: templateId,
        organizationId: mcpServer.organizationId,
      },
    });

    if (!oauthClient) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "OAuth client not configured. Please contact administrator.",
      });
    }

    // PKCEパラメータを生成
    const pkceParams = await generatePKCEParams();

    // リダイレクトURI（環境変数から取得）
    // 注: DCR登録時と同じロジックを使用して一貫性を保つ
    // ctx.req が利用可能な場合はそれを使用、なければデフォルトURL
    const redirectUri = ctx.req
      ? getOAuthRedirectUri(ctx.req)
      : `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback`;

    // OAuthメタデータを取得（エンドポイントとスコープ情報）
    let metadata;
    try {
      metadata = await discoverOAuthMetadata(
        oauthClient.authorizationServerUrl,
      );
    } catch (error) {
      if (error instanceof DCRError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Failed to discover OAuth metadata: ${error.message}`,
          cause: error,
        });
      }
      throw error;
    }

    // スコープを決定（指定されていない場合はメタデータから取得）
    let requestedScopes: string[];

    if (scopes && scopes.length > 0) {
      // スコープが明示的に指定されている場合はそれを使用
      requestedScopes = scopes;
    } else {
      // スコープが指定されていない場合はメタデータから取得
      requestedScopes = metadata.scopes_supported ?? [];

      if (requestedScopes.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No scopes available for this OAuth server",
        });
      }
    }

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
    // メタデータからエンドポイント情報を取得
    const endpoints: OAuthEndpoints = {
      authorizationEndpoint: metadata.authorization_endpoint,
      tokenEndpoint: metadata.token_endpoint,
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
    return {
      authorizationUrl: authUrl.toString(),
      sessionId: oauthSession.sessionId,
      expiresAt: oauthSession.expiresAt.toISOString(),
    };
  });
