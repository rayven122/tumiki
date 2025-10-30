/**
 * Better Auth サーバーサイドAPI
 */
import type { Session, User } from "./config";

export { auth } from "./config";

/**
 * セッション取得
 */
export const getSession = async (): Promise<Session | null> => {
  const { headers } = await import("next/headers");
  const { auth } = await import("./config");

  return auth.api.getSession({
    headers: await headers(),
  });
};

export type { Session, User };
