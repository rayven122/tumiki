import { type PrismaTransactionClient, PiiMaskingMode } from "@tumiki/db";
import type { McpServerId } from "@/schema/ids";

type UpdatePiiMaskingInput = {
  id: McpServerId;
  /** UI互換性のためのboolean入力（true = BOTH, false = DISABLED） */
  piiMaskingEnabled: boolean;
  organizationId: string;
};

/**
 * MCPサーバーのPIIマスキング設定を更新
 *
 * UI互換性のため、booleanの piiMaskingEnabled を受け取り、
 * 内部的に PiiMaskingMode に変換して保存する。
 * - true → PiiMaskingMode.BOTH（リクエスト・レスポンス両方をマスク）
 * - false → PiiMaskingMode.DISABLED（マスキング無効）
 *
 * piiInfoTypes は空配列をデフォルトとして使用（全InfoType使用）
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

  // booleanからPiiMaskingModeに変換
  const piiMaskingMode = piiMaskingEnabled
    ? PiiMaskingMode.BOTH
    : PiiMaskingMode.DISABLED;

  // PIIマスキング設定を更新（piiInfoTypesは空配列 = 全InfoType使用）
  await tx.mcpServer.update({
    where: { id },
    data: {
      piiMaskingMode,
      piiInfoTypes: [],
    },
  });

  return { id };
};
