import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { tenantRouter } from "@/features/tenants/api/router";
import { licenseRouter } from "@/features/licenses/api/router";
import { monitoringRouter } from "@/features/monitoring/api/router";

export const appRouter = createTRPCRouter({
  tenant: tenantRouter,
  license: licenseRouter,
  monitoring: monitoringRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
