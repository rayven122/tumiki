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
      clientId: keycloakEnv.KEYCLOAK_CLIENT_ID,
      clientSecret: keycloakEnv.KEYCLOAK_CLIENT_SECRET,
      issuer: keycloakEnv.KEYCLOAK_ISSUER,
      authorization: {
        params: {
          // Keycloakのログイン画面をスキップして直接Googleにリダイレクト
          kc_idp_hint: "google",
          // Googleのアカウント選択画面を常に表示
          // prompt: アカウント選択を強制
          // max_age: 認証の有効期限を0にして常に再認証を要求
          prompt: "select_account",
          max_age: "0",
        },
      },
    }),
  ],
  callbacks: {
    authorized: ({ request: { nextUrl, cookies } }) => {
      // ⚠️ セキュリティ上の制限:
      // Database strategy使用時、Edge Runtimeで動作するmiddlewareでは
      // Prismaにアクセスできないため、セッションの内容を検証できません。
      // ここではセッショントークンクッキーの存在のみをチェックしています。
      //
      // 実際のセッション検証は、Node.js Runtimeで実行される各ルート
      // （API routes、Server Components等）で auth() を呼び出す際に行われます。
      //
      // この実装では、悪意のあるユーザーが偽のクッキーを設定できる可能性がありますが、
      // 実際のデータアクセスは各ルートでの auth() による検証で保護されます。
      const sessionToken = getSessionToken(cookies);
      const isLoggedIn = !!sessionToken;

      const publicPaths = [
        "/",
        "/jp",
        "/about",
        "/pricing",
        "/legal",
        "/error",
        "/register",
        "/auth/callback",
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
