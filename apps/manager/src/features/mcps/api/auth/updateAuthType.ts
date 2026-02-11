import { z } from "zod";
import { AuthType, type PrismaTransactionClient } from "@tumiki/db";
import { McpServerIdSchema } from "@/schema/ids";

export const updateAuthTypeInputSchema = z.object({
  id: McpServerIdSchema,
  authType: z.nativeEnum(AuthType),
});

export const updateAuthTypeOutputSchema = z.object({
  id: z.string(),
  authType: z.nativeEnum(AuthType),
});

type UpdateAuthTypeInput = z.infer<typeof updateAuthTypeInputSchema>;
type UpdateAuthTypeOutput = z.infer<typeof updateAuthTypeOutputSchema>;

type UpdateAuthTypeParams = UpdateAuthTypeInput & {
  organizationId: string;
};

export const updateAuthType = async (
  db: PrismaTransactionClient,
  params: UpdateAuthTypeParams,
): Promise<UpdateAuthTypeOutput> => {
  const { id, authType, organizationId } = params;

  // サーバーの存在確認と権限チェック
  const server = await db.mcpServer.findUnique({
    where: {
      id,
      organizationId,
      deletedAt: null,
    },
  });

  if (!server) {
    throw new Error("サーバーが見つかりません");
  }

  // 認証タイプを更新
  const updatedServer = await db.mcpServer.update({
    where: { id },
    data: { authType },
  });

  return {
    id: updatedServer.id,
    authType: updatedServer.authType,
  };
};
