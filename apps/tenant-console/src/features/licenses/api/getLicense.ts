import { TRPCError } from "@trpc/server";
import { type Context } from "@/server/api/trpc";
import { type GetLicenseInput } from "./schemas";

export const getLicense = async (ctx: Context, input: GetLicenseInput) => {
  const license = await ctx.db.license.findUnique({ where: { id: input.id } });
  if (!license) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `ライセンス ID: ${input.id} が見つかりません`,
    });
  }
  return license;
};
