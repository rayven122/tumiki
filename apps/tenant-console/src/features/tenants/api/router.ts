import { createTRPCRouter, procedure } from "@/server/api/trpc";
import { createTenantInputSchema, deleteTenantInputSchema } from "./schemas";
import { createTenant } from "./createTenant";
import { deleteTenant } from "./deleteTenant";

export const tenantRouter = createTRPCRouter({
  list: procedure.query(async ({ ctx }) => {
    return ctx.db.tenant.findMany({ orderBy: { createdAt: "desc" } });
  }),
  create: procedure
    .input(createTenantInputSchema)
    .mutation(({ ctx, input }) => createTenant(ctx, input)),
  delete: procedure
    .input(deleteTenantInputSchema)
    .mutation(({ ctx, input }) => deleteTenant(ctx, input)),
});
