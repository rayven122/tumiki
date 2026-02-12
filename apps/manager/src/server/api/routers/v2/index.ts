import { createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "./user";
import {
  userMcpServerRouter,
  mcpServerRouter,
  mcpServerAuthRouter,
  oauthRouter,
} from "@/features/mcps";
import { userMcpServerRequestLogRouter } from "./userMcpServerRequestLog";
import { organizationRouter } from "./organization";
import { feedbackRouter } from "@/features/feedback/api/router";
import { notificationRouter } from "@/features/notification/api/router";
import { groupRouter } from "@/features/groups/api/router";
import { roleRouter } from "@/features/roles/api/router";
import { systemRouter } from "./system";
import {
  agentRouter,
  agentExecutionRouter,
  agentScheduleRouter,
} from "@/features/agents";
import { dashboardRouter } from "@/features/dashboard/api/router";
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
