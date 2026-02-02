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
  // OAuthタイプのインスタンスのみをフィルタリング
  const oauthInstances = newInstances.filter(
    (instance) => instance.mcpServerTemplate.authType === AuthType.OAUTH,
  );

  // OAuthインスタンスがない場合は早期リターン
  if (oauthInstances.length === 0) {
    return;
  }

  // バッチでトークンを取得（N+1クエリを回避）
  const templateIds = oauthInstances.map(
    (instance) => instance.mcpServerTemplateId,
  );
  const newInstanceIds = oauthInstances.map((instance) => instance.id);

  const existingTokens = await prisma.mcpOAuthToken.findMany({
    where: {
      userId,
      mcpServerTemplateInstance: {
        mcpServerTemplateId: { in: templateIds },
        id: { notIn: newInstanceIds },
      },
    },
    include: {
      mcpServerTemplateInstance: {
        select: { mcpServerTemplateId: true },
      },
    },
  });

  // テンプレートIDをキーにしたマップを作成
  const tokenMap = new Map(
    existingTokens.map((token) => [
      token.mcpServerTemplateInstance.mcpServerTemplateId,
      token,
    ]),
  );

  // コピーするトークンデータを収集
  const tokensToCreate = oauthInstances
    .map((instance) => {
      const existingToken = tokenMap.get(instance.mcpServerTemplateId);
      if (!existingToken) {
        return null;
      }

      return {
        oauthClientId: existingToken.oauthClientId,
        mcpServerTemplateInstanceId: instance.id,
        userId,
        organizationId,
        accessToken: existingToken.accessToken,
        refreshToken: existingToken.refreshToken,
        expiresAt: existingToken.expiresAt,
        tokenPurpose: existingToken.tokenPurpose,
      };
    })
    .filter((token) => token !== null);

  // バッチでトークンを作成
  if (tokensToCreate.length > 0) {
    await prisma.mcpOAuthToken.createMany({
      data: tokensToCreate,
    });
  }
};
