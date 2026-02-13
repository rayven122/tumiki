import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

// すべてfeatures/からインポート
import { waitingListRouter } from "@/features/waitingList";
import { organizationRouter } from "@/features/organization";
import { userRouter } from "@/features/user";
import { systemRouter } from "@/features/system";
import {
  userMcpServerRouter,
  mcpServerRouter,
  mcpServerAuthRouter,
  oauthRouter,
  userMcpServerRequestLogRouter,
} from "@/features/mcps";
import { feedbackRouter } from "@/features/feedback/api/router";
import { notificationRouter } from "@/features/notification/api/router";
import { groupRouter } from "@/features/groups/api/router";
import { roleRouter } from "@/features/roles/api/router";
import {
  agentRouter,
  agentExecutionRouter,
  agentScheduleRouter,
} from "@/features/agents";
import { dashboardRouter } from "@/features/dashboard/api/router";
import { toolOutputRouter } from "@/features/chat/api/toolOutput/router";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  // フラット構成（v2なし）
  waitingList: waitingListRouter,
  organization: organizationRouter,
  user: userRouter,
  system: systemRouter,
  userMcpServer: userMcpServerRouter,
  userMcpServerRequestLog: userMcpServerRequestLogRouter,
  mcpServerAuth: mcpServerAuthRouter,
  mcpServer: mcpServerRouter,
  feedback: feedbackRouter,
  oauth: oauthRouter,
  notification: notificationRouter,
  group: groupRouter,
  role: roleRouter,
  agent: agentRouter,
  agentSchedule: agentScheduleRouter,
  agentExecution: agentExecutionRouter,
  dashboard: dashboardRouter,
  toolOutput: toolOutputRouter,
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
