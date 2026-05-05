import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import { isOidcConfigured } from "~/lib/env";
import { ensureJacksonOidcClients } from "~/server/jackson/oidc-clients";

export const ssoRouter = createTRPCRouter({
  getConfig: adminProcedure.query(async () => {
    if (!isOidcConfigured()) {
      return { issuer: null, clientId: null };
    }
    const env = await ensureJacksonOidcClients();
    return {
      issuer: env.OIDC_ISSUER,
      clientId: env.OIDC_CLIENT_ID,
    };
  }),
});
