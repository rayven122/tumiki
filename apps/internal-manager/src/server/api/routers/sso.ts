import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const ssoRouter = createTRPCRouter({
  getConfig: protectedProcedure.query(() => ({
    issuer: process.env.OIDC_ISSUER ?? null,
    clientId: process.env.OIDC_CLIENT_ID ?? null,
    desktopClientId: process.env.OIDC_DESKTOP_CLIENT_ID ?? null,
  })),
});
