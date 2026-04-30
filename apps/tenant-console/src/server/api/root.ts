import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { tenantRouter } from "@/features/tenants/api/router";

export const appRouter = createTRPCRouter({
  tenant: tenantRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
