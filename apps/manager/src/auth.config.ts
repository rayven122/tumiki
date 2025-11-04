import type { NextAuthConfig } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { getKeycloakEnv } from "~/utils/env";
import { getSessionToken } from "~/lib/session-utils";

const keycloakEnv = getKeycloakEnv();

/**
 * Auth.js設定 (Edge Runtime互換)
 * middlewareで使用されるため、Prisma Adapterなどのサーバー専用機能は含まない
 */
export default {
  providers: [
    Keycloak({
      clientId: keycloakEnv.KEYCLOAK_ID,
      clientSecret: keycloakEnv.KEYCLOAK_SECRET,
      issuer: keycloakEnv.KEYCLOAK_ISSUER,
    }),
  ],
  callbacks: {
    authorized: ({ request: { nextUrl, cookies } }) => {
      // Database strategy使用時、middlewareではセッションの内容を検証できない
      // セッショントークンクッキーの存在のみをチェック
      const sessionToken = getSessionToken(cookies);
      const isLoggedIn = !!sessionToken;

      const publicPaths = [
        "/",
        "/jp",
        "/about",
        "/pricing",
        "/legal",
        "/error",
      ];

      // 公開パスはログイン不要
      const isPublicPath = publicPaths.some((path) => {
        if (path === "/legal") {
          return nextUrl.pathname.startsWith(path);
        }
        return nextUrl.pathname === path;
      });

      if (isPublicPath) {
        return true;
      }

      // 認証が必要なパスは、ログインしていない場合はサインインページにリダイレクト
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
