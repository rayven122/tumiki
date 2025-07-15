import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAdminAccess } from "@/server/utils/organizationPermissions";
import { inviteMemberInput } from "@/server/utils/organizationSchemas";

export const inviteMemberInputSchema = inviteMemberInput;

export const inviteMemberOutputSchema = z.object({
  id: z.string(),
  email: z.string(),
  expires: z.date(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberInput>;
export type InviteMemberOutput = z.infer<typeof inviteMemberOutputSchema>;

export const inviteMember = async ({
  input,
  ctx,
}: {
  input: InviteMemberInput;
  ctx: ProtectedContext;
}): Promise<InviteMemberOutput> => {
  // 管理者権限を検証
  await validateOrganizationAdminAccess(
    ctx.db,
    input.organizationId,
    ctx.session.user.id,
  );

  const expires = new Date();
  expires.setDate(expires.getDate() + 7);

  const invitation = await ctx.db.organizationInvitation.create({
    data: {
      organizationId: input.organizationId,
      email: input.email,
      invitedBy: ctx.session.user.id,
      isAdmin: input.isAdmin,
      roleIds: input.roleIds,
      groupIds: input.groupIds,
      expires,
    },
  });

  return {
    id: invitation.id,
    email: invitation.email,
    expires: invitation.expires,
  };
};
