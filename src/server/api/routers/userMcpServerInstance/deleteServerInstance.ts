import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { DeleteServerInstanceInput } from ".";

type DeleteServerInstanceInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof DeleteServerInstanceInput>;
};

export const deleteServerInstance = async ({
  ctx,
  input,
}: DeleteServerInstanceInput) => {
  const { id } = input;

  return await ctx.db.$transaction(async (tx) => {
    const serverInstance = await tx.userMcpServerInstance.delete({
      where: {
        id,
        userId: ctx.session.user.id,
      },
    });

    await tx.userToolGroup.delete({
      where: {
        id: serverInstance.toolGroupId,
        userId: ctx.session.user.id,
      },
    });

    return serverInstance;
  });
};
