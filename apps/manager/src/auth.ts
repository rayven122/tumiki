import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { getKeycloakEnv } from "~/lib/env";
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
  trustHost: true,
  providers: [
    Keycloak({
      clientId: keycloakEnv.KEYCLOAK_CLIENT_ID,
      clientSecret: keycloakEnv.KEYCLOAK_CLIENT_SECRET,
      issuer: keycloakEnv.KEYCLOAK_ISSUER,
      // KeycloakでPKCEが必須設定のため有効化
      checks: ["pkce", "state"],
      authorization: {
        params: {
          // Keycloakのログイン画面でログイン方法を選択
          // （Google IdPはKeycloakで設定済み）
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
        profileSub: profile.sub, // Keycloak subをカスタムフィールドとして保持
      }),
    }),
  ],
  // カスタムサインインページは使用せず、直接Keycloakにリダイレクト
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
