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

  // 型安全な戻り値
  return {
    id: instance.id,
    name: instance.name,
    description: instance.description,
    serverStatus: instance.serverStatus,
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
    toolGroup: instance.toolGroup,
    apiKeys: instance.apiKeys,
    organization: instance.organization,
  };
};
