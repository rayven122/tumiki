import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { startOAuthConnection } from "./startOAuthConnection";
import { getConnectionStatus } from "./getConnectionStatus";
import { getGoogleAccessToken } from "./getGoogleAccessToken";

export const StartOAuthConnectionInput = z.object({
  provider: z.enum(["google", "github", "slack", "notion", "linkedin"]),
  scopes: z.array(z.string()),
  returnTo: z.string().optional(),
});

export const GetConnectionStatusInput = z.object({
  provider: z.enum(["google", "github", "slack", "notion", "linkedin"]),
});

export const oauthRouter = createTRPCRouter({
  startOAuthConnection: protectedProcedure
    .input(StartOAuthConnectionInput)
    .mutation(startOAuthConnection),

  getGoogleAccessToken: protectedProcedure
    .input(z.object({}).optional())
    .query(getGoogleAccessToken),

  getConnectionStatus: protectedProcedure
    .input(GetConnectionStatusInput)
    .query(getConnectionStatus),
});
