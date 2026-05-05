import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  ensureJacksonOidcClients,
  isExplicitOidcConfigured,
  isJacksonAutoOidcConfigured,
} from "~/server/jackson/oidc-clients";

export const ssoRouter = createTRPCRouter({
  getConfig: adminProcedure.query(async () => {
    if (!isExplicitOidcConfigured() && !isJacksonAutoOidcConfigured()) {
      return { issuer: null, clientId: null };
    }
    const env = await ensureJacksonOidcClients();
    return {
      issuer: env.OIDC_ISSUER,
      clientId: env.OIDC_CLIENT_ID,
    };
  }),
});
