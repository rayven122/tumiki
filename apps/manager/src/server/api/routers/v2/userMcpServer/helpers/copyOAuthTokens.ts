import type {
  McpServerTemplate,
  McpServerTemplateInstance,
} from "@tumiki/db/server";
import { AuthType } from "@tumiki/db/server";
import type { PrismaTransactionClient } from "@tumiki/db";

/**
 * 新しく作成されたインスタンスに対して、同じテンプレートを使用する既存インスタンスの
 * OAuthトークンをコピーする
 *
 * これにより、Official MCPサーバーで認証済みのトークンをCustom MCPサーバーでも
 * 再認証なしで使用できるようになる
 *
 * @param prisma Prismaトランザクションクライアント
 * @param newInstances 新しく作成されたテンプレートインスタンス（テンプレート情報を含む）
 * @param userId ユーザーID
 * @param organizationId 組織ID
 */
export const copyOAuthTokensForNewInstances = async (
  prisma: PrismaTransactionClient,
  newInstances: (McpServerTemplateInstance & {
    mcpServerTemplate: McpServerTemplate;
  })[],
  userId: string,
  organizationId: string,
): Promise<void> => {
  for (const instance of newInstances) {
    // OAuthタイプのテンプレートのみ対象
    if (instance.mcpServerTemplate.authType !== AuthType.OAUTH) {
      continue;
    }

    // 同じテンプレートを使用する既存インスタンスからトークンを探す
    // 現在作成中のインスタンスは除外
    const existingToken = await prisma.mcpOAuthToken.findFirst({
      where: {
        userId,
        mcpServerTemplateInstance: {
          mcpServerTemplateId: instance.mcpServerTemplateId,
          id: { not: instance.id },
        },
      },
    });

    if (existingToken) {
      // トークンをコピー（新しいインスタンス用に作成）
      await prisma.mcpOAuthToken.create({
        data: {
          oauthClientId: existingToken.oauthClientId,
          mcpServerTemplateInstanceId: instance.id,
          userId,
          organizationId,
          accessToken: existingToken.accessToken,
          refreshToken: existingToken.refreshToken,
          expiresAt: existingToken.expiresAt,
          tokenPurpose: existingToken.tokenPurpose,
        },
      });
    }
  }
};
