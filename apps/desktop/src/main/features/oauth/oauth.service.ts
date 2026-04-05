/**
 * MCP OAuth サービス（オーケストレーション）
 *
 * Discovery → DCR（キャッシュ優先）→ PKCE → ブラウザ認証 → コールバック → トークン交換 → MCP登録
 * の全フローを1つのサービスで管理する。
 */

import { shell } from "electron";
import type * as oauth from "oauth4webapi";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "../../auth/pkce";
import { getDb } from "../../shared/db";
import * as logger from "../../shared/utils/logger";
import { AUTH_SESSION_TIMEOUT_MS } from "../../../shared/types";
import { discoverOAuthMetadata, DiscoveryError } from "./oauth.discovery";
import { performDCR, MCP_OAUTH_REDIRECT_URI } from "./oauth.dcr";
import { generateAuthorizationUrl } from "./oauth.auth-url";
import { exchangeCodeForToken } from "./oauth.token";
import { parseOAuthCallback } from "./oauth.protocol";
import * as oauthRepository from "./oauth.repository";
import { createFromCatalog } from "../mcp/mcp.service";
import type {
  McpOAuthSession,
  StartOAuthInput,
  OAuthResult,
} from "./oauth.types";

/** MCP OAuthマネージャー型 */
export type McpOAuthManager = {
  startAuthFlow: (input: StartOAuthInput) => Promise<void>;
  handleCallback: (url: string) => Promise<OAuthResult>;
  cancelAuthFlow: () => void;
  getActiveSession: () => McpOAuthSession | null;
};

/**
 * MCP OAuthマネージャーを作成
 */
