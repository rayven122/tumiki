import type { PrismaTransactionClient } from "@tumiki/db";
import type { McpServerId } from "@/schema/ids";

type UpdateToonConversionInput = {
  id: McpServerId;
  toonConversionEnabled: boolean;
  organizationId: string;
};

/**
 * MCPサーバーのTOON変換設定を更新
 *
 * TOON (Token-Oriented Object Notation) 変換を有効/無効にする。
 * 有効にすると、MCPレスポンスがTOON形式に変換され、
 * AIへのトークン量を削減できる。
 *
 * @param tx Prismaトランザクションクライアント
 * @param input 更新入力
 * @returns 更新されたサーバーID
 */
export const updateToonConversion = async (
  tx: PrismaTransactionClient,
  input: UpdateToonConversionInput,
) => {
  const { id, toonConversionEnabled, organizationId } = input;

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

  // TOON変換設定を更新
  await tx.mcpServer.update({
    where: { id },
    data: {
      toonConversionEnabled,
    },
  });

  return { id };
};
