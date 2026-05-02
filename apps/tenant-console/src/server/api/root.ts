import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { tenantRouter } from "@/features/tenants/api/router";
import { licenseRouter } from "@/features/licenses/api/router";

export const appRouter = createTRPCRouter({
  tenant: tenantRouter,
  license: licenseRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
