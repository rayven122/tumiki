import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { OrganizationInvitationIdSchema } from "@/schema/ids";

export const cancelInvitationInputSchema = z.object({
  invitationId: OrganizationInvitationIdSchema,
});

export const cancelInvitationOutputSchema = z.object({
  success: z.boolean(),
});

export type CancelInvitationInput = z.infer<typeof cancelInvitationInputSchema>;
export type CancelInvitationOutput = z.infer<
  typeof cancelInvitationOutputSchema
>;

export const cancelInvitation = async ({
  input,
  ctx,
}: {
  input: CancelInvitationInput;
  ctx: ProtectedContext;
}): Promise<CancelInvitationOutput> => {
  try {
    // 管理者権限を検証
    if (!ctx.isCurrentOrganizationAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "この操作を行う権限がありません",
      });
    }

    // トランザクションで処理
    await ctx.db.$transaction(async (tx) => {
      // 招待が存在するか確認
      const invitation = await tx.organizationInvitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId: ctx.currentOrganizationId,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "招待が見つかりません。",
        });
      }

      // 招待を削除
      await tx.organizationInvitation.delete({
        where: {
          id: input.invitationId,
        },
      });
    });

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    console.error("招待キャンセルエラー:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "招待のキャンセル中にエラーが発生しました。",
    });
  }
};
