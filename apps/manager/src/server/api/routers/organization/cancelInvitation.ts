import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAdminAccess } from "@/server/utils/organizationPermissions";
import { OrganizationIdSchema } from "@/schema/ids";
import { TRPCError } from "@trpc/server";

export const cancelInvitationInputSchema = z.object({
  organizationId: OrganizationIdSchema,
  invitationId: z.string(),
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
  // 管理者権限を検証
  await validateOrganizationAdminAccess(
    ctx.db,
    input.organizationId,
    ctx.session.user.id,
  );

  // 招待が存在するか確認
  const invitation = await ctx.db.organizationInvitation.findFirst({
    where: {
      id: input.invitationId,
      organizationId: input.organizationId,
    },
  });

  if (!invitation) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "招待が見つかりません。",
    });
  }

  // 招待を削除
  await ctx.db.organizationInvitation.delete({
    where: {
      id: input.invitationId,
    },
  });

  return {
    success: true,
  };
};
