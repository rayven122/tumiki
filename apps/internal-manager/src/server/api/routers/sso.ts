import {
  ensureJacksonOidcClients,
  isJacksonAutoOidcConfigured,
} from "~/server/jackson/oidc-clients";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";

export const ssoRouter = createTRPCRouter({
  getConfig: adminProcedure.query(async () => {
    if (!isJacksonAutoOidcConfigured()) {
      return {
        source: "environment" as const,
        environmentConfigured: false,
        issuer: null,
        clientId: null,
        hasClientSecret: false,
        desktopClientId: null,
      };
    }
    try {
      const env = await ensureJacksonOidcClients();
      return {
        source: "jackson" as const,
        environmentConfigured: true,
        issuer: env.OIDC_ISSUER,
        clientId: env.OIDC_CLIENT_ID,
        hasClientSecret: Boolean(env.OIDC_CLIENT_SECRET),
        desktopClientId: env.OIDC_DESKTOP_CLIENT_ID,
      };
    } catch (error) {
      console.error("[sso.getConfig] OIDC設定取得失敗:", error);
      return {
        source: "environment" as const,
        environmentConfigured: false,
        issuer: null,
        clientId: null,
        hasClientSecret: false,
        desktopClientId: null,
      };
    }
  }),
});
