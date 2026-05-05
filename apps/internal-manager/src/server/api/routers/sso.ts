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
    try {
      const env = await ensureJacksonOidcClients();
      return {
        issuer: env.OIDC_ISSUER,
        clientId: env.OIDC_CLIENT_ID,
      };
    } catch (error) {
      console.error("[sso.getConfig] OIDC設定取得失敗:", error);
      return { issuer: null, clientId: null };
    }
  }),
});
