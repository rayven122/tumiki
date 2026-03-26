import { ipcMain } from "electron";
import { getDb } from "../db";
import { getOAuthManager } from "../auth/manager-registry";
import { decryptToken } from "../utils/encryption";
import * as logger from "../utils/logger";

/**
 * DBから有効なトークンを取得（期限切れの場合は削除してnullを返す）
 */
const findValidToken = async () => {
  const db = await getDb();
  const token = await db.authToken.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!token) {
    return null;
  }

  if (new Date() > token.expiresAt) {
    logger.debug("Token expired, deleting from database");
    await db.authToken.delete({ where: { id: token.id } });
    return null;
  }

  return token;
};

/**
 * 認証関連の IPC ハンドラーを設定
 */
export const setupAuthIpc = (): void => {
  // 認証トークン取得
  ipcMain.handle("auth:getToken", async () => {
    try {
      const token = await findValidToken();

      if (!token) {
        return null;
      }

      // 暗号化されたトークンを非同期で復号化
      const decryptedAccessToken = await decryptToken(token.accessToken);

      // 復号化されたトークンの有効性検証（破損トークンはDBから削除）
      if (!decryptedAccessToken || decryptedAccessToken.length === 0) {
        logger.warn(
          "Decrypted token is invalid or empty, deleting corrupted token",
        );
        const db = await getDb();
        await db.authToken.delete({ where: { id: token.id } });
        return null;
      }

      const decryptedIdToken = token.idToken
        ? await decryptToken(token.idToken)
        : null;

      return { accessToken: decryptedAccessToken, idToken: decryptedIdToken };
    } catch (error) {
      logger.error(
        "Failed to get auth token",
        error instanceof Error ? error : { error },
      );
      throw new Error("認証トークンの取得に失敗しました");
    }
  });

  // トークン削除（ログアウト時）
  ipcMain.handle("auth:clearToken", async () => {
    try {
      const db = await getDb();
      await db.authToken.deleteMany({});
      logger.info("Auth token cleared");
      return { success: true };
    } catch (error) {
      logger.error(
        "Failed to clear auth token",
        error instanceof Error ? error : { error },
      );
      throw new Error("認証トークンの削除に失敗しました");
    }
  });

  // ログイン（OAuth認証フロー開始）
  ipcMain.handle("auth:login", async () => {
    try {
      const oauthManager = getOAuthManager();
      if (!oauthManager) {
        throw new Error(
          "OAuth認証が設定されていません（環境変数を確認してください）",
        );
      }
      await oauthManager.startAuthFlow();
      logger.info("Auth login flow started");
    } catch (error) {
      logger.error(
        "Failed to start auth login",
        error instanceof Error ? error : { error },
      );
      throw error instanceof Error
        ? error
        : new Error("ログインの開始に失敗しました");
    }
  });

  // ログアウト
  ipcMain.handle("auth:logout", async () => {
    try {
      const oauthManager = getOAuthManager();
      if (!oauthManager) {
        // OAuthManagerがなくてもローカルのトークンは削除する
        const db = await getDb();
        await db.authToken.deleteMany({});
        logger.info("Auth tokens cleared (OAuth not configured)");
        return;
      }
      await oauthManager.logout();
      logger.info("Auth logout completed");
    } catch (error) {
      logger.error(
        "Failed to logout",
        error instanceof Error ? error : { error },
      );
      throw error instanceof Error
        ? error
        : new Error("ログアウトに失敗しました");
    }
  });

  // 認証状態確認
  ipcMain.handle("auth:isAuthenticated", async () => {
    try {
      const token = await findValidToken();
      return token !== null;
    } catch (error) {
      logger.error(
        "Failed to check authentication status",
        error instanceof Error ? error : { error },
      );
      // DB障害等のインフラエラーはcallerに伝播し、適切なエラー表示を促す
      // silentにfalseを返すと原因特定が困難になるため
      throw new Error("認証状態の確認に失敗しました");
    }
  });
};
