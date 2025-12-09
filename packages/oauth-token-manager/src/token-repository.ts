/**
 * OAuth Token Repository
 *
 * データベースからのトークン取得・更新処理（純粋関数）
 */

import { db } from "@tumiki/db/server";
import type { Prisma } from "@tumiki/db/prisma";

/**
 * DBからトークンを取得
 *
 * @param mcpServerTemplateInstanceId MCPサーバーテンプレートインスタンスID
 * @param userId ユーザーID
 * @returns トークン（存在しない場合はnull）
 */
export const getTokenFromDB = async (
  mcpServerTemplateInstanceId: string,
  userId: string,
): Promise<Prisma.McpOAuthTokenGetPayload<{
  include: {
    oauthClient: {
      select: {
        id: true;
        mcpServerTemplateId: true;
        clientId: true;
        clientSecret: true;
        authorizationServerUrl: true;
      };
    };
  };
}> | null> => {
  // 複合ユニークキーで直接取得
  const token = await db.mcpOAuthToken.findUnique({
    where: {
      userId_mcpServerTemplateInstanceId: {
        userId,
        mcpServerTemplateInstanceId,
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
