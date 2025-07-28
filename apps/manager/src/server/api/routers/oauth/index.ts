import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { OauthProviderSchema } from "@tumiki/auth/server";
import { startOAuthConnection } from "./startOAuthConnection";
import { getConnectionStatus } from "./getConnectionStatus";
import { getAccessToken } from "./getProviderAccessToken";

export const StartOAuthConnectionInput = z.object({
  provider: OauthProviderSchema,
  scopes: z.array(z.string()),
  returnTo: z.string().optional(),
});

export const GetConnectionStatusInput = z.object({
  provider: OauthProviderSchema,
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
});
