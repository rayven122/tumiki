import { createTRPCRouter } from "@/server/api/trpc";
import { userMcpServerRouter } from "./userMcpServer";

export const v2Router = createTRPCRouter({
  userMcpServer: userMcpServerRouter,
});
