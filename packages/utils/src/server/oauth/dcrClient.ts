/**
 * Dynamic Client Registration (DCR) Client - Simplified with openid-client
 * openid-clientのdynamicClientRegistration機能を活用した簡潔な実装
 */

import * as client from "openid-client";

import { db } from "@tumiki/db/server";

import type { ClientCredentials } from "./types.js";

/**
 * openid-clientのdynamicClientRegistrationを使用したDCR実行
 */
export const performDynamicClientRegistration = async (
  issuerUrl: string,
  mcpServerId: string,
  redirectUri: string,
  initialAccessToken?: string,
): Promise<{
  clientId: string;
  clientSecret?: string;
  configuration: client.Configuration;
}> => {
  // クライアントメタデータ
  const metadata: Partial<client.ClientMetadata> = {
    redirect_uris: [redirectUri],
    client_name: "Tumiki MCP OAuth Client",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: "openid profile email",
    token_endpoint_auth_method: "client_secret_basic",
  };

  try {
    // openid-clientのdynamicClientRegistrationを使用
    const config = await client.dynamicClientRegistration(
      new URL(issuerUrl),
      metadata,
      undefined, // ClientAuth - will use default based on DCR response
      {
        initialAccessToken,
        timeout: 30,
        algorithm: "oidc",
      },
    );

    // Configuration オブジェクトから clientId と clientSecret を取得
    const serverMetadata = config.serverMetadata();
    // @ts-expect-error - openid-client v6 internal property
    const clientId = config.clientId as string;
    // @ts-expect-error - openid-client v6 internal property
    const clientSecret = config.clientSecret as string | undefined;

    // データベースに保存
    await saveClientToDatabase(
      mcpServerId,
      {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: [redirectUri],
        scope: typeof metadata.scope === "string" ? metadata.scope : undefined,
        grant_types: metadata.grant_types as string[],
        response_types: metadata.response_types as string[],
        token_endpoint_auth_method:
          metadata.token_endpoint_auth_method as string,
        client_name:
          typeof metadata.client_name === "string"
            ? metadata.client_name
            : undefined,
      },
      serverMetadata,
    );

    return {
      clientId,
      clientSecret,
      configuration: config,
    };
  } catch (error) {
    console.error("Dynamic Client Registration failed:", error);
    throw error;
  }
};

/**
 * 既存のクライアント設定からConfigurationを作成
 */
export const getExistingConfiguration = async (
  mcpServerId: string,
): Promise<client.Configuration | null> => {
  const oauthClient = await db.oAuthClient.findUnique({
    where: { mcpServerId },
  });

  if (!oauthClient) {
    return null;
  }

  try {
    // Discovery を使って Configuration を作成
    const config = await client.discovery(
      new URL(oauthClient.authorizationServerUrl),
      oauthClient.clientId,
      oauthClient.clientSecret ?? undefined,
    );

    return config;
  } catch (error) {
    console.error(
      "Failed to create configuration from existing client:",
      error,
    );
    return null;
  }
};

/**
 * WWW-Authenticateヘッダーを解析（簡略版）
 */
export const parseWWWAuthenticate = (
  header: string,
): Record<string, string> => {
  const result: Record<string, string> = {};
  const bearerMatch = /^Bearer\s+(.+)$/i.exec(header);

  if (!bearerMatch?.[1]) {
    return result;
  }

  const params = bearerMatch[1];
  const regex = /(\w+)=("[^"]+"|[^,\s]+)/g;
  let match;

  while ((match = regex.exec(params)) !== null) {
    const key = match[1];
    let value = match[2];

    if (key && value) {
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
  }

  return result;
};

/**
 * クライアント情報をデータベースに保存
 */
const saveClientToDatabase = async (
  mcpServerId: string,
  credentials: ClientCredentials,
  serverMetadata: client.ServerMetadata,
): Promise<void> => {
  try {
    const clientData = {
      mcpServerId,
      clientId: credentials.client_id,
      clientSecret: credentials.client_secret ?? undefined,
      authorizationServerUrl: serverMetadata.issuer,
      tokenEndpoint: serverMetadata.token_endpoint ?? "",
      authorizationEndpoint: serverMetadata.authorization_endpoint ?? "",
      registrationEndpoint: serverMetadata.registration_endpoint ?? "",
      jwksUri: serverMetadata.jwks_uri,
      revocationEndpoint: serverMetadata.revocation_endpoint,
      introspectionEndpoint: serverMetadata.introspection_endpoint,
      redirectUris: credentials.redirect_uris,
      scopes: credentials.scope?.split(" ") ?? [],
      grantTypes: credentials.grant_types ?? ["authorization_code"],
      responseTypes: credentials.response_types ?? ["code"],
      tokenEndpointAuthMethod:
        credentials.token_endpoint_auth_method ?? "client_secret_basic",
      applicationName: credentials.client_name,
      applicationUri: credentials.client_uri,
      logoUri: credentials.logo_uri,
    };

    // upsert操作で既存のクライアントがあれば更新、なければ作成
    await db.oAuthClient.upsert({
      where: { mcpServerId },
      update: clientData,
      create: clientData,
    });
  } catch (error) {
    console.error("Failed to save client to database:", error);
    throw error;
  }
};

/**
 * 既存のクライアント情報を取得
 */
export const getExistingClient = async (
  mcpServerId: string,
): Promise<ClientCredentials | null> => {
  try {
    const client = await db.oAuthClient.findUnique({
      where: { mcpServerId },
      select: {
        clientId: true,
        clientSecret: true,
        registrationAccessToken: true,
        registrationClientUri: true,
        redirectUris: true,
        scopes: true,
        grantTypes: true,
        responseTypes: true,
        tokenEndpointAuthMethod: true,
        applicationName: true,
        applicationUri: true,
        logoUri: true,
      },
    });

    if (!client) {
      return null;
    }

    return {
      client_id: client.clientId,
      client_secret: client.clientSecret ?? undefined,
      registration_access_token: client.registrationAccessToken ?? undefined,
      registration_client_uri: client.registrationClientUri ?? undefined,
      redirect_uris: client.redirectUris,
      scope: client.scopes.join(" "),
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      client_name: client.applicationName ?? undefined,
      client_uri: client.applicationUri ?? undefined,
      logo_uri: client.logoUri ?? undefined,
    };
  } catch (error) {
    console.error("Failed to get existing client:", error);
    return null;
  }
};
