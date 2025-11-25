/**
 * OAuth Token Repository
 *
 * データベースからのトークン取得・更新処理（純粋関数）
 */

import type { McpOAuthToken } from "@tumiki/db";
import { db } from "@tumiki/db/server";

/**
 * DBからトークンを取得
 *
 * @param mcpServerTemplateId MCPサーバーテンプレートID
 * @param userId ユーザーID
 * @returns トークン（存在しない場合はnull）
 */
export const getTokenFromDB = async (
  mcpServerTemplateId: string,
  userId: string,
): Promise<
  | (McpOAuthToken & {
      oauthClient: {
        id: string;
        mcpServerTemplateId: string | null;
        clientId: string;
        clientSecret: string | null;
        authorizationServerUrl: string;
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

  const token = await db.mcpOAuthToken.findFirst({
    where: {
      tokenPurpose: "BACKEND_MCP",
      userId,
      organizationId,
      oauthClient: {
        mcpServerTemplateId,
      },
    },
    include: {
      oauthClient: {
        select: {
          id: true,
          mcpServerTemplateId: true,
          clientId: true,
          clientSecret: true,
          authorizationServerUrl: true,
        },
      },
    },
  });

  return token;
};

/**
 * lastUsedAtを更新
 *
 * 新スキーマではlastUsedAtフィールドが削除されたためno-op
 *
 * @param tokenId トークンID
 */
export const updateLastUsedAt = async (tokenId: string): Promise<void> => {
  // 新スキーマではlastUsedAtフィールドが削除されたためno-op
};
