import type { z } from "zod";
import type { UpdateIconPathInputV2 } from "./router";
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";

export type UpdateIconPathInput = z.infer<typeof UpdateIconPathInputV2>;

export type UpdateIconPathOutput = {
  id: string;
};

/**
 * MCPサーバーのアイコンパスを更新
 *
 * iconPath の形式:
 * - `lucide:{iconName}`: プリセットアイコン（例: `lucide:Server`）
 * - URL形式: カスタム画像URL（例: `https://...blob.vercel-storage.com/...`）
 * - null: デフォルト（ファビコン自動取得にフォールバック）
 *
 * @param tx Prismaトランザクションクライアント
 * @param input 更新データ
 * @param organizationId 組織ID
 * @returns 更新されたMcpServer情報
 */
export const updateIconPath = async (
  tx: PrismaTransactionClient,
  input: UpdateIconPathInput,
  organizationId: string,
): Promise<UpdateIconPathOutput> => {
  // McpServerが存在するか確認
  const existingServer = await tx.mcpServer.findUnique({
    where: {
      id: input.id,
      organizationId,
      deletedAt: null,
    },
  });

  if (!existingServer) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーが見つかりません",
    });
  }

  // iconPathを更新
  const updatedServer = await tx.mcpServer.update({
    where: {
      id: input.id,
    },
    data: {
      iconPath: input.iconPath,
    },
  });

  return {
    id: updatedServer.id,
  };
};
