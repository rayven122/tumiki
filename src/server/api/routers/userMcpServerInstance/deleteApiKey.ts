import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { DeleteApiKeyInput } from ".";

type DeleteApiKeyInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof DeleteApiKeyInput>;
};

export const deleteApiKey = async ({ ctx, input }: DeleteApiKeyInput) => {
  const { id } = input;

  const apiKey = await ctx.db.$transaction(async (tx) => {
    const apiKey = await tx.apiKey.delete({
      where: { id },
      include: {
        toolGroups: true,
      },
    });

    // APIキーに紐づいたToolGroupを削除
    // このToolGroupに紐づくAPIKeyがなくなった場合（つまり削除したAPIKeyだけが紐づいていた場合）
    await tx.toolGroup.deleteMany({
      where: {
        id: {
          in: apiKey.toolGroups.map((toolGroup) => toolGroup.id),
        },
        apiKeys: {
          // このToolGroupに紐づくAPIKeyが一つもない場合
          none: {},
        },
        // api key 専用の tool group の場合は、isEnabled を false にする
        isEnabled: false,
      },
    });
    return apiKey;
  });

  return apiKey;
};
