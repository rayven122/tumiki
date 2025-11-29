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
} from "./helpers/oauth-verification";
import { saveOAuthToken } from "./helpers/oauth-token";
import { setupMcpServerTools } from "./helpers/mcp-server-setup";

export type HandleOAuthCallbackInput = {
  state: string;
  userId: string;
  currentUrl: URL;
};

export type HandleOAuthCallbackOutput = {
  organizationSlug: string;
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
    const statePayload = await verifyOAuthState(state, userId, tx);

    // 2. MCPサーバーとOAuthクライアント情報を取得
    const { mcpServer, oauthClient, organization } =
      await getMcpServerAndOAuthClient(
        tx,
        statePayload.mcpServerId,
        statePayload.organizationId,
      );

    // 3. 認可コードをアクセストークンに交換
    const tokenData = await exchangeAuthorizationCode(
      currentUrl,
      state,
      statePayload,
      oauthClient,
    );

    // 4. OAuth Tokenを保存
    await saveOAuthToken(tx, {
      userId,
      organizationId: statePayload.organizationId,
      oauthClientId: oauthClient.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresIn: tokenData.expires_in ?? null,
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
