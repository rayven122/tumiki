import { z } from "zod";
import type { PrismaTransactionClient } from "@tumiki/db";
import { McpServerIdSchema } from "@/schema/ids";
import { generateApiKey as generateTumikiApiKey } from "@/lib/server/apiKey";
import { createAdminNotifications } from "@/features/notification";

export const generateApiKeyInputSchema = z.object({
  serverId: McpServerIdSchema,
  name: z.string().optional(),
  expiresAt: z.date().optional(),
});

export const generateApiKeyOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  apiKey: z.string().optional(), // 発行時のみ返却
  createdAt: z.date(),
});

type GenerateApiKeyInput = z.infer<typeof generateApiKeyInputSchema>;
type GenerateApiKeyOutput = z.infer<typeof generateApiKeyOutputSchema>;

type GenerateApiKeyParams = GenerateApiKeyInput & {
  organizationId: string;
  userId: string;
};

export const generateApiKey = async (
  db: PrismaTransactionClient,
  params: GenerateApiKeyParams,
): Promise<GenerateApiKeyOutput> => {
  const { serverId, organizationId, userId, name, expiresAt } = params;

  // サーバーの存在確認と権限チェック
  const server = await db.mcpServer.findFirst({
    where: {
      id: serverId,
      organizationId,
      deletedAt: null,
    },
  });

  if (!server) {
    throw new Error("サーバーが見つかりません");
  }

  const apiKey = generateTumikiApiKey();

  // APIキー名を生成（未指定の場合）
  const existingKeys = await db.mcpApiKey.count({
    where: {
      mcpServerId: serverId,
      userId,
    },
  });

  const keyName = name ?? `APIキー #${existingKeys + 1}`;

  // データベースに保存
  const createdKey = await db.mcpApiKey.create({
    data: {
      name: keyName,
      apiKey, // 暗号化は @encrypted ディレクティブで自動処理
      isActive: true,
      userId,
      mcpServerId: serverId,
      expiresAt,
    },
  });

  // セキュリティアラート: 管理者に通知（非同期で実行）
  void createAdminNotifications(db, {
    type: "SECURITY_API_KEY_CREATED",
    priority: "NORMAL",
    title: "APIキーが発行されました",
    message: `MCPサーバー「${server.name}」のAPIキー「${keyName}」が発行されました`,
    organizationId,
    triggeredById: userId,
  });

  return {
    id: createdKey.id,
    name: createdKey.name,
    apiKey, // 発行時のみ平文で返す
    createdAt: createdKey.createdAt,
  };
};
