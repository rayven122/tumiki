/**
 * NextAuth.js認証関連のユーティリティ関数
 */

import { signOut } from "next-auth/react";

/**
 * ログアウト処理を実行
 * NextAuth.jsのサインアウトを使用
 */
export const logout = async (): Promise<void> => {
  await signOut({ callbackUrl: "/" });
};

/**
 * ログイン処理を実行
 * サインインページにリダイレクト
 */
export const login = (returnTo?: string): void => {
  const loginUrl = returnTo
    ? `/signin?callbackUrl=${encodeURIComponent(returnTo)}`
    : "/signin";
  window.location.href = loginUrl;
};
