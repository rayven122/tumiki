import type { ProtectedContext } from "@/server/api/trpc";
import type { CreateRoleInputType } from "./schemas";

export const create = async ({
  ctx,
  input,
}: {
  ctx: ProtectedContext;
  input: CreateRoleInputType;
}) => {
  const { organizationId, name, description, isDefault } = input;

  // If setting as default, remove default flag from other roles first
  if (isDefault) {
    await ctx.db.organizationRole.updateMany({
      where: {
        organizationId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  const role = await ctx.db.organizationRole.create({
    data: {
      organizationId,
      name,
      description,
      isDefault,
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
