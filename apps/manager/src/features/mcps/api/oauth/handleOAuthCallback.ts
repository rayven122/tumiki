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
} from "../helpers/oauth-verification";
import { setupMcpServerTools } from "../helpers/mcp-server-setup";

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
  /** 認証完了後のリダイレクト先（チャット画面等） */
  redirectTo?: string;
  /** 新規サーバー追加時はtrue（再認証時はfalse） */
  isNewServer?: boolean;
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
    const {
      mcpServer,
      mcpServerTemplateInstanceId,
      oauthClient,
      organization,
    } = await getMcpServerAndOAuthClient(
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

    // 4. OAuth Tokenを保存（upsertで新規作成または再認証時の更新に対応）
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    await tx.mcpOAuthToken.upsert({
      where: {
        userId_mcpServerTemplateInstanceId: {
          userId,
          mcpServerTemplateInstanceId,
        },
      },
      create: {
        userId,
        organizationId: statePayload.organizationId,
        oauthClientId: oauthClient.id,
        mcpServerTemplateInstanceId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        expiresAt,
        tokenPurpose: "BACKEND_MCP",
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        expiresAt,
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

    // 新規サーバー追加時（PENDING状態）のみ通知フラグをtrueにする
    const isNewServer = mcpServer.serverStatus === "PENDING";

    return {
      organizationSlug: organization.slug,
      organizationId: statePayload.organizationId,
      mcpServerId: mcpServer.id,
      mcpServerName: mcpServer.name,
      success: true,
      redirectTo: statePayload.redirectTo,
      isNewServer,
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
