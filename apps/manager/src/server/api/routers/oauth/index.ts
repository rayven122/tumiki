import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getGoogleAccessTokenProcedure } from "./getGoogleAccessToken";
import { startOAuthConnection } from "./startOAuthConnection";
import { getConnectionStatus } from "./getConnectionStatus";
import { getProviderConfigs } from "./getProviderConfigs";

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

  getGoogleAccessToken: getGoogleAccessTokenProcedure,

  getConnectionStatus: protectedProcedure
    .input(GetConnectionStatusInput)
    .query(getConnectionStatus),

  getProviderConfigs: protectedProcedure.query(getProviderConfigs),
});
