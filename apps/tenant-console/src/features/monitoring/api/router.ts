import { createTRPCRouter, procedure } from "@/server/api/trpc";
import { getPodStatuses } from "./getPodStatuses";

export const monitoringRouter = createTRPCRouter({
  pods: procedure.query(async ({ ctx }) => {
    const tenants = await ctx.db.tenant.findMany({
      select: { id: true, slug: true, status: true },
      orderBy: { createdAt: "desc" },
    });

    const results = await Promise.allSettled(
      tenants.map(async (tenant) => {
        if (tenant.status !== "ACTIVE") {
          return {
            tenantId: tenant.id,
            slug: tenant.slug,
            dbStatus: tenant.status,
            pods: [],
            error: null,
          };
        }
        const pods = await getPodStatuses(`tenant-${tenant.slug}`);
        return {
          tenantId: tenant.id,
          slug: tenant.slug,
          dbStatus: tenant.status,
          pods,
          error: null,
        };
      }),
    );

    return results.map((result, i) => {
      const tenant = tenants[i]!;
      if (result.status === "fulfilled") return result.value;
      return {
        tenantId: tenant.id,
        slug: tenant.slug,
        dbStatus: tenant.status,
        pods: [],
        error: "Pod情報の取得に失敗しました",
      };
    });
  }),
});
