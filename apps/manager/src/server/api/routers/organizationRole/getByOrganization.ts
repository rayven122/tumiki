import type { ProtectedContext } from "@/server/api/trpc";
import type { GetRolesByOrganizationInputType } from "./schemas";

export const getByOrganization = async ({
  ctx,
  input,
}: {
  ctx: ProtectedContext;
  input: GetRolesByOrganizationInputType;
}) => {
  const { organizationId } = input;

  const roles = await ctx.db.organizationRole.findMany({
    where: {
      organizationId,
    },
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
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return roles;
};
