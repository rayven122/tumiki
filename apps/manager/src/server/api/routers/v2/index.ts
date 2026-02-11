import { createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "./user";
import { userMcpServerRouter } from "./userMcpServer";
import { userMcpServerRequestLogRouter } from "./userMcpServerRequestLog";
import { organizationRouter } from "./organization";
import { mcpServerAuthRouter } from "./mcpServerAuth";
import { mcpServerRouter } from "./mcpServer";
import { feedbackRouter } from "@/features/feedback/api/router";
import { oauthRouter } from "./oauth";
import { notificationRouter } from "./notification";
import { groupRouter } from "./group";
import { roleRouter } from "./role";
import { systemRouter } from "./system";
import { agentRouter } from "./agent";
import { agentScheduleRouter } from "./agentSchedule";
import { agentExecutionRouter } from "./agentExecution";
import { dashboardRouter } from "./dashboard";
import { toolOutputRouter } from "./toolOutput";

export const v2Router = createTRPCRouter({
  user: userRouter,
  userMcpServer: userMcpServerRouter,
  userMcpServerRequestLog: userMcpServerRequestLogRouter,
  organization: organizationRouter,
  mcpServerAuth: mcpServerAuthRouter,
  mcpServer: mcpServerRouter,
  feedback: feedbackRouter,
  oauth: oauthRouter,
  notification: notificationRouter,
  group: groupRouter,
  role: roleRouter,
  system: systemRouter,
  agent: agentRouter,
  agentSchedule: agentScheduleRouter,
  agentExecution: agentExecutionRouter,
  dashboard: dashboardRouter,
  toolOutput: toolOutputRouter,
});
