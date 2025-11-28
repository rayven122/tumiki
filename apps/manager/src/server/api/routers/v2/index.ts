import { createTRPCRouter } from "@/server/api/trpc";
import { userMcpServerRouter } from "./userMcpServer";
import { oauthRouter } from "./oauth";

export const v2Router = createTRPCRouter({
  userMcpServer: userMcpServerRouter,
  oauth: oauthRouter,
});
