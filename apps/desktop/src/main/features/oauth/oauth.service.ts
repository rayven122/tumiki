/**
 * MCP OAuth サービス（オーケストレーション）
 *
 * Loopback HTTP起動 → Discovery → DCR（キャッシュ優先）→ PKCE → ブラウザ認証 →
 * ループバック受信 → トークン交換 → MCP登録 の全フローを1つのサービスで管理する。
 *
 * RFC 8252 (OAuth 2.0 for Native Apps) に準拠したループバックHTTP方式を採用。
 * カスタムプロトコル（tumiki://）は廃止し、HubSpot/Asana/MoneyForward等の
 * カスタムスキーム非対応サービスにも対応する。
 */

import { shell } from "electron";
import type * as oauth from "oauth4webapi";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "../../auth/pkce";
import { getDb } from "../../shared/db";
import { resolveByProfile } from "../../shared/profile-dispatch";
import * as logger from "../../shared/utils/logger";
import { AUTH_SESSION_TIMEOUT_MS } from "../../../shared/types";
import {
  discoverOAuthMetadata,
  DiscoveryError,
  DISCOVERY_ERROR_CODE,
} from "./oauth.discovery";
import { performDCR } from "./oauth.dcr";
import { generateAuthorizationUrl } from "./oauth.auth-url";
import { exchangeCodeForToken } from "./oauth.token";
import { parseOAuthCallback } from "./oauth.protocol";
import { startLoopbackServer, type LoopbackServer } from "./oauth.loopback";
import * as oauthRepository from "./oauth.repository";
import {
  createFromCatalog,
  createFromManagerCatalog,
  createCustomServer,
} from "../mcp-server-list/mcp.service";
import type {
  McpOAuthSession,
  StartOAuthInput,
  OAuthResult,
  McpOAuthTokenData,
} from "./oauth.types";

/** 手動入力済みOAuthクライアント情報 */
export type ManualOAuthClient = {
  clientId: string;
  clientSecret: string | null;
};

/** MCP OAuthマネージャー型 */
export type McpOAuthManager = {
  startAuthFlow: (input: StartOAuthInput) => Promise<OAuthResult>;
  cancelAuthFlow: () => void;
  getActiveSession: () => McpOAuthSession | null;
  findManualOAuthClient: (
    serverUrl: string,
  ) => Promise<ManualOAuthClient | null>;
};

type OAuthClientBundle = {
  metadata: oauth.AuthorizationServer;
  client: oauth.Client;
};

export const isCacheableAuthorizationServerMetadata = (
  parsed: unknown,
): parsed is oauth.AuthorizationServer => {
  if (typeof parsed !== "object" || parsed === null) return false;
  const o = parsed as Record<string, unknown>;
  return (
    typeof o.issuer === "string" &&
    typeof o.authorization_endpoint === "string" &&
    typeof o.token_endpoint === "string"
  );
};

export const oauthClientFromParts = (
  clientId: string,
  clientSecret: string | null,
  tokenEndpointAuthMethod: string,
): oauth.Client => ({
  client_id: clientId,
  client_secret: clientSecret ?? undefined,
  token_endpoint_auth_method: tokenEndpointAuthMethod,
});

const loadCachedOAuthClientBundle = async (
  db: Awaited<ReturnType<typeof getDb>>,
  serverUrl: string,
): Promise<OAuthClientBundle | null> => {
  const cached = await oauthRepository.findByServerUrl(db, serverUrl);
  if (!cached) return null;

  if (!cached.isDcr) {
    logger.info("Skipping non-DCR cached client, requires manual input", {
      serverUrl,
    });
    return null;
  }

  logger.info("DCR cache hit, reusing OAuth client", { serverUrl });
  const parsed: unknown = JSON.parse(cached.authServerMetadata);

  if (!isCacheableAuthorizationServerMetadata(parsed)) {
    logger.warn("Cached OAuth metadata is corrupted, re-discovering", {
      serverUrl,
    });
    await oauthRepository.deleteByServerUrl(db, serverUrl);
    return null;
  }

  return {
    metadata: parsed,
    client: oauthClientFromParts(
      cached.clientId,
      cached.clientSecret,
      cached.tokenEndpointAuthMethod,
    ),
  };
};

type ClientCredentials = {
  clientId: string;
  clientSecret: string | null;
  tokenEndpointAuthMethod: string;
  isDcr: boolean;
};

