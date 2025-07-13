import type { ProtectedContext } from "@/server/api/trpc";
import type { UpdatePermissionsInputType } from "./schemas";

export const updatePermissions = async ({
  ctx,
  input,
}: {
  ctx: ProtectedContext;
  input: UpdatePermissionsInputType;
}) => {
  const { roleId, permissions } = input;

  // First, delete all existing permissions for this role
  await ctx.db.rolePermission.deleteMany({
    where: {
      roleId,
    },
  });

  // Then create new permissions
  if (permissions.length > 0) {
    await ctx.db.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId,
        resourceType: permission.resourceType,
        action: permission.action,
      })),
    });
  }

  // Return the updated role with permissions
  const updatedRole = await ctx.db.organizationRole.findUnique({
    where: { id: roleId },
    include: {
      permissions: {
        orderBy: [{ resourceType: "asc" }, { action: "asc" }],
      },
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
