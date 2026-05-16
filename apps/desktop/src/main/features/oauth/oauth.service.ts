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
import { encryptToken } from "../../utils/encryption";
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
import * as mcpRepository from "../mcp-server-list/mcp.repository";
import {
  createFromCatalog,
  createFromManagerCatalog,
  createCustomServer,
} from "../mcp-server-list/mcp.service";
import {
  fetchToolsForConnection,
  ToolFetchError,
} from "../mcp-proxy/mcp-proxy.service";
import type {
  McpOAuthSession,
  StartOAuthInput,
  OAuthResult,
  McpOAuthTokenData,
  ReauthenticateInput,
  ReauthenticateResult,
} from "./oauth.types";

/** 手動入力済みOAuthクライアント情報 */
export type ManualOAuthClient = {
  clientId: string;
  clientSecret: string | null;
};

/** MCP OAuthマネージャー型 */
export type McpOAuthManager = {
  startAuthFlow: (input: StartOAuthInput) => Promise<OAuthResult>;
  reauthenticateConnection: (
    input: ReauthenticateInput,
  ) => Promise<ReauthenticateResult>;
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

// キャッシュされたOAuthクライアント情報をロードする。
// 新規登録フロー（allowNonDcr=false）では DCR キャッシュのみ流用し、手動入力は再入力させる。
// 再認証フロー（allowNonDcr=true）では DB に保存された手動入力クライアントもそのまま再利用する。
const loadCachedOAuthClientBundle = async (
  db: Awaited<ReturnType<typeof getDb>>,
  serverUrl: string,
  allowNonDcr = false,
): Promise<OAuthClientBundle | null> => {
  const cached = await oauthRepository.findByServerUrl(db, serverUrl);
  if (!cached) return null;

  if (!cached.isDcr && !allowNonDcr) {
    logger.info("Skipping non-DCR cached client, requires manual input", {
      serverUrl,
    });
    return null;
  }

  const parsed: unknown = JSON.parse(cached.authServerMetadata);
  if (!isCacheableAuthorizationServerMetadata(parsed)) {
    logger.warn("Cached OAuth metadata is corrupted, re-discovering", {
      serverUrl,
    });
    await oauthRepository.deleteByServerUrl(db, serverUrl);
    return null;
  }

  logger.info("Reusing cached OAuth client", {
    serverUrl,
    isDcr: cached.isDcr,
  });

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

  // 既存コネクションの OAuth トークンを再取得して McpSecret.credentials を上書きする。
  // 新規登録フローと異なり McpServer/McpConnection は作成せず、共有 secret を更新するだけ。
  const reauthenticateConnection = async (
    input: ReauthenticateInput,
  ): Promise<ReauthenticateResult> => {
    if (currentSession || currentLoopback) {
      logger.info(
        "Existing MCP OAuth session found, discarding and restarting",
      );
      await cleanupSession();
    }

    const db = await getDb();
    const connection = await mcpRepository.findConnectionByIdWithServer(
      db,
      input.connectionId,
    );
    if (!connection) {
      throw new Error("対象のMCP接続が見つかりません");
    }
    if (connection.authType !== "OAUTH") {
      throw new Error("この接続はOAuth認証ではありません");
    }
    if (!connection.url) {
      throw new Error("OAuth認証にはサーバーURLが必要です");
    }

    const serverUrl = connection.url;
    const { secretId } = connection;

    let loopback: LoopbackServer | null = null;
    try {
      loopback = await startLoopbackServer();
      currentLoopback = loopback;
      const redirectUri = loopback.redirectUri;

      // 再認証ではキャッシュ済みクライアント（DCR・手動入力どちらも）を再利用する。
      // 新規登録時に保存した clientId/Secret が DB にあるため discovery/DCR をやり直す必要はない。
      const cachedBundle = await loadCachedOAuthClientBundle(
        db,
        serverUrl,
        true,
      );
      const bundle =
        cachedBundle ??
        (await discoverPersistAndBundle(db, serverUrl, redirectUri));
      const { metadata, client } = bundle;

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
        serverUrl,
        managerCatalog: null,
        catalogName: connection.name,
        description: "",
        transportType: connection.transportType,
        command: connection.command,
        args: connection.args,
        url: serverUrl,
        redirectUri,
        createdAt: new Date(),
      };
      currentSession = session;

      await shell.openExternal(authUrl.toString());
      logger.info("MCP OAuth reauthentication started", {
        connectionId: input.connectionId,
        serverUrl,
        redirectUri,
      });

      const callbackUrl = await loopback.waitForCallback(
        AUTH_SESSION_TIMEOUT_MS,
      );

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

      const credentials = credentialsPayloadFromTokenData(tokenData);
      const encrypted = await encryptToken(JSON.stringify(credentials));
      await oauthRepository.updateSecretCredentials(db, secretId, encrypted);

      // 取得した新トークンが実際に upstream で使えるかを tools/list で検証する。
      // OAuth フロー自体は成功していても、provider 側で aud/scope が不一致で
      // MCP エンドポイントが受け付けない場合がある（Figma 等で観測）。
      // 失敗時は needsReauth フラグを戻して UI に再認証が必要であることを示す。
      try {
        await fetchToolsForConnection(input.connectionId);
        logger.info("MCP OAuth reauthentication completed", {
          connectionId: input.connectionId,
          serverId: connection.serverId,
          serverUrl,
        });
      } catch (verifyError) {
        const detail =
          verifyError instanceof Error
            ? verifyError.message
            : String(verifyError);
        logger.error("MCP OAuth 再認証後の tools/list 検証に失敗", {
          connectionId: input.connectionId,
          serverUrl,
          error: detail,
        });
        // 検証失敗 → token は実質使えないので、フラグを再度立てる
        try {
          await oauthRepository.markSecretNeedsReauth(db, secretId);
        } catch (markError) {
          logger.error("needsReauth 復帰のフラグ更新に失敗", {
            secretId,
            error:
              markError instanceof Error
                ? markError.message
                : String(markError),
          });
        }
        const summary =
          verifyError instanceof ToolFetchError
            ? "新しいOAuthトークンでツール一覧の取得に失敗しました（プロバイダ側でトークンが受け付けられていません）"
            : `新しいOAuthトークンの検証に失敗しました: ${detail}`;
        throw new Error(summary);
      }

      return {
        connectionId: input.connectionId,
        serverId: connection.serverId,
        serverName: connection.server.name,
        connectionName: connection.name,
      };
    } catch (error) {
      logger.error("MCP OAuth reauthentication failed", {
        connectionId: input.connectionId,
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
    reauthenticateConnection,
    cancelAuthFlow,
    getActiveSession,
    findManualOAuthClient,
  };
};