const resolveClientCredentials = async (
  metadata: oauth.AuthorizationServer,
  serverUrl: string,
  redirectUri: string,
  fallbackClientId?: string,
  fallbackClientSecret?: string,
): Promise<ClientCredentials> => {
  if (metadata.registration_endpoint) {
    logger.info("Performing DCR", { serverUrl, redirectUri });
    const { registration } = await performDCR(metadata, redirectUri);
    return {
      clientId: registration.client_id,
      clientSecret:
        typeof registration.client_secret === "string"
          ? registration.client_secret
          : null,
      tokenEndpointAuthMethod:
        typeof registration.token_endpoint_auth_method === "string"
          ? registration.token_endpoint_auth_method
          : "none",
      isDcr: true,
    };
  }

  if (fallbackClientId) {
    logger.info("DCR not supported, using fallback client_id", {
      serverUrl,
    });
    const clientSecret = fallbackClientSecret ?? null;
    return {
      clientId: fallbackClientId,
      clientSecret,
      tokenEndpointAuthMethod: clientSecret ? "client_secret_post" : "none",
      isDcr: false,
    };
  }

  throw new DiscoveryError(
    "Server does not support Dynamic Client Registration",
    DISCOVERY_ERROR_CODE.DCR_NOT_SUPPORTED,
  );
};

const discoverPersistAndBundle = async (
  db: Awaited<ReturnType<typeof getDb>>,
  serverUrl: string,
  redirectUri: string,
  fallbackClientId?: string,
  fallbackClientSecret?: string,
): Promise<OAuthClientBundle> => {
  logger.info("DCR cache miss, performing discovery", { serverUrl });
  const metadata = await discoverOAuthMetadata(serverUrl);

  const { clientId, clientSecret, tokenEndpointAuthMethod, isDcr } =
    await resolveClientCredentials(
      metadata,
      serverUrl,
      redirectUri,
      fallbackClientId,
      fallbackClientSecret,
    );

  await oauthRepository.upsertOAuthClient(db, {
    serverUrl,
    issuer: metadata.issuer,
    clientId,
    clientSecret,
    tokenEndpointAuthMethod,
    authServerMetadata: JSON.stringify(metadata),
    isDcr,
  });

  return {
    metadata,
    client: oauthClientFromParts(
      clientId,
      clientSecret,
      tokenEndpointAuthMethod,
    ),
  };
};

/** セッションを検証し、有効なセッションを返す（無効な場合はthrow） */
const validateCallbackSession = (
  session: McpOAuthSession | null,
  state: string,
): McpOAuthSession => {
  if (!session) {
    throw new Error("MCP OAuth認証セッションが存在しません");
  }
  if (session.state !== state) {
    throw new Error("stateパラメータが一致しません（CSRF攻撃の可能性）");
  }
  const sessionAge = Date.now() - session.createdAt.getTime();
  if (sessionAge > AUTH_SESSION_TIMEOUT_MS) {
    throw new Error("MCP OAuth認証セッションの有効期限が切れています");
  }
  return session;
};

export const credentialsPayloadFromTokenData = (
  tokenData: McpOAuthTokenData,
): Record<string, string> => ({
  access_token: tokenData.access_token,
  ...(tokenData.refresh_token && {
    refresh_token: tokenData.refresh_token,
  }),
  ...(tokenData.expires_at && {
    expires_at: String(tokenData.expires_at),
  }),
  ...(tokenData.scope && { scope: tokenData.scope }),
});

const finalizeMcpRegistration = async (
  session: McpOAuthSession,
  tokenData: McpOAuthTokenData,
): Promise<OAuthResult> => {
  const credentials = credentialsPayloadFromTokenData(tokenData);

  // カタログ情報があればプロファイルモードに応じて分岐し、
  // それ以外はカスタムサーバーとして登録する。
  // 個人モード: ローカル McpCatalog FK 付きで登録（追加後画面でロゴ等を解決するため）
  // 組織モード: Manager API カタログ情報からテンプレート登録（ローカル FK は持たない）
  if (session.managerCatalog) {
    return resolveByProfile({
      personal: () => {
        const localCatalogId = Number(session.managerCatalog?.catalogId ?? "");
        if (Number.isNaN(localCatalogId)) {
          throw new Error("カタログIDが不正です");
        }
        return createFromCatalog({
          catalogId: localCatalogId,
          catalogName: session.catalogName,
          description: session.description,
          transportType: session.transportType,
          command: session.command,
          args: session.args,
          url: session.url,
          credentialKeys: [],
          credentials,
          authType: "OAUTH",
        });
      },
      organization: () => {
        if (!session.managerCatalog) {
          throw new Error("Managerカタログ情報がありません");
        }
        return createFromManagerCatalog({
          catalogId: session.managerCatalog.catalogId,
          serverName: session.catalogName,
          description: session.description,
          status: session.managerCatalog.status,
          permissions: session.managerCatalog.permissions,
          connectionTemplate: session.managerCatalog.connectionTemplate,
          tools: session.managerCatalog.tools,
          credentials,
        });
      },
    });
  }

  return createCustomServer({
    serverName: session.catalogName,
    url: session.url,
    transportType:
      session.transportType === "STDIO"
        ? "STREAMABLE_HTTP"
        : session.transportType,
    authType: "OAUTH",
    credentials,
  });
};

