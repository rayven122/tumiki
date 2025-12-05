import { createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "./user";
import { userMcpServerRouter } from "./userMcpServer";
import { organizationRouter } from "./organization";
import { mcpServerAuthRouter } from "./mcpServerAuth";
import { mcpServerRouter } from "./mcpServer";
import { feedbackRouter } from "./feedback";

export const v2Router = createTRPCRouter({
  user: userRouter,
  userMcpServer: userMcpServerRouter,
  organization: organizationRouter,
  mcpServerAuth: mcpServerAuthRouter,
  mcpServer: mcpServerRouter,
  feedback: feedbackRouter,
});
