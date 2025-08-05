import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { OauthProviderSchema } from "@tumiki/auth/server";
import { startOAuthConnection } from "./startOAuthConnection";
import { getConnectionStatus } from "./getConnectionStatus";
import { getAccessToken } from "./getProviderAccessToken";
import { saveTokenToEnvVars } from "./saveTokenToEnvVars";

export const StartOAuthConnectionInput = z.object({
  provider: OauthProviderSchema,
  scopes: z.array(z.string()),
  returnTo: z.string().optional(),
});

export const GetConnectionStatusInput = z.object({
  provider: OauthProviderSchema,
});

export const SaveTokenToEnvVarsInput = z.object({
  userMcpServerConfigId: z.string(),
  provider: OauthProviderSchema,
  tokenKey: z.string(),
  scopes: z.array(z.string()).optional(),
});

export const oauthRouter = createTRPCRouter({
  startOAuthConnection: protectedProcedure
    .input(StartOAuthConnectionInput)
    .mutation(startOAuthConnection),

  getProviderAccessToken: protectedProcedure
    .input(z.object({ provider: OauthProviderSchema }))
    .query(async ({ input }) => {
      return getAccessToken(input.provider);
    }),

  getConnectionStatus: protectedProcedure
    .input(GetConnectionStatusInput)
    .query(getConnectionStatus),

  saveTokenToEnvVars: protectedProcedure
    .input(SaveTokenToEnvVarsInput)
    .mutation(saveTokenToEnvVars),
});
