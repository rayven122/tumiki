import {
  createCallerFactory,
  createTRPCRouter,
  procedure,
} from "@/server/api/trpc";
import { tenantRouter } from "@/features/tenants/api/router";

export const appRouter = createTRPCRouter({
  health: procedure.query(() => ({ status: "ok" })),
  tenant: tenantRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