export const createMcpOAuthManager = (): McpOAuthManager => {
  let currentSession: McpOAuthSession | null = null;

  /**
   * DCRキャッシュを取得、なければDiscovery + DCRを実行してキャッシュ
   * DCR非対応サーバーの場合、カタログの事前登録client_id/secretをフォールバックとして使用
   */
  const getOrRegisterClient = async (
    serverUrl: string,
    fallbackClientId?: string,
    fallbackClientSecret?: string,
  ): Promise<{
    metadata: oauth.AuthorizationServer;
    client: oauth.Client;
  }> => {
    const db = await getDb();

    // キャッシュ済みOAuthClientを検索
    const cached = await oauthRepository.findByServerUrl(db, serverUrl);
    if (cached) {
      logger.info("DCR cache hit, reusing OAuth client", { serverUrl });
      const metadata = JSON.parse(
        cached.authServerMetadata,
      ) as oauth.AuthorizationServer;
      const client: oauth.Client = {
        client_id: cached.clientId,
        client_secret: cached.clientSecret ?? undefined,
        token_endpoint_auth_method: cached.tokenEndpointAuthMethod,
      };
      return { metadata, client };
    }

    // キャッシュなし → Discovery
    logger.info("DCR cache miss, performing discovery", { serverUrl });
    const metadata = await discoverOAuthMetadata(serverUrl);

    // DCR実行 or フォールバック
    let clientId: string;
    let clientSecret: string | null = null;
    let tokenEndpointAuthMethod = "none";

    if (metadata.registration_endpoint) {
      // DCR対応 → 動的登録
      logger.info("Performing DCR", { serverUrl });
      const { registration } = await performDCR(metadata);
      clientId = registration.client_id;
      clientSecret =
        typeof registration.client_secret === "string"
          ? registration.client_secret
          : null;
      tokenEndpointAuthMethod =
        typeof registration.token_endpoint_auth_method === "string"
          ? registration.token_endpoint_auth_method
          : "none";
    } else if (fallbackClientId) {
      // DCR非対応 → カタログの事前登録client_id/secretを使用
      logger.info("DCR not supported, using fallback client_id", {
        serverUrl,
      });
      clientId = fallbackClientId;
      clientSecret = fallbackClientSecret ?? null;
      tokenEndpointAuthMethod = clientSecret
        ? "client_secret_post"
        : "none";
    } else {
      throw new DiscoveryError(
        "Server does not support Dynamic Client Registration",
        "DCR_NOT_SUPPORTED",
      );
    }

    // 結果をキャッシュ保存
    await oauthRepository.upsertOAuthClient(db, {
      serverUrl,
      issuer: metadata.issuer,
      clientId,
      clientSecret,
      tokenEndpointAuthMethod,
      authServerMetadata: JSON.stringify(metadata),
    });

    const client: oauth.Client = {
      client_id: clientId,
      client_secret: clientSecret ?? undefined,
      token_endpoint_auth_method: tokenEndpointAuthMethod,
    };

    return { metadata, client };
  };

  /**
   * OAuthフローを開始（ブラウザで認可ページを開く）
   */
  const startAuthFlow = async (input: StartOAuthInput): Promise<void> => {
    // 既存セッションがあれば破棄して再開始
    if (currentSession) {
      logger.info(
        "Existing MCP OAuth session found, discarding and restarting",
      );
      currentSession = null;
    }

    try {
      // 1. DCRキャッシュ取得 or Discovery + DCR（フォールバック付き）
      const { metadata, client } = await getOrRegisterClient(
        input.url,
        input.oauthClientId,
        input.oauthClientSecret,
      );

      // 2. PKCE パラメータ生成
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = generateState();

      // 3. スコープ決定（メタデータから取得、なければ空）
      const scopes = metadata.scopes_supported ?? [];

      // 4. 認可URL生成
      const authUrl = generateAuthorizationUrl(metadata, client, {
        redirectUri: MCP_OAUTH_REDIRECT_URI,
        scopes,
        state,
        codeChallenge,
      });

      // 5. セッション保存
      currentSession = {
        state,
        codeVerifier,
        serverUrl: input.url,
        catalogId: input.catalogId,
        catalogName: input.catalogName,
        description: input.description,
        transportType: input.transportType,
        command: input.command,
        args: input.args,
        url: input.url,
        oauthClientId: input.oauthClientId,
        oauthClientSecret: input.oauthClientSecret,
        createdAt: new Date(),
      };

      // 6. ブラウザで認可ページを開く
      await shell.openExternal(authUrl.toString());

      logger.info("MCP OAuth flow started, opened browser for authentication", {
        serverUrl: input.url,
      });
    } catch (error) {
      currentSession = null;
      logger.error("Failed to start MCP OAuth flow", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  /**
   * OAuthコールバックを処理（トークン交換 + MCP登録）
   */
  const handleCallback = async (url: string): Promise<OAuthResult> => {
    try {
      // 1. コールバックURLをパース（OAuthエラーレスポンス検出 + state取得）
      const { state } = parseOAuthCallback(url);

      // 2. セッションの検証
      if (!currentSession) {
        throw new Error("MCP OAuth認証セッションが存在しません");
      }

      if (currentSession.state !== state) {
        throw new Error("stateパラメータが一致しません（CSRF攻撃の可能性）");
      }

      // 3. セッションの有効期限チェック
      const sessionAge = Date.now() - currentSession.createdAt.getTime();
      if (sessionAge > AUTH_SESSION_TIMEOUT_MS) {
        throw new Error("MCP OAuth認証セッションの有効期限が切れています");
      }

      // 4. セッション情報を退避してクリア（二重コールバック防止）
      const session = currentSession;
      currentSession = null;

      // 5. OAuthClientをDBから取得
      const { metadata, client } = await getOrRegisterClient(
        session.serverUrl,
        session.oauthClientId,
        session.oauthClientSecret,
      );

      // 6. トークン交換
      const callbackUrl = new URL(url);
      const tokenData = await exchangeCodeForToken(
        metadata,
        client,
        callbackUrl,
        MCP_OAUTH_REDIRECT_URI,
        session.codeVerifier,
        session.state,
      );

      // 7. MCP サーバー + 接続を作成
      const result = await createFromCatalog({
        catalogId: session.catalogId,
        catalogName: session.catalogName,
        description: session.description,
        transportType: session.transportType,
        command: session.command,
        args: session.args,
        url: session.url,
        credentialKeys: [],
        credentials: {
          access_token: tokenData.access_token,
          ...(tokenData.refresh_token && {
            refresh_token: tokenData.refresh_token,
          }),
          ...(tokenData.expires_at && {
            expires_at: String(tokenData.expires_at),
          }),
          ...(tokenData.scope && { scope: tokenData.scope }),
        },
        authType: "OAUTH",
      });

      logger.info("MCP OAuth flow completed successfully", {
        serverUrl: session.serverUrl,
        serverId: result.serverId,
      });

      return result;
    } catch (error) {
      logger.error("Failed to handle MCP OAuth callback", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  /**
   * OAuthフローをキャンセル
   */
  const cancelAuthFlow = (): void => {
    if (currentSession) {
      currentSession = null;
      logger.info("MCP OAuth flow cancelled");
    }
  };

  /**
   * アクティブなセッションを取得（テスト用）
   */
  const getActiveSession = (): McpOAuthSession | null => {
    return currentSession;
  };

  return { startAuthFlow, handleCallback, cancelAuthFlow, getActiveSession };
};
