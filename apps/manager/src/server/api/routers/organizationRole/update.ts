import type { ProtectedContext } from "@/server/api/trpc";
import type { UpdateRoleInputType } from "./schemas";

export const update = async ({
  ctx,
  input,
}: {
  ctx: ProtectedContext;
  input: UpdateRoleInputType;
}) => {
  const { id, name, description, isDefault } = input;

  // Get the role to find its organizationId
  const existingRole = await ctx.db.organizationRole.findUnique({
    where: { id },
    select: { organizationId: true },
  });

  if (!existingRole) {
    throw new Error("Role not found");
  }

  // If setting as default, remove default flag from other roles first
  if (isDefault) {
    await ctx.db.organizationRole.updateMany({
      where: {
        organizationId: existingRole.organizationId,
        isDefault: true,
        id: { not: id },
      },
      data: {
        isDefault: false,
      },
    });
  }

  const role = await ctx.db.organizationRole.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(isDefault !== undefined && { isDefault }),
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

  return role;
};
