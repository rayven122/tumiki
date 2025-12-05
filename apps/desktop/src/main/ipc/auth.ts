import { ipcMain } from "electron";
import { z } from "zod";
import { getDb } from "../db";
import { encryptToken, decryptToken } from "../utils/encryption";
import type { AuthTokenData } from "../../types/auth";
import * as logger from "../utils/logger";

/**
 * 認証トークンデータのバリデーションスキーマ
 */
const authTokenSchema = z.object({
  accessToken: z.string().min(1, "アクセストークンは空にできません"),
  refreshToken: z.string().min(1, "リフレッシュトークンは空にできません"),
  expiresAt: z
    .date()
    .refine((date) => date > new Date(), {
      message: "有効期限は未来の日付である必要があります",
    })
    .or(
      z.string().transform((str) => {
        const date = new Date(str);
        if (isNaN(date.getTime())) {
          throw new Error("無効な日付形式です");
        }
        if (date <= new Date()) {
          throw new Error("有効期限は未来の日付である必要があります");
        }
        return date;
      }),
    ),
});

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
      const decryptedToken = decryptToken(token.accessToken);

      // 復号化されたトークンの有効性検証
      if (!decryptedToken || decryptedToken.length === 0) {
        logger.warn("Decrypted token is invalid or empty");
        return null;
      }

      return decryptedToken;
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
      // 入力データのバリデーション
      const validatedData = authTokenSchema.parse(tokenData);

      const db = await getDb();

      // 新しいトークンを暗号化して保存
      const newToken = await db.authToken.create({
        data: {
          accessToken: encryptToken(validatedData.accessToken),
          refreshToken: encryptToken(validatedData.refreshToken),
          expiresAt: validatedData.expiresAt,
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
      // Zodバリデーションエラーの処理
      if (error instanceof z.ZodError) {
        const validationErrors = error.issues
          .map((issue) => issue.message)
          .join(", ");
        logger.error("Token validation failed", { errors: validationErrors });
        throw new Error(`トークンデータが無効です: ${validationErrors}`);
      }

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
