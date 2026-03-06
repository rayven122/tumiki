/**
 * OAuth検証とサーバー情報取得のヘルパー関数
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import * as oauth from "oauth4webapi";
import {
  verifyStateToken,
  type OAuthStatePayload,
} from "@/lib/oauth/state-token";
import {
  exchangeCodeForToken,
  type OAuthTokenData,
} from "@/lib/oauth/oauth-client";
import { discoverOAuthMetadata } from "@/lib/oauth/dcr";

/**
 * OAuth State tokenを検証してペイロードを取得
 * @param state - OAuth state token
 * @param userId - 検証するユーザーID
 * @returns State tokenのペイロード
 */
export const verifyOAuthState = async (
  state: string,
  userId: string,
): Promise<OAuthStatePayload> => {
  // State tokenを検証
  let statePayload: OAuthStatePayload;
  try {
    statePayload = await verifyStateToken(state);
  } catch (error) {
    console.error("[State Token Verification Error]", error);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid state token",
    });
  }

  // ユーザーID確認
  if (statePayload.userId !== userId) {
    // セキュリティログとして記録
    console.warn(
      `[OAuth Security] User ID mismatch detected. Expected: ${userId}, Got: ${statePayload.userId}`,
    );
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Authentication failed", // 詳細を隠す
    });
  }

  // 有効期限チェック
  if (Date.now() > statePayload.expiresAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Authentication session expired",
    });
  }

  return statePayload;
};

/**
 * MCPサーバーとOAuthクライアント情報を取得
 */
export const getMcpServerAndOAuthClient = async (
  tx: PrismaTransactionClient,
  mcpServerTemplateInstanceId: string,
  organizationId: string,
) => {
  // MCPサーバーテンプレートインスタンスから直接取得
  const templateInstance = await tx.mcpServerTemplateInstance.findUniqueOrThrow(
    {
      where: { id: mcpServerTemplateInstanceId },
      select: {
        id: true,
        mcpServer: {
          select: {
            id: true,
            name: true,
            organizationId: true,
            serverStatus: true,
          },
        },
        mcpServerTemplate: {
          select: {
            id: true,
            url: true,
            transportType: true,
          },
        },
      },
    },
  );

  const { mcpServer, mcpServerTemplate: template } = templateInstance;

  // 組織IDが一致することを確認
  if (mcpServer.organizationId !== organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "このMCPサーバーへのアクセス権限がありません",
    });
  }

  if (!template?.url) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーテンプレートのURLが見つかりません",
    });
  }

  // McpOAuthClientを取得（最新のものを使用）
  const oauthClient = await tx.mcpOAuthClient.findFirst({
    where: {
      mcpServerTemplateId: template.id,
      organizationId: mcpServer.organizationId,
    },
    select: {
      id: true,
      clientId: true,
      clientSecret: true,
      authorizationServerUrl: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!oauthClient) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "OAuth clientが見つかりません",
    });
  }

  // 組織情報を取得
  const organization = await tx.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true },
  });

  if (!organization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "組織が見つかりません",
    });
  }

  return {
    mcpServer: {
      id: mcpServer.id,
      name: mcpServer.name,
      templateUrl: template.url,
      transportType: template.transportType,
      serverStatus: mcpServer.serverStatus,
    },
    mcpServerTemplateId: template.id,
    mcpServerTemplateInstanceId: templateInstance.id,
    oauthClient,
    organization,
  };
};

/**
 * 認可コードをアクセストークンに交換
 */
export const exchangeAuthorizationCode = async (
  currentUrl: URL,
  state: string,
  statePayload: OAuthStatePayload,
  oauthClient: {
    clientId: string;
    clientSecret: string | null;
    authorizationServerUrl: string;
  },
  originalServerUrl: string, // 元のMCPサーバーURL
): Promise<OAuthTokenData> => {
  // OAuth メタデータを取得して正しいエンドポイントを使用
  // 元のサーバーURL（MCPサーバーテンプレートのURL）を使用
  // これにより、issuerが異なる場合でも正しいメタデータを取得できる
  const authServer = await discoverOAuthMetadata(originalServerUrl);

  // OAuth Clientオブジェクトを構築
  // clientSecretの有無で認証方式を決定（パブリッククライアント対応）
  const client: oauth.Client = {
    client_id: oauthClient.clientId,
    token_endpoint_auth_method: oauthClient.clientSecret
      ? "client_secret_post"
      : "none",
    ...(oauthClient.clientSecret && {
      client_secret: oauthClient.clientSecret,
    }),
  };

  // 認可コードをアクセストークンに交換
  let params: URLSearchParams;
  try {
    params = oauth.validateAuthResponse(authServer, client, currentUrl, state);
  } catch (error) {
    console.error("[OAuth Callback Validation Error]", error);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        error instanceof Error
          ? error.message
          : "Authorization response validation failed",
    });
  }

  try {
    return await exchangeCodeForToken(
      authServer,
      client,
      params,
      statePayload.redirectUri,
      statePayload.codeVerifier,
    );
  } catch (error) {
    console.error("[OAuth Token Exchange Error]", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Token exchange failed",
    });
  }
};
