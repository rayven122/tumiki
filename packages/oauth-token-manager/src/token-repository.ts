/**
 * OAuth Token Repository
 *
 * データベースからのトークン取得・更新処理（純粋関数）
 */

import type { OAuthToken } from "@tumiki/db";
import { db } from "@tumiki/db/server";

/**
 * DBからトークンを取得
 *
 * @param mcpServerId MCPサーバーID
 * @param userId ユーザーID
 * @returns トークン（存在しない場合はnull）
 */
export const getTokenFromDB = async (
  mcpServerId: string,
  userId: string,
): Promise<
  | (OAuthToken & {
      oauthClient: {
        id: string;
        mcpServerId: string;
        clientId: string;
        clientSecret: string | null;
        tokenEndpoint: string;
        authorizationEndpoint: string;
        tokenEndpointAuthMethod: string;
      };
    })
  | null
> => {
  // まず、ユーザーの組織を取得
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      members: {
        select: {
          organizationId: true,
        },
      },
    },
  });

  if (!user || user.members.length === 0) {
    return null;
  }

  // 最初の組織IDを使用（複数組織対応は将来の拡張）
  const organizationId = user.members[0]!.organizationId;

  const token = await db.oAuthToken.findFirst({
    where: {
      tokenPurpose: "BACKEND_MCP",
      userMcpConfig: {
        organizationId,
        mcpServer: {
          id: mcpServerId,
        },
      },
    },
    include: {
      oauthClient: {
        select: {
          id: true,
          mcpServerId: true,
          clientId: true,
          clientSecret: true,
          tokenEndpoint: true,
          authorizationEndpoint: true,
          tokenEndpointAuthMethod: true,
        },
      },
    },
  });

  return token;
};

/**
 * lastUsedAtを更新
 *
 * @param tokenId トークンID
 */
export const updateLastUsedAt = async (tokenId: string): Promise<void> => {
  await db.oAuthToken.update({
    where: { id: tokenId },
    data: {
      lastUsedAt: new Date(),
    },
  });
};
