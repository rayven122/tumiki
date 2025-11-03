import type { NextAuthConfig } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

/**
 * Auth.js設定 (Edge Runtime互換)
 * middlewareで使用されるため、Prisma Adapterなどのサーバー専用機能は含まない
 */
export default {
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_ID,
      clientSecret: process.env.KEYCLOAK_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
    }),
  ],
  trustHost: true,
  pages: {
    // signIn: "/" removed to allow Auth.js to handle OAuth flow automatically
    error: "/error",
  },
  callbacks: {
    authorized: ({ request: { nextUrl, cookies } }) => {
      // Database strategy使用時、middlewareではセッションの内容を検証できない
      // セッショントークンクッキーの存在のみをチェック
      const sessionToken =
        cookies.get("authjs.session-token") ??
        cookies.get("__Secure-authjs.session-token");
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
