import { ipcMain } from "electron";
import { getDb } from "../db";
import { encryptToken, decryptToken } from "../utils/encryption";
import type { AuthTokenData } from "../../types/auth";

/**
 * 認証関連の IPC ハンドラーを設定
 */
export const setupAuthIpc = (): void => {
  // 認証トークン取得
  ipcMain.handle("auth:getToken", async () => {
    const db = await getDb();
    const token = await db.authToken.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!token) {
      return null;
    }

    // トークン期限チェック
    if (new Date() > token.expiresAt) {
      if (process.env.NODE_ENV === "development") {
        console.log("Token expired, returning null");
      }
      return null;
    }

    // 暗号化されたトークンを復号化
    return decryptToken(token.accessToken);
  });

  // トークン保存
  ipcMain.handle("auth:saveToken", async (_, tokenData: AuthTokenData) => {
    const db = await getDb();

    // 既存のトークンを削除（最新のもののみ保持）
    await db.authToken.deleteMany({});

    // トークンを暗号化して保存
    await db.authToken.create({
      data: {
        accessToken: encryptToken(tokenData.accessToken),
        refreshToken: encryptToken(tokenData.refreshToken),
        expiresAt: tokenData.expiresAt,
      },
    });

    if (process.env.NODE_ENV === "development") {
      console.log("Auth token saved successfully");
    }
    return { success: true };
  });

  // トークン削除（ログアウト時）
  ipcMain.handle("auth:clearToken", async () => {
    const db = await getDb();
    await db.authToken.deleteMany({});
    if (process.env.NODE_ENV === "development") {
      console.log("Auth token cleared");
    }
    return { success: true };
  });

  // 認証状態確認
  ipcMain.handle("auth:isAuthenticated", async () => {
    const db = await getDb();
    const token = await db.authToken.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!token) {
      return false;
    }

    // トークンが有効期限内か確認
    return new Date() <= token.expiresAt;
  });
};
