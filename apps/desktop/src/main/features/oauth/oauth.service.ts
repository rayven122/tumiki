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
import {
  discoverOAuthMetadata,
  DiscoveryError,
  DISCOVERY_ERROR_CODE,
} from "./oauth.discovery";
import { performDCR, MCP_OAUTH_REDIRECT_URI } from "./oauth.dcr";
import { generateAuthorizationUrl } from "./oauth.auth-url";
import { exchangeCodeForToken } from "./oauth.token";
import { parseOAuthCallback } from "./oauth.protocol";
import * as oauthRepository from "./oauth.repository";
import {
  createFromCatalog,
  createCustomServer,
} from "../mcp-server-list/mcp.service";
import type {
  McpOAuthSession,
  StartOAuthInput,
  OAuthResult,
  McpOAuthTokenData,
} from "./oauth.types";

/** MCP OAuthマネージャー型 */
export type McpOAuthManager = {
  startAuthFlow: (input: StartOAuthInput) => Promise<void>;
  handleCallback: (url: string) => Promise<OAuthResult>;
  cancelAuthFlow: () => void;
  getActiveSession: () => McpOAuthSession | null;
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
};

const resolveClientCredentials = async (
  metadata: oauth.AuthorizationServer,
  serverUrl: string,
  fallbackClientId?: string,
  fallbackClientSecret?: string,
): Promise<ClientCredentials> => {
  if (metadata.registration_endpoint) {
    logger.info("Performing DCR", { serverUrl });
    const { registration } = await performDCR(metadata);
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
  fallbackClientId?: string,
  fallbackClientSecret?: string,
): Promise<OAuthClientBundle> => {
  logger.info("DCR cache miss, performing discovery", { serverUrl });
  const metadata = await discoverOAuthMetadata(serverUrl);

  const { clientId, clientSecret, tokenEndpointAuthMethod } =
    await resolveClientCredentials(
      metadata,
      serverUrl,
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

/**
 * MCP OAuthマネージャーを作成
 */
export const createMcpOAuthManager = (): McpOAuthManager => {
  let currentSession: McpOAuthSession | null = null;

  const getOrRegisterClient = async (
    serverUrl: string,
    fallbackClientId?: string,
    fallbackClientSecret?: string,
  ): Promise<OAuthClientBundle> => {
    const db = await getDb();

    const fromCache = await loadCachedOAuthClientBundle(db, serverUrl);
    if (fromCache) return fromCache;

    return discoverPersistAndBundle(
      db,
      serverUrl,
      fallbackClientId,
      fallbackClientSecret,
    );
  };

  const startAuthFlow = async (input: StartOAuthInput): Promise<void> => {
    if (currentSession) {
      logger.info(
        "Existing MCP OAuth session found, discarding and restarting",
      );
      currentSession = null;
    }

    try {
      const { metadata, client } = await getOrRegisterClient(
        input.url,
        input.oauthClientId,
        input.oauthClientSecret,
      );

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = generateState();
      const scopes = metadata.scopes_supported ?? [];

      const authUrl = generateAuthorizationUrl(metadata, client, {
        redirectUri: MCP_OAUTH_REDIRECT_URI,
        scopes,
        state,
        codeChallenge,
      });

      currentSession = {
        state,
        codeVerifier,
        serverUrl: input.url,
        catalogId: input.catalogId ?? null,
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

  const handleCallback = async (url: string): Promise<OAuthResult> => {
    try {
      const { state } = parseOAuthCallback(url);
      const session = validateCallbackSession(currentSession, state);
      currentSession = null;

      const { metadata, client } = await getOrRegisterClient(
        session.serverUrl,
        session.oauthClientId,
        session.oauthClientSecret,
      );

      const tokenData = await exchangeCodeForToken(
        metadata,
        client,
        new URL(url),
        MCP_OAUTH_REDIRECT_URI,
        session.codeVerifier,
        session.state,
      );

      const credentials = credentialsPayloadFromTokenData(tokenData);

      // カタログ参照ありの場合は既存フロー、なしの場合はカスタムサーバーとして登録
      const result = session.catalogId
        ? await createFromCatalog({
            catalogId: session.catalogId,
            catalogName: session.catalogName,
            description: session.description,
            transportType: session.transportType,
            command: session.command,
            args: session.args,
            url: session.url,
            credentialKeys: [],
            credentials,
            authType: "OAUTH",
          })
        : await createCustomServer({
            serverName: session.catalogName,
            url: session.url,
            transportType:
              session.transportType === "STDIO"
                ? "STREAMABLE_HTTP"
                : session.transportType,
            authType: "OAUTH",
            credentials,
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

  const cancelAuthFlow = (): void => {
    if (currentSession) {
      currentSession = null;
      logger.info("MCP OAuth flow cancelled");
    }
  };

  const getActiveSession = (): McpOAuthSession | null => currentSession;

  return { startAuthFlow, handleCallback, cancelAuthFlow, getActiveSession };
};
