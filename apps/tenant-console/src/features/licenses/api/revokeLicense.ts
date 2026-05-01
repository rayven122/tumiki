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
  // EXPIRED (status=ACTIVE かつ expiresAt 超過) も revoke 可能とする。
  // 失効済み JWT を明示的に revocation list に追加したい用途（不正流通の無効化など）に対応するため。

  return ctx.db.license.update({
    where: { id: input.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedReason: input.reason,
    },
  });
};
