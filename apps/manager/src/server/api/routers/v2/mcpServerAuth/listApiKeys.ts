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
    apiKey: z.string().nullable(), // 自分のキーのみ値を返す、他メンバーのはnull
    isActive: z.boolean(),
    lastUsedAt: z.date().nullable(),
    expiresAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    isOwner: z.boolean(), // 自分が発行したキーかどうか
    user: z.object({
      // 発行者情報
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
    }),
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

  // 共通のクエリオプション
  const userSelect = {
    select: { id: true, name: true, email: true },
  } as const;

  const baseSelect = {
    id: true,
    name: true,
    isActive: true,
    lastUsedAt: true,
    expiresAt: true,
    createdAt: true,
    updatedAt: true,
    user: userSelect,
  } as const;

  const orderBy = { createdAt: "desc" } as const;

  // 2つのクエリを並列実行（パフォーマンス向上）
  const [myApiKeys, otherApiKeys] = await Promise.all([
    // クエリ1: 自分のAPIキー一覧（APIキー値を含む）
    db.mcpApiKey.findMany({
      where: {
        mcpServerId: serverId,
        userId,
        deletedAt: null,
      },
      select: {
        ...baseSelect,
        apiKey: true, // 自分のキーなので値を取得
      },
      orderBy,
    }),
    // クエリ2: 他メンバーのAPIキー一覧（メタデータのみ、APIキー値は取得しない）
    db.mcpApiKey.findMany({
      where: {
        mcpServerId: serverId,
        userId: { not: userId },
        deletedAt: null,
      },
      select: baseSelect, // apiKey は取得しない（セキュリティのため）
      orderBy,
    }),
  ]);

  // 結果を結合して返す
  const myKeys: ListApiKeysOutput = myApiKeys.map((key) => ({
    id: key.id,
    name: key.name,
    apiKey: key.apiKey,
    isActive: key.isActive,
    lastUsedAt: key.lastUsedAt,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
    isOwner: true,
    user: key.user,
  }));

  const otherKeys: ListApiKeysOutput = otherApiKeys.map((key) => ({
    id: key.id,
    name: key.name,
    apiKey: null, // 取得していないのでnull
    isActive: key.isActive,
    lastUsedAt: key.lastUsedAt,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
    isOwner: false,
    user: key.user,
  }));

  // 自分のキーを先に、その後他メンバーのキー（作成日時降順でソート済み）
  return [...myKeys, ...otherKeys];
};
