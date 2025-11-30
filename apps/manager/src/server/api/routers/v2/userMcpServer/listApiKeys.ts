import { z } from "zod";
import type { PrismaTransactionClient } from "@tumiki/db";
import { McpServerIdSchema } from "@/schema/ids";

export const listApiKeysInputSchema = z.object({
  serverId: McpServerIdSchema,
});

export const listApiKeysOutputSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    apiKey: z.string().nullable(), // 復号化された値（表示用にはマスク）
    isActive: z.boolean(),
    lastUsedAt: z.date().nullable(),
    expiresAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

type ListApiKeysInput = z.infer<typeof listApiKeysInputSchema>;
type ListApiKeysOutput = z.infer<typeof listApiKeysOutputSchema>;

type ListApiKeysParams = ListApiKeysInput & {
  organizationId: string;
  userId: string;
};

export const listApiKeys = async (
  db: PrismaTransactionClient,
  params: ListApiKeysParams,
): Promise<ListApiKeysOutput> => {
  const { serverId, organizationId, userId } = params;

  // サーバーの存在確認と権限チェック
  const server = await db.mcpServer.findUnique({
    where: {
      id: serverId,
      organizationId,
      deletedAt: null,
    },
  });

  if (!server) {
    throw new Error("サーバーが見つかりません");
  }

  // ユーザーのAPIキー一覧を取得（削除済みを除外）
  const apiKeys = await db.mcpApiKey.findMany({
    where: {
      mcpServerId: serverId,
      userId,
      deletedAt: null, // 削除されていないもののみ
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return apiKeys;
};
