import { shell } from "electron";
import { KeycloakClient, type KeycloakConfig } from "./keycloak";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "./pkce";
import { getDb } from "../db";
import { encryptToken, decryptToken } from "../utils/encryption";
import * as logger from "../utils/logger";

/**
 * OAuth認証セッションの状態
 */
type OAuthSession = {
  state: string;
  codeVerifier: string;
  createdAt: Date;
};

/**
 * OAuth認証マネージャー
 * Keycloak認証フローを管理
 */
export class OAuthManager {
  private keycloakClient: KeycloakClient;
  private currentSession: OAuthSession | null = null;
  private refreshTimerId: NodeJS.Timeout | null = null;

  constructor(config: KeycloakConfig) {
    this.keycloakClient = new KeycloakClient(config);
  }

  /**
   * 認証フローを開始
   * 外部ブラウザでKeycloakログインページを開く
   */
  async startAuthFlow(): Promise<void> {
    try {
      // 既存のセッションをクリア
      this.currentSession = null;

      // PKCE パラメータを生成
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = generateState();

      // セッション情報を保存
      this.currentSession = {
        state,
        codeVerifier,
        createdAt: new Date(),
      };

      // 認証URLを生成
      const authUrl = this.keycloakClient.generateAuthUrl({
        codeChallenge,
        state,
      });

      // 外部ブラウザで認証URLを開く
      await shell.openExternal(authUrl);

      logger.info("Auth flow started, opened browser for authentication");
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Failed to start auth flow", error);
      } else {
        logger.error("Failed to start auth flow", { error });
      }
      this.currentSession = null;
      throw new Error("認証フローの開始に失敗しました");
    }
  }

  /**
   * 認証コールバックを処理
   * カスタムURLスキーム（tumiki-desktop://）から呼ばれる
   */
  async handleAuthCallback(url: string): Promise<void> {
    try {
      const parsedUrl = new URL(url);
      const code = parsedUrl.searchParams.get("code");
      const state = parsedUrl.searchParams.get("state");

      // パラメータの検証
      if (!code) {
        throw new Error("認可コードが見つかりません");
      }

      if (!state) {
        throw new Error("stateパラメータが見つかりません");
      }

      // セッションの検証
      if (!this.currentSession) {
        throw new Error("認証セッションが存在しません");
      }

      if (this.currentSession.state !== state) {
        throw new Error("stateパラメータが一致しません（CSRF攻撃の可能性）");
      }

      // セッションの有効期限チェック（5分）
      const sessionAge = Date.now() - this.currentSession.createdAt.getTime();
      if (sessionAge > 5 * 60 * 1000) {
        throw new Error("認証セッションの有効期限が切れています");
      }

      // 認可コードをトークンと交換
      const tokenResponse = await this.keycloakClient.exchangeCodeForToken({
        code,
        codeVerifier: this.currentSession.codeVerifier,
      });

      // トークンを暗号化して保存
      await this.saveToken(tokenResponse);

      // 自動リフレッシュを開始
      this.startAutoRefresh(tokenResponse.expires_in);

      // セッションをクリア
      this.currentSession = null;

      logger.info("Auth callback handled successfully");
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Failed to handle auth callback", error);
      } else {
        logger.error("Failed to handle auth callback", { error });
      }
      this.currentSession = null;
      throw error;
    }
  }

  /**
   * トークンを暗号化してデータベースに保存
   */
  private async saveToken(tokenResponse: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }): Promise<void> {
    const db = await getDb();

    // 有効期限を計算（現在時刻 + expires_in秒）
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    // トークンを暗号化して保存
    const newToken = await db.authToken.create({
      data: {
        accessToken: encryptToken(tokenResponse.access_token),
        refreshToken: encryptToken(tokenResponse.refresh_token),
        expiresAt,
      },
    });

    // 古いトークンを削除
    await db.authToken.deleteMany({
      where: {
        id: { not: newToken.id },
        createdAt: { lt: newToken.createdAt },
      },
    });

    logger.info("Token saved successfully");
  }

  /**
   * トークンの自動リフレッシュを開始
   * 有効期限の5分前にリフレッシュを実行
   */
  private startAutoRefresh(expiresIn: number): void {
    // 既存のタイマーをクリア
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
    }

    // 有効期限の5分前にリフレッシュ（最低でも60秒後）
    const refreshDelay = Math.max((expiresIn - 5 * 60) * 1000, 60 * 1000);

    this.refreshTimerId = setTimeout(async () => {
      try {
        await this.refreshTokenInternal();
      } catch (error) {
        if (error instanceof Error) {
          logger.error("Auto refresh failed", error);
        } else {
          logger.error("Auto refresh failed", { error });
        }
      }
    }, refreshDelay);

    logger.info(`Auto refresh scheduled in ${refreshDelay / 1000} seconds`);
  }

  /**
   * トークンをリフレッシュ（内部用）
   */
  private async refreshTokenInternal(): Promise<void> {
    try {
      const db = await getDb();

      // 最新のトークンを取得
      const token = await db.authToken.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (!token) {
        logger.warn("No token found for refresh");
        return;
      }

      // リフレッシュトークンを復号化
      const refreshToken = decryptToken(token.refreshToken);

      // トークンをリフレッシュ
      const tokenResponse =
        await this.keycloakClient.refreshToken(refreshToken);

      // 新しいトークンを保存
      await this.saveToken(tokenResponse);

      // 次回のリフレッシュをスケジュール
      this.startAutoRefresh(tokenResponse.expires_in);

      logger.info("Token refreshed successfully");
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Failed to refresh token", error);
      } else {
        logger.error("Failed to refresh token", { error });
      }
      throw error;
    }
  }

  /**
   * トークンを手動でリフレッシュ（外部から呼ばれる）
   */
  async refreshToken(): Promise<void> {
    await this.refreshTokenInternal();
  }

  /**
   * ログアウト処理
   * Keycloakとローカルの両方からログアウト
   */
  async logout(): Promise<void> {
    try {
      const db = await getDb();

      // 最新のトークンを取得
      const token = await db.authToken.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (token) {
        // リフレッシュトークンを復号化
        const refreshToken = decryptToken(token.refreshToken);

        // Keycloakからログアウト
        await this.keycloakClient.logout({ refreshToken });
      }

      // ローカルのトークンを削除
      await db.authToken.deleteMany({});

      // 自動リフレッシュタイマーをクリア
      if (this.refreshTimerId) {
        clearTimeout(this.refreshTimerId);
        this.refreshTimerId = null;
      }

      // セッションをクリア
      this.currentSession = null;

      logger.info("Logout completed successfully");
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Failed to logout", error);
      } else {
        logger.error("Failed to logout", { error });
      }
      throw new Error("ログアウトに失敗しました");
    }
  }

  /**
   * 自動リフレッシュを停止
   */
  stopAutoRefresh(): void {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
      logger.info("Auto refresh stopped");
    }
  }

  /**
   * 認証状態を初期化
   * アプリ起動時に既存のトークンがあれば自動リフレッシュを開始
   */
  async initialize(): Promise<void> {
    try {
      const db = await getDb();
      const token = await db.authToken.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (!token) {
        logger.info("No existing token found");
        return;
      }

      // トークンが有効期限内かチェック
      if (new Date() > token.expiresAt) {
        logger.info("Existing token expired, attempting refresh");
        try {
          await this.refreshTokenInternal();
        } catch (error) {
          if (error instanceof Error) {
            logger.warn("Failed to refresh expired token", {
              error: error.message,
              stack: error.stack,
            });
          } else {
            logger.warn("Failed to refresh expired token", { error });
          }
          // リフレッシュ失敗時はトークンを削除
          await db.authToken.deleteMany({});
        }
        return;
      }

      // 有効なトークンがある場合、自動リフレッシュを開始
      const expiresIn = Math.floor(
        (token.expiresAt.getTime() - Date.now()) / 1000,
      );
      this.startAutoRefresh(expiresIn);

      logger.info("OAuth manager initialized with existing token");
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Failed to initialize OAuth manager", error);
      } else {
        logger.error("Failed to initialize OAuth manager", { error });
      }
    }
  }
}
