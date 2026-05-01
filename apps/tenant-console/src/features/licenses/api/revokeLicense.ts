import { TRPCError } from "@trpc/server";
import { type Context } from "@/server/api/trpc";
import { type RevokeLicenseInput } from "./schemas";

export const revokeLicense = async (
  ctx: Context,
  input: RevokeLicenseInput,
) => {
  const license = await ctx.db.license.findUnique({ where: { id: input.id } });
  if (!license) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `ライセンス ID: ${input.id} が見つかりません`,
    });
  }
  if (license.status === "REVOKED") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "このライセンスは既に失効しています",
    });
  }

  return ctx.db.license.update({
    where: { id: input.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedReason: input.reason,
    },
  });
};
