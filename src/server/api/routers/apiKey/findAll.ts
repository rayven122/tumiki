import type { ProtectedContext } from "../../trpc";

type FindAllInput = {
  ctx: ProtectedContext;
};

export const findAll = async ({ ctx }: FindAllInput) => {
  const apiKeys = await ctx.db.apiKey.findMany({
    where: {
      userId: ctx.session.user.id,
    },
    orderBy: {
      // 作成した順にソート
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      toolGroups: {
        select: {
          id: true,
          name: true,
          description: true,
          toolGroupTools: {
            select: {
              userMcpServer: {
                select: {
                  id: true,
                  name: true,
                },
              },
              tool: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return apiKeys;
};
