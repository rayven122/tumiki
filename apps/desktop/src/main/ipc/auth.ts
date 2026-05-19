import { ipcMain } from "electron";
import type { AuthProfileResult, AuthToken } from "../../types/auth";
import { getOAuthManager, setOAuthManager } from "../auth/manager-registry";
import { decryptToken } from "../utils/encryption";
import { findValidAuthToken } from "../shared/auth-token-store";
import { getDb } from "../shared/db";
import * as logger from "../shared/utils/logger";
import { AUTH_REQUIRED_MESSAGE } from "../../shared/constants";
import { resetProfileState } from "../shared/profile-store";

// アカウント表示用のクレーム取得のみ。署名検証はOAuth認証フロー側で行う。
const decodeJwtPayloadForDisplay = (
  token: string,
): Record<string, unknown> | null => {
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch (error) {
    logger.warn(
      "Failed to decode JWT payload for auth profile display",
      error instanceof Error ? { message: error.message } : { error },
    );
    return null;
  }
};

const getClaimString = (
  claims: Record<string, unknown> | null,
  key: string,
): string | null => {
  const value = claims?.[key];
  return typeof value === "string" && value.trim() ? value : null;
};

const buildAuthProfile = async (
  token: AuthToken,
): Promise<AuthProfileResult> => {
  const idToken = token.idToken ? await decryptToken(token.idToken) : null;
  const claims = idToken ? decodeJwtPayloadForDisplay(idToken) : null;
  return {
    name: getClaimString(claims, "name"),
    email: getClaimString(claims, "email"),
    preferredUsername: getClaimString(claims, "preferred_username"),
    subject: getClaimString(claims, "sub"),
  };
};

const logoutAuth = async (): Promise<void> => {
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
};

/**
 * 認証関連の IPC ハンドラーを設定
 */
export const setupAuthIpc = (): void => {
  // 認証トークン取得
  ipcMain.handle("auth:getToken", async () => {
    try {
      const token = await findValidAuthToken();

      if (!token) {
        throw new Error(AUTH_REQUIRED_MESSAGE);
      }

      // 暗号化されたトークンを非同期で復号化（失敗時はエラーをスロー）
      const decryptedAccessToken = await decryptToken(token.accessToken);

      // 復号化結果が空文字の場合はトークンデータ破損の可能性
      if (!decryptedAccessToken) {
        logger.warn(
          "Decrypted access token is empty, token data may be corrupted",
        );
        throw new Error(AUTH_REQUIRED_MESSAGE);
      }

      // idTokenはmainプロセス内（ログアウト時）でのみ使用し、レンダラーには返さない
      return { accessToken: decryptedAccessToken };
    } catch (error) {
      logger.error(
        "Failed to get auth token",
        error instanceof Error ? error : { error },
      );
      throw new Error("認証トークンの取得に失敗しました", { cause: error });
    }
  });

  ipcMain.handle("auth:getProfile", async () => {
    try {
      const token = await findValidAuthToken();

      if (!token) {
        throw new Error(AUTH_REQUIRED_MESSAGE);
      }

      return await buildAuthProfile(token);
    } catch (error) {
      logger.error(
        "Failed to get auth profile",
        error instanceof Error ? error : { error },
      );
      throw new Error("認証プロファイルの取得に失敗しました", {
        cause: error,
      });
    }
  });

  // 認証フローキャンセル
  ipcMain.handle("auth:cancelLogin", () => {
    const oauthManager = getOAuthManager();
    oauthManager?.cancelAuthFlow();
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
      await logoutAuth();
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

  ipcMain.handle("auth:logoutAndResetProfile", async () => {
    try {
      await resetProfileState();
      await logoutAuth();
      setOAuthManager(null);
      logger.info("Auth logout and profile reset completed");
    } catch (error) {
      logger.error(
        "Failed to logout and reset profile",
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
      const token = await findValidAuthToken();
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
