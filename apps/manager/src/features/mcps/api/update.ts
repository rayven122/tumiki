import type { z } from "zod";
import type { UpdateOfficialServerInputV2 } from "./router";
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";

export type UpdateOfficialServerInput = z.infer<
  typeof UpdateOfficialServerInputV2
>;

export type UpdateOfficialServerOutput = {
  id: string;
};

/**
 * 公式MCPサーバーの設定を更新
 *
 * @param prisma Prismaクライアント（トランザクションクライアントも受け付け）
 * @param input 更新データ
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns 更新されたMcpConfig情報
 */
export const updateOfficialServer = async (
  prisma: PrismaTransactionClient,
  input: UpdateOfficialServerInput,
  organizationId: string,
  userId: string,
): Promise<UpdateOfficialServerOutput> => {
  // McpConfigが存在するか確認
  const existingConfig = await prisma.mcpConfig.findUnique({
    where: {
      id: input.id,
    },
  });

  if (!existingConfig) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバー設定が見つかりません",
    });
  }

  // 組織とユーザーの検証
  if (
    existingConfig.organizationId !== organizationId ||
    existingConfig.userId !== userId
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この設定を更新する権限がありません",
    });
  }

  // envVarsを更新
  const updatedConfig = await prisma.mcpConfig.update({
    where: {
      id: input.id,
    },
    data: {
      envVars: JSON.stringify(input.envVars),
    },
  });

  return {
    id: updatedConfig.id,
  };
};
