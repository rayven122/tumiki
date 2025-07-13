import type { ProtectedContext } from "@/server/api/trpc";
import type { SetDefaultRoleInputType } from "./schemas";

export const setDefault = async ({
  ctx,
  input,
}: {
  ctx: ProtectedContext;
  input: SetDefaultRoleInputType;
}) => {
  const { roleId, organizationId } = input;

  // First, remove default flag from all roles in the organization
  await ctx.db.organizationRole.updateMany({
    where: {
      organizationId,
      isDefault: true,
    },
    data: {
      isDefault: false,
    },
  });

  // Then set the specified role as default
  const updatedRole = await ctx.db.organizationRole.update({
    where: { id: roleId },
    data: {
      isDefault: true,
    },
    include: {
      permissions: true,
      _count: {
        select: {
          members: true,
          groups: true,
        },
      },
    },
  });

  return updatedRole;
};
