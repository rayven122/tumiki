import { postRouter } from "@/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { mcpServerRouter } from "./routers/mcpServer";
import { userMcpServerConfigRouter } from "./routers/userMcpServerConfig";
import { userMcpServerInstanceRouter } from "./routers/userMcpServerInstance";
import { userRouter } from "./routers/user";
import { waitingListRouter } from "./routers/waitingList";
import { mcpApiKeyRouter } from "./routers/mcpApiKey";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  mcpServer: mcpServerRouter,
  user: userRouter,
  userMcpServerConfig: userMcpServerConfigRouter,
  userMcpServerInstance: userMcpServerInstanceRouter,
  waitingList: waitingListRouter,
  mcpApiKey: mcpApiKeyRouter,
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
