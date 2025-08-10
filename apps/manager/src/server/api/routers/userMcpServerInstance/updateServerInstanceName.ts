import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { UpdateServerInstanceNameInput } from ".";
import { ServerType } from "@tumiki/db/prisma";

type UpdateServerInstanceNameInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateServerInstanceNameInput>;
};

export const updateServerInstanceName = async ({
  ctx,
  input,
}: UpdateServerInstanceNameInput) => {
  const organizationId = ctx.currentOrganizationId;
  if (!organizationId) {
    throw new Error("組織が選択されていません");
  }

  const serverInstance = await ctx.db.$transaction(async (tx) => {
    const serverInstance = await tx.userMcpServerInstance.update({
      where: {
        id: input.id,
        organizationId,
      },
      data: {
        name: input.name,
        toolGroup: {
          update: {
            name: input.name,
          },
        },
      },
      include: {
        toolGroup: {
          include: {
            toolGroupTools: {
              take: 1,
            },
          },
        },
      },
    });

    const userMcpServerConfigId =
      serverInstance.toolGroup.toolGroupTools[0]?.userMcpServerConfigId;

    // 公式サーバーの場合は、userMcpServerConfig の name も更新する
    if (
      serverInstance.serverType === ServerType.OFFICIAL &&
      userMcpServerConfigId
    ) {
      await tx.userMcpServerConfig.update({
        where: {
          id: userMcpServerConfigId,
          organizationId,
        },
        data: {
          name: input.name,
        },
      });
    }
    return serverInstance;
  });

  return serverInstance;
};
