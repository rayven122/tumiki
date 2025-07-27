import { type ProtectedContext } from "@/server/api/trpc";
import { db } from "@tumiki/db/tcp";
import { ServerType } from "@tumiki/db/prisma";

// TODO: ロジックの再確認をする
export const findById = async ({
  input,
  ctx,
}: {
  input: { id: string };
  ctx: ProtectedContext;
}) => {
  const instance = await db.userMcpServerInstance.findUnique({
    where: {
      id: input.id,
      userId: ctx.session.user.id,
      deletedAt: null,
    },
    include: {
      toolGroup: {
        include: {
          toolGroupTools: {
            include: {
              tool: true,
              userMcpServerConfig: {
                include: {
                  mcpServer: true,
                },
              },
            },
          },
        },
      },
      apiKeys: true,
      organization: true,
    },
  });

  if (
    !instance ||
    instance.userId !== ctx.session.user.id ||
    instance.deletedAt !== null
  ) {
    throw new Error("サーバーインスタンスが見つかりません");
  }

  // Get MCP server URL and iconPath from the first tool group tool's config
  let mcpServerUrl: string | null = null;
  let mcpServerIconPath: string | null = null;
  let userMcpServerConfigIds: string[] = [];

  if (instance.toolGroup?.toolGroupTools?.length > 0) {
    const firstToolGroupTool = instance.toolGroup.toolGroupTools[0];
    const mcpServer = firstToolGroupTool?.userMcpServerConfig?.mcpServer;
    mcpServerUrl = mcpServer?.url ?? null;
    mcpServerIconPath = mcpServer?.iconPath ?? null;

    // 関連するuserMcpServerConfigIdを収集
    userMcpServerConfigIds = [
      ...new Set(
        instance.toolGroup.toolGroupTools.map((tt) => tt.userMcpServerConfigId),
      ),
    ];
  }

  // 公式サーバーの場合、関連する全てのツールを取得
  let availableTools: Array<{
    id: string;
    name: string;
    description: string | null;
    inputSchema: unknown;
    isEnabled: boolean;
    userMcpServerConfigId: string;
    mcpServer: {
      id: string;
      name: string;
      iconPath: string | null;
    };
  }> = [];
  if (
    instance.serverType === ServerType.OFFICIAL &&
    userMcpServerConfigIds.length > 0
  ) {
    const userMcpServerConfigs = await db.userMcpServerConfig.findMany({
      where: {
        id: { in: userMcpServerConfigIds },
        userId: ctx.session.user.id,
      },
      include: {
        tools: true,
        mcpServer: true,
      },
    });

    // 全ての利用可能なツールを取得
    availableTools = userMcpServerConfigs.flatMap((config) =>
      config.tools.map((tool) => ({
        ...tool,
        userMcpServerConfigId: config.id,
        isEnabled:
          instance.toolGroup?.toolGroupTools?.some(
            (tt) =>
              tt.toolId === tool.id && tt.userMcpServerConfigId === config.id,
          ) ?? false,
        mcpServer: {
          id: config.mcpServer.id,
          name: config.mcpServer.name,
          iconPath: config.mcpServer.iconPath,
        },
      })),
    );
  } else if (instance.serverType === ServerType.CUSTOM) {
    // カスタムサーバーの場合、全てのユーザーのMCPサーバー設定からツールを取得
    const allUserMcpServerConfigs = await db.userMcpServerConfig.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        tools: true,
        mcpServer: true,
      },
    });

    availableTools = allUserMcpServerConfigs.flatMap((config) =>
      config.tools.map((tool) => ({
        ...tool,
        userMcpServerConfigId: config.id,
        isEnabled:
          instance.toolGroup?.toolGroupTools?.some(
            (tt) =>
              tt.toolId === tool.id && tt.userMcpServerConfigId === config.id,
          ) ?? false,
        mcpServer: {
          id: config.mcpServer.id,
          name: config.mcpServer.name,
          iconPath: config.mcpServer.iconPath,
        },
      })),
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
    toolGroup: instance.toolGroup,
    apiKeys: instance.apiKeys,
    organization: instance.organization,
    availableTools, // 利用可能な全ツール（有効/無効状態付き）
  };
};
