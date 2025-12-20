import { createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "./user";
import { userMcpServerRouter } from "./userMcpServer";
import { userMcpServerRequestLogRouter } from "./userMcpServerRequestLog";
import { organizationRouter } from "./organization";
import { mcpServerAuthRouter } from "./mcpServerAuth";
import { mcpServerRouter } from "./mcpServer";
import { feedbackRouter } from "./feedback";
import { oauthRouter } from "./oauth";
import { notificationRouter } from "./notification";

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
});
