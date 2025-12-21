import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { getKeycloakEnv } from "~/utils/env";
import { createCustomAdapter } from "~/lib/auth/adapter";
import { jwtCallback, sessionCallback } from "~/lib/auth/callbacks";
import type { KeycloakProfile } from "~/lib/auth/types";

// 型定義をインポート（モジュール拡張を有効化）
import "~/lib/auth/types";

/**
 * セッション型定義のエクスポート
 */
export type { Session as SessionReturnType } from "next-auth";

/**
 * SessionData型 - Keycloak互換の型エイリアス
 * @deprecated Session型を直接使用してください
 */
export type { Session as SessionData } from "next-auth";

const keycloakEnv = getKeycloakEnv();

/**
 * Auth.js メイン設定
 * JWT戦略でKeycloak access tokenを保持
 */
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
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
          prompt: "select_account",
          max_age: "0",
        },
      },
      profile: (profile: KeycloakProfile) => ({
        id: profile.sub,
        email: profile.email ?? null,
        name: profile.name ?? null,
        image: profile.picture ?? null,
        role: "USER" as const,
        tumiki: profile.tumiki ?? null,
      }),
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  adapter: createCustomAdapter(),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  callbacks: {
    jwt: jwtCallback,
    session: sessionCallback,
  },
});
