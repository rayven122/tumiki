import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAdminAccess } from "@/server/utils/organizationPermissions";
import { OrganizationIdSchema } from "@/schema/ids";

export const getInvitationsInputSchema = z.object({
  organizationId: OrganizationIdSchema,
});

export const invitationStatusSchema = z.enum(["pending", "expired"]);

export const getInvitationsOutputSchema = z.array(
  z.object({
    id: z.string(),
    email: z.string(),
    invitedBy: z.object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      image: z.string().nullable(),
    }),
    isAdmin: z.boolean(),
    roleIds: z.array(z.string()),
    groupIds: z.array(z.string()),
    expires: z.date(),
    createdAt: z.date(),
    status: invitationStatusSchema,
  }),
);

export type GetInvitationsInput = z.infer<typeof getInvitationsInputSchema>;
export type GetInvitationsOutput = z.infer<typeof getInvitationsOutputSchema>;

export const getInvitations = async ({
  input,
  ctx,
}: {
  input: GetInvitationsInput;
  ctx: ProtectedContext;
}): Promise<GetInvitationsOutput> => {
  // 管理者権限を検証
  await validateOrganizationAdminAccess(
    ctx.db,
    input.organizationId,
    ctx.session.user.id,
  );

  const invitations = await ctx.db.organizationInvitation.findMany({
    where: {
      organizationId: input.organizationId,
    },
    include: {
      invitedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const now = new Date();

  return invitations.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    invitedBy: {
      id: invitation.invitedByUser.id,
      name: invitation.invitedByUser.name,
      email: invitation.invitedByUser.email,
      image: invitation.invitedByUser.image,
    },
    isAdmin: invitation.isAdmin,
    roleIds: invitation.roleIds,
    groupIds: invitation.groupIds,
    expires: invitation.expires,
    createdAt: invitation.createdAt,
    status: invitation.expires < now ? "expired" : "pending",
  }));
};
