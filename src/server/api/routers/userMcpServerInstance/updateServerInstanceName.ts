import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { UpdateServerInstanceNameInput } from ".";

type UpdateServerInstanceNameInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateServerInstanceNameInput>;
};

export const updateServerInstanceName = async ({
  ctx,
  input,
}: UpdateServerInstanceNameInput) => {
  const serverInstance = await ctx.db.userMcpServerInstance.update({
    where: {
      id: input.id,
      userId: ctx.session.user.id,
    },
    data: {
      name: input.name,
    },
  });

  return serverInstance;
};
