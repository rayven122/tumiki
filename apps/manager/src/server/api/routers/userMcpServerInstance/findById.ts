import { type ProtectedContext } from "@/server/api/trpc";
import { db } from "@tumiki/db/tcp";

export const findById = async ({
  input,
  ctx,
}: {
  input: { id: string };
  ctx: ProtectedContext;
}) => {
  const instance = await db.userMcpServerInstance.findFirst({
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

  if (!instance) {
    throw new Error("サーバーインスタンスが見つかりません");
  }

  // Get MCP server URL and iconPath from the first tool group tool's config
  let mcpServerUrl: string | null = null;
  let mcpServerIconPath: string | null = null;
  if (instance.toolGroup?.toolGroupTools?.length > 0) {
    const firstToolGroupTool = instance.toolGroup.toolGroupTools[0];
    const mcpServer = firstToolGroupTool?.userMcpServerConfig?.mcpServer;
    mcpServerUrl = mcpServer?.url ?? null;
    mcpServerIconPath = mcpServer?.iconPath ?? null;
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
  };
};
