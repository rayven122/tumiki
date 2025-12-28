import type { PrismaTransactionClient } from "@tumiki/db";
import type { McpServerId } from "@/schema/ids";

type UpdatePiiMaskingInput = {
  id: McpServerId;
  piiMaskingEnabled: boolean;
  organizationId: string;
};

/**
 * MCPサーバーのPIIマスキング設定を更新
 *
 * @param tx Prismaトランザクションクライアント
 * @param input 更新入力
 * @returns 更新されたサーバーID
 */
export const updatePiiMasking = async (
  tx: PrismaTransactionClient,
  input: UpdatePiiMaskingInput,
) => {
  const { id, piiMaskingEnabled, organizationId } = input;

  // サーバーの存在確認と組織所属確認
  const server = await tx.mcpServer.findUnique({
    where: {
      id,
      organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!server) {
    throw new Error("サーバーが見つかりません");
  }

  // PIIマスキング設定を更新
  await tx.mcpServer.update({
    where: { id },
    data: { piiMaskingEnabled },
  });

  return { id };
};
