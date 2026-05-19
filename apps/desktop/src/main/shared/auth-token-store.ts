import type { AuthToken } from "../../types/auth";
import { getDb } from "./db";

/**
 * DBから有効な認証トークンを取得する。
 * 期限切れトークンはその場で削除し、呼び出し元には未認証として扱えるよう null を返す。
 */
export const findValidAuthToken = async (): Promise<AuthToken | null> => {
  const db = await getDb();
  const token = await db.authToken.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!token) return null;

  const now = new Date();
  if (now > token.expiresAt) {
    await db.authToken.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    return null;
  }

  return token;
};
