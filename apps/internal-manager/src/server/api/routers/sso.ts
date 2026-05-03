import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import { getOidcEnv, isOidcConfigured } from "~/lib/env";

export const ssoRouter = createTRPCRouter({
  getConfig: adminProcedure.query(() => {
    if (!isOidcConfigured()) {
      return { issuer: null, clientId: null };
    }
    const env = getOidcEnv();
    return {
      issuer: env.OIDC_ISSUER,
      clientId: env.OIDC_CLIENT_ID,
    };
  }),
});
