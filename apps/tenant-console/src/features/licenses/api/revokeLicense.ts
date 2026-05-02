import { TRPCError } from "@trpc/server";
import { Prisma } from "@db-client";
import { type Context } from "@/server/api/trpc";
import { type RevokeLicenseInput } from "./schemas";

export const revokeLicense = async (
  ctx: Context,
  input: RevokeLicenseInput,
) => {
  try {
    // status: "ACTIVE" を where に含めることで findUnique + update の TOCTOU 競合を原子的に防ぐ。
    // EXPIRED (status=ACTIVE かつ expiresAt 超過) も revoke 可能とする（不正流通 JWT の失効リスト追加用途）。
    return await ctx.db.license.update({
      where: { id: input.id, status: "ACTIVE" },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedReason: input.reason,
      },
    });
  } catch (e) {
    if (
      !(e instanceof Prisma.PrismaClientKnownRequestError) ||
      e.code !== "P2025"
    ) {
      throw e;
    }
    // P2025: id が存在しないか、すでに REVOKED で where 条件不一致
    const license = await ctx.db.license.findUnique({
      where: { id: input.id },
    });
    if (!license) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `ライセンス ID: ${input.id} が見つかりません`,
      });
    }
    throw new TRPCError({
      code: "CONFLICT",
      message: "このライセンスは既に失効しています",
    });
  }
};
