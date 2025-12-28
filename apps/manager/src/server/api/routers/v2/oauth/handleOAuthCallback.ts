/**
 * OAuth Callback処理
 * 認可コードをアクセストークンに交換してMCPサーバーをセットアップ
 */

import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import {
  verifyOAuthState,
  getMcpServerAndOAuthClient,
  exchangeAuthorizationCode,
} from "../userMcpServer/helpers/oauth-verification";
import { setupMcpServerTools } from "../userMcpServer/helpers/mcp-server-setup";

export type HandleOAuthCallbackInput = {
  state: string;
  userId: string;
  currentUrl: URL;
};

export type HandleOAuthCallbackOutput = {
  organizationSlug: string;
  organizationId: string;
  mcpServerId: string;
  mcpServerName: string;
  success: boolean;
  error?: string;
};

/**
 * OAuthコールバックを処理
 */
export const handleOAuthCallback = async (
  tx: PrismaTransactionClient,
  input: HandleOAuthCallbackInput,
): Promise<HandleOAuthCallbackOutput> => {
  const { state, userId, currentUrl } = input;

  try {
    // 1. State tokenを検証
    const statePayload = await verifyOAuthState(state, userId);

    // 2. MCPサーバーとOAuthクライアント情報を取得
    const { mcpServer, oauthClient, organization } =
      await getMcpServerAndOAuthClient(
        tx,
        statePayload.mcpServerTemplateInstanceId,
        statePayload.organizationId,
      );

    // 3. 認可コードをアクセストークンに交換
    // 元のサーバーURL（MCPサーバーテンプレートのURL）を使用してメタデータを取得
    const tokenData = await exchangeAuthorizationCode(
      currentUrl,
      state,
      statePayload,
      oauthClient,
      mcpServer.templateUrl, // 元のサーバーURLを渡す
    );

    // 4. OAuth Tokenを保存
    // 注意: 同じOAuthクライアントでも、ユーザーは複数の異なるアカウントを
    // 接続したい場合があるため、常に新しいトークンを作成する
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    await tx.mcpOAuthToken.create({
      data: {
        userId,
        organizationId: statePayload.organizationId,
        oauthClientId: oauthClient.id,
        mcpServerTemplateInstanceId: statePayload.mcpServerTemplateInstanceId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        expiresAt,
        tokenPurpose: "BACKEND_MCP",
      },
    });

    // 5. MCPサーバーからツールを取得してセットアップ
    await setupMcpServerTools(tx, {
      mcpServerId: mcpServer.id,
      mcpServerName: mcpServer.name,
      mcpServerTemplateUrl: mcpServer.templateUrl,
      accessToken: tokenData.access_token,
      transportType: mcpServer.transportType,
    });

    return {
      organizationSlug: organization.slug,
      organizationId: statePayload.organizationId,
      mcpServerId: mcpServer.id,
      mcpServerName: mcpServer.name,
      success: true,
    };
  } catch (error) {
    console.error("[OAuth Callback Error]", error);

    // TRPCErrorの場合はそのまま投げる
    if (error instanceof TRPCError) {
      throw error;
    }

    // その他のエラーは内部サーバーエラーとして扱う
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "OAuth callback failed",
    });
  }
};
