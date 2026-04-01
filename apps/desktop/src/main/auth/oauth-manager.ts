import { shell } from "electron";
import {
  createKeycloakClient,
  type KeycloakClient,
  type KeycloakConfig,
  type TokenResponse,
} from "./keycloak";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "./pkce";
import { getDb } from "../shared/db";
import { encryptToken, decryptToken } from "../utils/encryption";
import * as logger from "../shared/utils/logger";
import type { Prisma } from "../../../prisma/generated/client";
import { AUTH_SESSION_TIMEOUT_MS } from "../../shared/types";

/**
 * OAuth認証セッションの状態
 */
type OAuthSession = {
  state: string;
  codeVerifier: string;
  createdAt: Date;
};

/**
 * OAuthManager型
 */
export type OAuthManager = {
  startAuthFlow: () => Promise<void>;
  handleAuthCallback: (url: string) => Promise<void>;
  cancelAuthFlow: () => void;
  logout: () => Promise<void>;
  stopAutoRefresh: () => void;
  waitForPendingRefresh: () => Promise<void>;
  initialize: () => Promise<void>;
};

/**
 * OAuthManager作成時のオプション
 */
export type OAuthManagerOptions = {
  /** 認証セッション失効時のコールバック（リフレッシュ失敗等） */
  onAuthExpired?: () => void;
};

/** 自動リフレッシュのリトライ設定 */
const AUTO_REFRESH_RETRY = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 10_000,
} as const;

/**
 * OAuth認証マネージャーを作成
 * Keycloak認証フローを管理
 */
