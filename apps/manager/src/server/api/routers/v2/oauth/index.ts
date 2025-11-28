import { createTRPCRouter } from "@/server/api/trpc";
import { authorize } from "./authorize";

export const oauthRouter = createTRPCRouter({
  authorize,
});
