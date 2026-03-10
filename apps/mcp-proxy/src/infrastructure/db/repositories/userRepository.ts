/**
 * ユーザーリポジトリ
 *
 * ユーザー関連のDBクエリを提供。
 * Keycloak ID / メールアドレスから Tumiki User ID を解決する。
 */

import { db } from "@tumiki/db/server";
import { logError, logWarn } from "../../../shared/logger/index.js";

/**
 * Keycloak ID (providerAccountId) から Tumiki User ID を取得
 *
 * Account テーブルで provider="keycloak" かつ providerAccountId=keycloakId の
 * レコードを検索し、対応する userId を返す。
 *
 * @param keycloakId - Keycloak の subject claim (JWT sub)
 * @returns User ID（見つからない場合はnull）
 */
export const getUserIdFromKeycloakId = async (
  keycloakId: string,
): Promise<string | null> => {
  try {
    const account = await db.account.findFirst({
      where: {
        provider: "keycloak",
        providerAccountId: keycloakId,
      },
      select: { userId: true },
    });

    const userId = account?.userId ?? null;

    if (!userId) {
      logWarn("User not found for Keycloak ID", { keycloakId });
    }

    return userId;
  } catch (error) {
    logError("Failed to get user from Keycloak ID", error as Error, {
      keycloakId,
    });
    throw error;
  }
};

/**
 * emailからTumiki User IDを解決
 *
 * JWT の sub クレームが存在しない場合のフォールバック用。
 * User テーブルで email を検索し、対応する userId を返す。
 *
 * @param email - ユーザーのメールアドレス
 * @returns User ID（見つからない場合はnull）
 */
export const getUserIdByEmail = async (
  email: string,
): Promise<string | null> => {
  try {
    const user = await db.user.findFirst({
      where: { email },
      select: { id: true },
    });

    const userId = user?.id ?? null;

    if (!userId) {
      logWarn("User not found for email", { email });
    }

    return userId;
  } catch (error) {
    logError("Failed to get user from email", error as Error, {
      email,
    });
    throw error;
  }
};
