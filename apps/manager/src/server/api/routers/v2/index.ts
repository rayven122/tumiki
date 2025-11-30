import { createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "./user";
import { userMcpServerRouter } from "./userMcpServer";
import { organizationRouter } from "./organization";

export const v2Router = createTRPCRouter({
  user: userRouter,
  userMcpServer: userMcpServerRouter,
  organization: organizationRouter,
});
