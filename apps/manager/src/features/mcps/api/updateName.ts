import type { z } from "zod";
import type { UpdateNameInputV2 } from "./router";
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { normalizeSlug } from "@tumiki/db/utils/slug";

export type UpdateNameInput = z.infer<typeof UpdateNameInputV2>;

export type UpdateNameOutput = {
  id: string;
  slug: string;
};

/**
 * 名前からslugを生成（日本語などの非ASCII文字はフォールバックでタイムスタンプ生成）
 */
const generateSlugFromName = (name: string): string => {
  const normalized = normalizeSlug(name);
  return normalized || `mcp-${Date.now().toString(36)}`;
};

/**
 * MCPサーバーの名前、説明、slugを更新
 *
 * 名前の変更に伴いslugも自動的に再生成される。
 * slugが重複する場合はタイムスタンプを付与してユニーク化。
 *
 * @param tx Prismaトランザクションクライアント
 * @param input 更新データ
 * @param organizationId 組織ID
 * @returns 更新されたMcpServer情報（新しいslugを含む）
 */
export const updateName = async (
  tx: PrismaTransactionClient,
  input: UpdateNameInput,
  organizationId: string,
): Promise<UpdateNameOutput> => {
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

  // 名前からslugを生成
  let newSlug = generateSlugFromName(input.name);

  // 同じslugが既に存在するかチェック（自分自身を除く）
  const duplicateServer = await tx.mcpServer.findFirst({
    where: {
      organizationId,
      slug: newSlug,
      id: { not: input.id },
      deletedAt: null,
    },
    select: { id: true },
  });

  // 重複がある場合はタイムスタンプを付与
  if (duplicateServer) {
    newSlug = `${newSlug}-${Date.now().toString(36)}`;
  }

  // name、description、slugを更新
  const updatedServer = await tx.mcpServer.update({
    where: {
      id: input.id,
    },
    data: {
      name: input.name,
      description: input.description,
      slug: newSlug,
    },
  });

  return {
    id: updatedServer.id,
    slug: updatedServer.slug,
  };
};
