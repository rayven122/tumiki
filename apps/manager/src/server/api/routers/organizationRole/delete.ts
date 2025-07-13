import type { ProtectedContext } from "@/server/api/trpc";
import type { DeleteRoleInputType } from "./schemas";

export const deleteRole = async ({
  ctx,
  input,
}: {
  ctx: ProtectedContext;
  input: DeleteRoleInputType;
}) => {
  const { id } = input;

  // Check if role has members or groups assigned
  const role = await ctx.db.organizationRole.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          members: true,
          groups: true,
        },
      },
    },
  });

  if (!role) {
    throw new Error("Role not found");
  }

  if (role._count.members > 0 || role._count.groups > 0) {
    throw new Error("Cannot delete role that has members or groups assigned");
  }

  if (role.isDefault) {
    throw new Error("Cannot delete default role");
  }

  await ctx.db.organizationRole.delete({
    where: { id },
  });

  return { success: true };
};
