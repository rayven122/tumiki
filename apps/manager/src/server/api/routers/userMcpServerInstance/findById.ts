import { type ProtectedContext } from "@/server/api/trpc";
import { db } from "@tumiki/db/tcp";
import { ServerType } from "@tumiki/db/prisma";

/**
 * 新スキーマ：ID指定でサーバーインスタンスを取得
 * - toolGroup削除、allowedToolsの多対多リレーション使用
 * - userMcpServerConfig → mcpConfig
 * - mcpServer(旧テンプレート) → mcpServerTemplate
 */
export const findById = async ({
  input,
  ctx,
}: {
  input: { id: string };
  ctx: ProtectedContext;
}) => {
  const instance = await db.mcpServer.findUnique({
    where: {
      id: input.id,
      organizationId: ctx.currentOrganizationId,
      deletedAt: null,
    },
    include: {
      allowedTools: true, // 有効化されているツール
      mcpServers: true, // 関連するテンプレート（通常は1つ）
      apiKeys: true,
      organization: true,
    },
  });

  if (
    !instance ||
    instance.organizationId !== ctx.currentOrganizationId ||
    instance.deletedAt !== null
  ) {
    throw new Error("サーバーインスタンスが見つかりません");
  }

  // Get MCP server URL and iconPath from the template
  let mcpServerUrl: string | null = null;
  let mcpServerIconPath: string | null = null;
  const mcpServerTemplate = instance.mcpServers[0];

  if (mcpServerTemplate) {
    mcpServerUrl = mcpServerTemplate.url ?? null;
    mcpServerIconPath = mcpServerTemplate.iconPath ?? null;
  }

  // mcpConfigを取得（mcpServerTemplate経由）
  let mcpConfig: { id: string; mcpServerTemplate: { id: string } } | null = null;
  if (mcpServerTemplate && instance.serverType === ServerType.OFFICIAL) {
    const config = await db.mcpConfig.findFirst({
      where: {
        mcpServerTemplateId: mcpServerTemplate.id,
        organizationId: ctx.currentOrganizationId,
      },
      include: {
        mcpServerTemplate: true,
      },
    });
    mcpConfig = config;
  }

  // 公式サーバーまたはカスタムサーバーの場合、関連する全てのツールを取得
  let availableTools: Array<{
    id: string;
    name: string;
    description: string | null;
    inputSchema: unknown;
    isEnabled: boolean;
    mcpConfigId: string | null;
    mcpServerTemplate: {
      id: string;
      name: string;
      iconPath: string | null;
    } | null;
  }> = [];

  if (instance.serverType === ServerType.OFFICIAL && mcpConfig) {
    // 公式サーバー：McpConfigに紐づくテンプレートのツールを取得
    if (mcpConfig.mcpServerTemplate) {
      const template = await db.mcpServerTemplate.findUnique({
        where: { id: mcpConfig.mcpServerTemplateId },
        include: {
          mcpTools: true,
        },
      });

      if (template) {
        availableTools = template.mcpTools.map((tool) => ({
          ...tool,
          mcpConfigId: mcpConfig.id,
          isEnabled: instance.allowedTools.some((t) => t.id === tool.id),
          mcpServerTemplate: {
            id: template.id,
            name: template.name,
            iconPath: template.iconPath,
          },
        }));
      }
    }
  } else if (instance.serverType === ServerType.CUSTOM) {
    // カスタムサーバー：組織内の全McpConfigに紐づくツールを取得
    const allMcpConfigs = await db.mcpConfig.findMany({
      where: {
        organizationId: ctx.currentOrganizationId,
      },
      include: {
        mcpServerTemplate: {
          include: {
            mcpTools: true,
          },
        },
      },
    });

    availableTools = allMcpConfigs.flatMap((config) =>
      config.mcpServerTemplate
        ? config.mcpServerTemplate.mcpTools.map((tool) => ({
            ...tool,
            mcpConfigId: config.id,
            isEnabled: instance.allowedTools.some((t) => t.id === tool.id),
            mcpServerTemplate: {
              id: config.mcpServerTemplate.id,
              name: config.mcpServerTemplate.name,
              iconPath: config.mcpServerTemplate.iconPath,
            },
          }))
        : [],
    );
  }

  // 型安全な戻り値
  return {
    id: instance.id,
    name: instance.name,
    description: instance.description,
    iconPath: instance.iconPath ?? mcpServerIconPath,
    serverStatus: instance.serverStatus,
    serverType: instance.serverType,
    mcpServerUrl,
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
    allowedTools: instance.allowedTools, // 有効化されているツール
    mcpConfig: instance.mcpConfig, // サーバー設定
    apiKeys: instance.apiKeys,
    organization: instance.organization,
    availableTools, // 利用可能な全ツール（有効/無効状態付き）
  };
};
