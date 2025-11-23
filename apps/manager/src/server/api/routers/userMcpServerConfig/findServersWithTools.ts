import type { z } from "zod";
import type { FindAllWithToolsInput } from ".";
import type { ProtectedContext } from "../../trpc";

type FindAllWithToolsInputProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof FindAllWithToolsInput>;
};

/**
 * 新スキーマ：MCP設定とツール一覧取得
 * - userMcpServerConfig → mcpConfig
 * - mcpServer(旧テンプレート) → mcpServerTemplate
 * - tools → mcpTools
 * - userToolGroupTools削除
 */
export const findServersWithTools = async ({
  ctx,
  input,
}: FindAllWithToolsInputProps) => {
  const mcpConfigs = await ctx.db.mcpConfig.findMany({
    where: {
      organizationId: ctx.currentOrganizationId,
      ...(input.mcpConfigIds && {
        id: {
          in: input.mcpConfigIds,
        },
      }),
    },
    orderBy: {
      // 作成した順にソート
      createdAt: "asc",
    },
    include: {
      mcpServerTemplate: {
        include: {
          mcpTools: true,
        },
      },
    },
  });

  // mcpToolsプロパティを追加して返す
  return mcpConfigs.map((config) => ({
    ...config,
    mcpTools: config.mcpServerTemplate?.mcpTools ?? [],
  }));
};
