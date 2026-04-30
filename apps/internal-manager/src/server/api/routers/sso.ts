import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getOidcEnv, isOidcConfigured } from "~/lib/env";

export const ssoRouter = createTRPCRouter({
  getConfig: protectedProcedure.query(() => {
    if (!isOidcConfigured()) {
      return { issuer: null, clientId: null, desktopClientId: null };
    }
    const env = getOidcEnv();
    return {
      issuer: env.OIDC_ISSUER,
      clientId: env.OIDC_CLIENT_ID,
      desktopClientId: env.OIDC_DESKTOP_CLIENT_ID,
    };
  }),
});
