import type { PrismaTransactionClient } from "@tumiki/db";
import type { McpServerId } from "@/schema/ids";

type UpdateDynamicSearchInput = {
  id: McpServerId;
  dynamicSearchEnabled: boolean;
  organizationId: string;
};

/**
 * MCPサーバーのDynamic Search設定を更新
 *
 * Dynamic Search（AI検索）を有効/無効にする。
 * 有効にすると、AIが関連ツールをセマンティック検索して動的に実行する。
 * ツール数が多い場合に効果的。
 *
 * @param tx Prismaトランザクションクライアント
 * @param input 更新入力
 * @returns 更新されたサーバーID
 */
export const updateDynamicSearch = async (
  tx: PrismaTransactionClient,
  input: UpdateDynamicSearchInput,
) => {
  const { id, dynamicSearchEnabled, organizationId } = input;

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

  // Dynamic Search設定を更新
  await tx.mcpServer.update({
    where: { id },
    data: {
      dynamicSearch: dynamicSearchEnabled,
    },
  });

  return { id };
};
