import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

/** `scim_<64hex>` 形式のトークンを生成し hash と hint を返す */
const buildToken = () => {
  const raw = `scim_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const hint = `${raw.slice(0, 12)}...`;
  return { raw, hash, hint };
};

/** SYSTEM_ADMIN のみ操作を許可 */
const adminCheck = (role: string) => {
  if (role !== "SYSTEM_ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "SYSTEM_ADMINのみ操作できます",
    });
  }
};

export const scimTokenRouter = createTRPCRouter({
  /** 現在のトークン情報を取得（hint と作成日時のみ。平文は返さない） */
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    adminCheck(ctx.session.user.role);
    return ctx.db.scimToken.findFirst({
      select: { id: true, hint: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  }),

  /** トークンを生成（既存トークンは全て削除して新規作成） */
  generate: protectedProcedure.mutation(async ({ ctx }) => {
    adminCheck(ctx.session.user.role);
    const { raw, hash, hint } = buildToken();

    await ctx.db.$transaction([
      ctx.db.scimToken.deleteMany(),
      ctx.db.scimToken.create({
        data: { hash, hint, createdBy: ctx.session.user.id },
      }),
    ]);

    // 平文はこのレスポンスでのみ返却する
    return { token: raw, hint };
  }),

  /** トークンを失効（削除） */
  revoke: protectedProcedure.mutation(async ({ ctx }) => {
    adminCheck(ctx.session.user.role);
    await ctx.db.scimToken.deleteMany();
  }),
});
