import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { DeleteApiKeyInput } from ".";

type DeleteApiKeyInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof DeleteApiKeyInput>;
};

export const deleteApiKey = async ({ ctx, input }: DeleteApiKeyInput) => {
  const { id } = input;

  const apiKey = await ctx.db.apiKey.delete({
    where: { id },
  });

  return apiKey;
};