/**
 * MCP OAuthマネージャーを作成
 */
export const createMcpOAuthManager = (): McpOAuthManager => {
  let currentSession: McpOAuthSession | null = null;
  let currentLoopback: LoopbackServer | null = null;

  const cleanupSession = async (): Promise<void> => {
    currentSession = null;
    if (currentLoopback) {
      const server = currentLoopback;
      currentLoopback = null;
      try {
        await server.close();
      } catch (error) {
        logger.warn("Failed to close loopback server", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  const getOrRegisterClient = async (
    serverUrl: string,
    redirectUri: string,
    fallbackClientId?: string,
    fallbackClientSecret?: string,
  ): Promise<OAuthClientBundle> => {
    const db = await getDb();

    const fromCache = await loadCachedOAuthClientBundle(db, serverUrl);
    if (fromCache) return fromCache;

    return discoverPersistAndBundle(
      db,
      serverUrl,
      redirectUri,
      fallbackClientId,
      fallbackClientSecret,
    );
  };

  const startAuthFlow = async (
    input: StartOAuthInput,
  ): Promise<OAuthResult> => {
    if (currentSession || currentLoopback) {
      logger.info(
        "Existing MCP OAuth session found, discarding and restarting",
      );
      await cleanupSession();
    }

    let loopback: LoopbackServer | null = null;
    try {
      // 1. ループバックサーバーを起動して redirect_uri を確定
      loopback = await startLoopbackServer();
      currentLoopback = loopback;
      const redirectUri = loopback.redirectUri;

      // 2. Discovery + DCR（または手動入力フォールバック）
      const { metadata, client } = await getOrRegisterClient(
        input.url,
        redirectUri,
        input.oauthClientId,
        input.oauthClientSecret,
      );

      // 3. PKCE / state / 認可URL生成
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = generateState();
      const scopes = metadata.scopes_supported ?? [];

      const authUrl = generateAuthorizationUrl(metadata, client, {
        redirectUri,
        scopes,
        state,
        codeChallenge,
      });

      const session: McpOAuthSession = {
        state,
        codeVerifier,
        serverUrl: input.url,
        managerCatalog: input.managerCatalog ?? null,
        catalogName: input.catalogName,
        description: input.description,
        transportType: input.transportType,
        command: input.command,
        args: input.args,
        url: input.url,
        oauthClientId: input.oauthClientId,
        oauthClientSecret: input.oauthClientSecret,
        redirectUri,
        createdAt: new Date(),
      };
      currentSession = session;

      // 4. ブラウザを開いて認証画面を表示
      await shell.openExternal(authUrl.toString());
      logger.info("MCP OAuth flow started, opened browser for authentication", {
        serverUrl: input.url,
        redirectUri,
      });

      // 5. ループバックでコールバックを受信（タイムアウト付き）
      const callbackUrl = await loopback.waitForCallback(
        AUTH_SESSION_TIMEOUT_MS,
      );

      // 6. state/code 検証 → トークン交換
      // クロージャの currentSession は cancelAuthFlow() で null 化される可能性があるため、
      // ローカルの session を直接検証する。cancelによる中断はloopbackのwaitForCallback
      // 側のreject経由で自然に伝播する。
      const { state: receivedState } = parseOAuthCallback(callbackUrl);
      validateCallbackSession(session, receivedState);

      const tokenData = await exchangeCodeForToken(
        metadata,
        client,
        new URL(callbackUrl),
        redirectUri,
        session.codeVerifier,
        session.state,
      );

      // 7. MCPサーバー登録
      const result = await finalizeMcpRegistration(session, tokenData);

      logger.info("MCP OAuth flow completed successfully", {
        serverUrl: session.serverUrl,
        serverId: result.serverId,
      });

      return result;
    } catch (error) {
      logger.error("MCP OAuth flow failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await cleanupSession();
    }
  };

  const cancelAuthFlow = (): void => {
    if (currentSession || currentLoopback) {
      logger.info("MCP OAuth flow cancelled");
      void cleanupSession();
    }
  };

  const getActiveSession = (): McpOAuthSession | null => currentSession;

  const findManualOAuthClient = async (
    serverUrl: string,
  ): Promise<ManualOAuthClient | null> => {
    const db = await getDb();
    return oauthRepository.findManualClientByServerUrl(db, serverUrl);
  };

  return {
    startAuthFlow,
    cancelAuthFlow,
    getActiveSession,
    findManualOAuthClient,
  };
};
