import { ipcMain } from "electron";
import { z } from "zod";
import * as authService from "../services/auth.service";
import * as logger from "../utils/logger";

/**
 * 認証トークンデータのバリデーションスキーマ
 */
const authTokenSchema = z.object({
  accessToken: z.string().min(1, "アクセストークンは空にできません"),
  refreshToken: z.string().min(1, "リフレッシュトークンは空にできません"),
  expiresAt: z.preprocess(
    (val) => {
      // 文字列の場合はDateオブジェクトに変換
      if (typeof val === "string") {
        return new Date(val);
      }
      return val;
    },
    z
      .date()
      .refine((date) => !isNaN(date.getTime()), {
        message: "無効な日付形式です",
      })
      .refine(
        (date) => {
          // 相対時間ベースのバリデーション: 有効期限が現在時刻から最低1分以上未来である必要がある
          const now = new Date();
          const minValidDuration = 60 * 1000; // 1分（ミリ秒）
          return date.getTime() - now.getTime() > minValidDuration;
        },
        {
          message: "有効期限は現在時刻から最低1分以上未来である必要があります",
        },
      ),
  ),
});

/**
 * 認証関連の IPC ハンドラーを設定
 */
export const setupAuthIpc = (): void => {
  // 認証トークン取得
  ipcMain.handle("auth:getToken", async () => {
    try {
      return await authService.getToken();
    } catch (error) {
      logger.error(
        "Failed to get auth token",
        error instanceof Error ? error : { error },
      );
      throw new Error("認証トークンの取得に失敗しました");
    }
  });

  // トークン保存
  // IPC通信はプロセス間境界のため、引数はunknownとして受け取りZodでバリデーションする
  ipcMain.handle("auth:saveToken", async (_, tokenData: unknown) => {
    try {
      // 入力データのバリデーション
      const validatedData = authTokenSchema.parse(tokenData);
      return await authService.saveToken(validatedData);
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
      throw new Error("認証トークンの保存に失敗しました");
    }
  });

  // トークン削除（ログアウト時）
  ipcMain.handle("auth:clearToken", async () => {
    try {
      return await authService.clearToken();
    } catch (error) {
      logger.error(
        "Failed to clear auth token",
        error instanceof Error ? error : { error },
      );
      throw new Error("認証トークンの削除に失敗しました");
    }
  });

  // 認証状態確認
  ipcMain.handle("auth:isAuthenticated", async () => {
    try {
      return await authService.isAuthenticated();
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
