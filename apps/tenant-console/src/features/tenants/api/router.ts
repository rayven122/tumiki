import { TRPCError } from "@trpc/server";
import { createTRPCRouter, procedure } from "@/server/api/trpc";
import {
  createTenantInputSchema,
  deleteTenantInputSchema,
  getTenantInputSchema,
} from "./schemas";
import { createTenant } from "./createTenant";
import { deleteTenant } from "./deleteTenant";

export const tenantRouter = createTRPCRouter({
  list: procedure.query(async ({ ctx }) => {
    return ctx.db.tenant.findMany({
      select: {
        id: true,
        slug: true,
        domain: true,
        status: true,
        oidcType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }),
  get: procedure.input(getTenantInputSchema).query(async ({ ctx, input }) => {
    const tenant = await ctx.db.tenant.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        slug: true,
        domain: true,
        status: true,
        oidcType: true,
        createdAt: true,
      },
    });
    if (!tenant)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "テナントが見つかりません",
      });
    return tenant;
  }),
  create: procedure
    .input(createTenantInputSchema)
    .mutation(({ ctx, input }) => createTenant(ctx, input)),
  delete: procedure
    .input(deleteTenantInputSchema)
    .mutation(({ ctx, input }) => deleteTenant(ctx, input)),
});