export const createOAuthManager = (
  config: KeycloakConfig,
  options: OAuthManagerOptions = {},
): OAuthManager => {
  const keycloakClient: KeycloakClient = createKeycloakClient(config);
  let currentSession: OAuthSession | null = null;
  let refreshTimerId: NodeJS.Timeout | null = null;
  let refreshPromise: Promise<void> | null = null;

  /**
   * トークンを暗号化してデータベースに保存
   */
  const saveToken = async (
    tokenResponse: Omit<TokenResponse, "token_type">,
  ): Promise<void> => {
    const db = await getDb();

    // 有効期限を計算（現在時刻 + expires_in秒）
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    // トークンを暗号化（トランザクション外で実行し、タイムアウトを回避）
    const encryptedAccessToken = await encryptToken(tokenResponse.access_token);
    const encryptedRefreshToken = await encryptToken(
      tokenResponse.refresh_token,
    );
    const encryptedIdToken = tokenResponse.id_token
      ? await encryptToken(tokenResponse.id_token)
      : null;

    // 暗号化済みトークンを保存（アトミックにcreate+delete）
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const newToken = await tx.authToken.create({
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          idToken: encryptedIdToken,
          expiresAt,
        },
      });

      // 古いトークンを削除
      await tx.authToken.deleteMany({
        where: {
          id: { not: newToken.id },
        },
      });
    });

    logger.info("Token saved successfully");
  };

  /**
   * トークンの自動リフレッシュを開始
   * 有効期限の5分前にリフレッシュを実行（失敗時はリトライ）
   */
  const startAutoRefresh = (expiresIn: number): void => {
    // 既存のタイマーをクリア
    if (refreshTimerId) {
      clearTimeout(refreshTimerId);
    }

    // 有効期限の5分前にリフレッシュ（最低でも60秒後）
    const refreshDelay = Math.max((expiresIn - 5 * 60) * 1000, 60 * 1000);

    refreshTimerId = setTimeout(() => {
      const { MAX_ATTEMPTS, INITIAL_DELAY_MS } = AUTO_REFRESH_RETRY;

      // Promiseベースのガードでリフレッシュ中の重複実行を防止
      // refreshPromiseが非nullの間はinitialize()等からの並行実行をスキップする
      const doAutoRefresh = async (): Promise<void> => {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            await doRefresh();
            return; // 成功
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            logger.error(
              `Auto refresh attempt ${attempt}/${MAX_ATTEMPTS} failed`,
              { error: message },
            );

            if (attempt < MAX_ATTEMPTS) {
              const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }

        // 全リトライ失敗 — セッション失効を通知
        logger.error("Auto refresh exhausted all retries, session expired");
        try {
          const db = await getDb();
          await db.authToken.deleteMany({});
        } catch (cleanupError) {
          logger.error("Failed to clear expired tokens", {
            error:
              cleanupError instanceof Error
                ? cleanupError.message
                : String(cleanupError),
          });
        }
        options.onAuthExpired?.();
      };

      refreshPromise = doAutoRefresh().finally(() => {
        refreshPromise = null;
      });
    }, refreshDelay);

    logger.info(`Auto refresh scheduled in ${refreshDelay / 1000} seconds`);
  };

  /**
   * トークンリフレッシュのコア処理
   * refreshPromiseガードの管理は呼び出し元が担当
   */
  const doRefresh = async (): Promise<void> => {
    const db = await getDb();

    // 最新のトークンを取得
    const token = await db.authToken.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!token) {
      throw new Error("リフレッシュ対象のトークンが存在しません");
    }

    // リフレッシュトークンを復号化（失敗時はエラーをスロー）
    const refreshToken = await decryptToken(token.refreshToken);

    // トークンをリフレッシュ
    const tokenResponse = await keycloakClient.refreshToken(refreshToken);

    // 新しいトークンを保存
    await saveToken(tokenResponse);

    // 次回のリフレッシュをスケジュール
    startAutoRefresh(tokenResponse.expires_in);

    logger.info("Token refreshed successfully");
  };

  /**
   * トークンをリフレッシュ（内部用）
   * Promiseベースのガードで重複実行を防止
   */
  const refreshTokenInternal = async (): Promise<void> => {
    if (refreshPromise) {
      logger.info("Token refresh already in progress, skipping");
      return;
    }

    refreshPromise = doRefresh()
      .catch((error) => {
        if (error instanceof Error) {
          logger.error("Failed to refresh token", error);
        } else {
          logger.error("Failed to refresh token", { error });
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });

    await refreshPromise;
  };

  /**
   * 認証フローを開始
   * 外部ブラウザでKeycloakログインページを開く
   */
  const startAuthFlow = async (): Promise<void> => {
    // 既存セッションがあれば破棄して再開始（ブラウザタブを閉じた場合等に対応）
    if (currentSession) {
      logger.info("Existing auth session found, discarding and restarting");
      currentSession = null;
    }

    try {
      // PKCE パラメータを生成
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = generateState();

      // セッション情報を保存
      currentSession = {
        state,
        codeVerifier,
        createdAt: new Date(),
      };

      // 認証URLを生成
      const authUrl = keycloakClient.generateAuthUrl({
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
      currentSession = null;
      throw error;
    }
  };

  /**
   * 認証コールバックを処理
   * カスタムURLスキーム（tumiki-desktop://）から呼ばれる
   */
  const handleAuthCallback = async (url: string): Promise<void> => {
    try {
      const parsedUrl = new URL(url);
      const code = parsedUrl.searchParams.get("code");
      const state = parsedUrl.searchParams.get("state");

      // OAuthエラーレスポンスの検証（RFC 6749）
      const oauthError = parsedUrl.searchParams.get("error");
      if (oauthError) {
        const description =
          parsedUrl.searchParams.get("error_description") ?? oauthError;
        // ユーザー操作起因のエラーはwarnレベル、システムエラーはerrorレベル
        const userCausedErrors = [
          "access_denied",
          "login_required",
          "interaction_required",
          "consent_required",
        ];
        if (userCausedErrors.includes(oauthError)) {
          logger.warn(`OAuthユーザー操作エラー: ${oauthError}`, {
            description,
          });
        } else {
          logger.error(`OAuthシステムエラー: ${oauthError}`, { description });
        }
        throw new Error(`認証エラー: ${description}`);
      }

      // パラメータの検証
      if (!code) {
        throw new Error("認可コードが見つかりません");
      }

      if (!state) {
        throw new Error("stateパラメータが見つかりません");
      }

      // セッションの検証
      if (!currentSession) {
        throw new Error("認証セッションが存在しません");
      }

      if (currentSession.state !== state) {
        throw new Error("stateパラメータが一致しません（CSRF攻撃の可能性）");
      }

      // セッションの有効期限チェック
      const sessionAge = Date.now() - currentSession.createdAt.getTime();
      if (sessionAge > AUTH_SESSION_TIMEOUT_MS) {
        throw new Error("認証セッションの有効期限が切れています");
      }

      // 検証通過後、即座にセッションをクリアして二重コールバック・リプレイ攻撃を防止
      // 認可コードは一度しか使えないため、トークン交換が失敗しても再利用できない
      // 失敗時はユーザーに再ログインを促す仕様（セキュリティ上の意図的な設計）
      const { codeVerifier } = currentSession;
      currentSession = null;

      // 認可コードをトークンと交換
      const tokenResponse = await keycloakClient.exchangeCodeForToken({
        code,
        codeVerifier,
      });

      // トークンを暗号化して保存
      await saveToken(tokenResponse);

      // 自動リフレッシュを開始
      startAutoRefresh(tokenResponse.expires_in);

      logger.info("Auth callback handled successfully");
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Failed to handle auth callback", error);
      } else {
        logger.error("Failed to handle auth callback", { error });
      }
      throw error;
    }
  };

  /**
   * ログアウト処理
   * Keycloakとローカルの両方からログアウト
   */
  const logout = async (): Promise<void> => {
    const db = await getDb();
    try {
      // 最新のトークンを取得
      const token = await db.authToken.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (token) {
        try {
          // トークンを復号化してKeycloakからログアウト
          const refreshToken = await decryptToken(token.refreshToken);
          const idToken = token.idToken
            ? await decryptToken(token.idToken)
            : undefined;
          await keycloakClient.logout({ refreshToken, idToken });
        } catch (error) {
          // 復号化・Keycloak通信の失敗はローカルクリーンアップを優先して警告のみ
          // Keycloak側のセッションは有効期限で自然失効する
          logger.warn(
            "Keycloak server-side logout failed, proceeding with local cleanup",
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }

    } finally {
      // 例外発生時もローカルトークン・タイマー・セッションを確実にクリア
      try {
        await db.authToken.deleteMany({});
      } catch (cleanupError) {
        logger.error("Failed to clear local tokens during logout", {
          error:
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError),
        });
      }
      if (refreshTimerId) {
        clearTimeout(refreshTimerId);
        refreshTimerId = null;
      }
      currentSession = null;
      logger.info("Logout completed successfully");
    }
  };

  /**
   * 自動リフレッシュを停止
   */
  const stopAutoRefresh = (): void => {
    if (refreshTimerId) {
      clearTimeout(refreshTimerId);
      refreshTimerId = null;
      logger.info("Auto refresh stopped");
    }
  };

  /** 進行中のリフレッシュがあれば完了を待機する */
  const waitForPendingRefresh = async (): Promise<void> => {
    if (refreshPromise) {
      logger.info("Waiting for pending refresh to complete");
      await refreshPromise;
    }
  };

  /**
   * 認証状態を初期化
   * アプリ起動時に既存のトークンがあれば自動リフレッシュを開始
   */
  const initialize = async (): Promise<void> => {
    // リフレッシュ中の重複実行を防止（スリープ復帰の連続発火対策）
    if (refreshPromise) {
      logger.info("Token refresh already in progress, skipping initialize");
      return;
    }

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
          await refreshTokenInternal();
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
          try {
            await db.authToken.deleteMany({});
          } catch (cleanupError) {
            logger.error(
              "Failed to delete expired tokens during initialization",
              {
                error:
                  cleanupError instanceof Error
                    ? cleanupError.message
                    : String(cleanupError),
              },
            );
          }
        }
        return;
      }

      // 有効なトークンがある場合、自動リフレッシュを開始
      const expiresIn = Math.floor(
        (token.expiresAt.getTime() - Date.now()) / 1000,
      );
      startAutoRefresh(expiresIn);

      logger.info("OAuth manager initialized with existing token");
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Failed to initialize OAuth manager", error);
      } else {
        logger.error("Failed to initialize OAuth manager", { error });
      }
      throw error;
    }
  };

  /**
   * 認証フローをキャンセル
   * UIからキャンセルされた場合にセッションをクリア
   */
  const cancelAuthFlow = (): void => {
    if (currentSession) {
      currentSession = null;
      logger.info("Auth flow cancelled");
    }
  };

  return {
    startAuthFlow,
    handleAuthCallback,
    cancelAuthFlow,
    logout,
    stopAutoRefresh,
    waitForPendingRefresh,
    initialize,
  };
};
