import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { AddCustomServerInput } from ".";
import { ServerStatus, ServerType } from "@tumiki/db/prisma";
import { generateApiKey } from "@/utils/server";

type AddCustomServerParams = {
  ctx: ProtectedContext;
  input: z.infer<typeof AddCustomServerInput>;
};

/**
 * 新スキーマ：カスタムサーバー追加
 * - UserToolGroup削除
 * - McpServerとMcpToolの多対多リレーション使用
 * - mcpConfigIdとallowedToolIdsを受け取る
 */
export const addCustomServer = async ({
  ctx,
  input,
}: AddCustomServerParams) => {
  const { mcpConfigId, allowedToolIds } = input;

  const organizationId = ctx.currentOrganizationId;

  const serverInstance = await ctx.db.$transaction(async (tx) => {
    // McpConfigの存在確認
    const mcpConfig = await tx.mcpConfig.findUnique({
      where: {
        id: mcpConfigId,
        organizationId,
      },
    });

    if (!mcpConfig) {
      throw new Error("MCPサーバー設定が見つかりません");
    }

    // APIキーを生成
    const fullKey = generateApiKey();

    // McpServerを作成（allowedToolsとの多対多リレーション）
    const data = await tx.mcpServer.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description,
        serverStatus: ServerStatus.PENDING,
        serverType: ServerType.CUSTOM,
        mcpConfigId,
        allowedTools: {
          connect: allowedToolIds.map((id) => ({ id })),
        },
        apiKeys: {
          create: {
            name: `${input.name} API Key`,
            apiKey: fullKey,
            userId: ctx.session.user.id,
          },
        },
      },
    });

    return data;
  });

  return serverInstance;
};
