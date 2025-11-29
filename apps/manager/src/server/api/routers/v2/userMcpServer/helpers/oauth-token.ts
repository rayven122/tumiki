/**
 * OAuth Token関連のヘルパー関数
 */
import type { PrismaTransactionClient } from "@tumiki/db";

/**
 * OAuth Tokenを保存または更新
 */
export const saveOAuthToken = async (
  tx: PrismaTransactionClient,
  params: {
    userId: string;
    organizationId: string;
    oauthClientId: string;
    accessToken: string;
    refreshToken: string | null;
    expiresIn: number | null;
  },
): Promise<string> => {
  const {
    userId,
    organizationId,
    oauthClientId,
    accessToken,
    refreshToken,
    expiresIn,
  } = params;
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

  // 既存のトークンを検索
  const existingToken = await tx.mcpOAuthToken.findFirst({
    where: {
      userId,
      organizationId,
      oauthClientId,
      tokenPurpose: "BACKEND_MCP",
    },
    select: { id: true },
  });

  // upsert処理
  const token = await tx.mcpOAuthToken.upsert({
    where: existingToken
      ? { id: existingToken.id }
      : {
          // uniqueなキーが必要なので、ダミーのIDを使用
          id: "dummy-id-that-will-never-exist",
        },
    create: {
      userId,
      organizationId,
      oauthClientId,
      accessToken,
      refreshToken,
      expiresAt,
      tokenPurpose: "BACKEND_MCP",
    },
    update: {
      accessToken,
      refreshToken,
      expiresAt,
    },
    select: { id: true },
  });

  return token.id;
};
