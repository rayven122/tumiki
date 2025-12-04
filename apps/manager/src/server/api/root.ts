import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { waitingListRouter } from "./routers/waitingList";
import { organizationRouter } from "./routers/organization/index";
import { organizationRoleRouter } from "./routers/organizationRole";
import { v2Router } from "./routers/v2";
import { feedbackRouter } from "./routers/feedback";
// TODO: Rewrite OAuth token management for Auth.js
// import { oauthRouter } from "./routers/oauth/index";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  waitingList: waitingListRouter,
  organization: organizationRouter,
  organizationRole: organizationRoleRouter,
  v2: v2Router,
  feedback: feedbackRouter,
  // TODO: Rewrite OAuth token management for Auth.js
  // oauth: oauthRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
