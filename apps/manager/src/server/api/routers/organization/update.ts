import { type z } from "zod";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { updateOrganizationInput } from "@/server/utils/organizationSchemas";

export const updateOrganizationInputSchema = updateOrganizationInput;

export type UpdateOrganizationInput = z.infer<
  typeof updateOrganizationInputSchema
>;

export const updateOrganization = async ({
  input,
  ctx,
}: {
  input: UpdateOrganizationInput;
  ctx: ProtectedContext;
}) => {
  // 管理者権限を検証
  validateOrganizationAccess(ctx.currentOrg, {
    requireAdmin: true,
  });

  try {
    const organization = await ctx.db.organization.update({
      where: {
        id: ctx.currentOrg.id,
        isDeleted: false,
      },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        creator: true,
      },
    });

    return organization;
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "組織の更新に失敗しました",
    });
  }
};
