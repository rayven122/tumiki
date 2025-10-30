/**
 * Better Auth クライアントサイドAPI
 */
"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "https://local.tumiki.cloud:3000",
});

/**
 * セッション取得hook
 */
export const useSession = () => {
  return authClient.useSession();
};

/**
 * サインイン
 */
export const signIn = {
  keycloak: () =>
    authClient.signIn.social({
      provider: "keycloak",
      callbackURL: "/dashboard",
    }),
};

/**
 * サインアウト
 */
export const signOut = async () => {
  await authClient.signOut();
};

export type { Session, User } from "./server";
