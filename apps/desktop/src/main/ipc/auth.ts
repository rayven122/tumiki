import { ipcMain } from "electron";
import { getDb } from "../db";
import { encryptToken, decryptToken } from "../utils/encryption";
import type { AuthTokenData } from "../../types/auth";
import * as logger from "../utils/logger";

/**
 * 認証関連の IPC ハンドラーを設定
 */
export const setupAuthIpc = (): void => {
  // 認証トークン取得
  ipcMain.handle("auth:getToken", async () => {
    try {
      const db = await getDb();
      const token = await db.authToken.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (!token) {
        return null;
      }

      // トークン期限チェック
      if (new Date() > token.expiresAt) {
        logger.debug("Token expired, returning null");
        return null;
      }

      // 暗号化されたトークンを復号化
      return decryptToken(token.accessToken);
    } catch (error) {
      logger.error(
        "Failed to get auth token",
        error instanceof Error ? error : { error },
      );
      throw new Error(
        `認証トークンの取得に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
    }
  });

  // トークン保存
  ipcMain.handle("auth:saveToken", async (_, tokenData: AuthTokenData) => {
    try {
      const db = await getDb();

      // 新しいトークンを暗号化して保存
      const newToken = await db.authToken.create({
        data: {
          accessToken: encryptToken(tokenData.accessToken),
          refreshToken: encryptToken(tokenData.refreshToken),
          expiresAt: tokenData.expiresAt,
        },
      });

      // 最新のトークンのみ残し、古いトークンを削除
      await db.authToken.deleteMany({
        where: {
          id: { not: newToken.id },
          createdAt: { lt: newToken.createdAt },
        },
      });

      logger.info("Auth token saved successfully");
      return { success: true };
    } catch (error) {
      logger.error(
        "Failed to save auth token",
        error instanceof Error ? error : { error },
      );
      throw new Error(
        `認証トークンの保存に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
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
      throw new Error(
        `認証トークンの削除に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
    }
  });

  // 認証状態確認
  ipcMain.handle("auth:isAuthenticated", async () => {
    try {
      const db = await getDb();
      const token = await db.authToken.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (!token) {
        return false;
      }

      // トークンが有効期限内か確認
      return new Date() <= token.expiresAt;
    } catch (error) {
      logger.error(
        "Failed to check authentication status",
        error instanceof Error ? error : { error },
      );
      // 認証状態確認失敗時は安全側に倒してfalseを返す
      return false;
    }
  });
};
